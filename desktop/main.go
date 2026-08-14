package main

import (
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed dist
var distFS embed.FS

// 全局数据库连接（导入数据库文件后重开，供所有 handler 使用）
var gDB *sql.DB

type modelRecord struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	UpdatedAt int64           `json:"updatedAt"`
	Data      json.RawMessage `json:"data,omitempty"`
}

type apiError struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// 数据目录与文件名（与软件名 Create DB 保持一致）
func dbPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	dir := filepath.Join(home, ".dbdesigner")
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Printf("创建数据目录失败: %v", err)
	}
	return filepath.Join(dir, "CreateDB.db")
}

// 迁移旧版本数据库文件（dbdesigner.db -> CreateDB.db）
func migrateOldDB() {
	oldPath := filepath.Join(filepath.Dir(dbPath()), "dbdesigner.db")
	newPath := dbPath()
	if _, err := os.Stat(newPath); err == nil {
		return // 新文件已存在，无需迁移
	}
	if data, err := os.ReadFile(oldPath); err == nil {
		if err := os.WriteFile(newPath, data, 0644); err == nil {
			fmt.Println("已迁移旧数据库:", oldPath, "->", newPath)
		}
	}
}

func openDB() (*sql.DB, error) {
	migrateOldDB()
	db, err := sql.Open("sqlite", dbPath())
	if err != nil {
		return nil, err
	}
	gDB = db
	// SQLite 同一时刻只有一个写者，限制连接数避免锁冲突
	db.SetMaxOpenConns(1)
	schema := `
CREATE TABLE IF NOT EXISTS models (
    id         TEXT PRIMARY KEY,
    name       TEXT UNIQUE NOT NULL,
    data       TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);`
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func newMux(tmpDir string) *http.ServeMux {
	mux := http.NewServeMux()

	// 后端探测：前端据此选择 SQLite API 或 localStorage 兜底
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"ok": true, "storage": "sqlite"})
	})

	// 最近模型列表
	mux.HandleFunc("GET /api/models", func(w http.ResponseWriter, r *http.Request) {
		rows, err := gDB.Query(`SELECT id, name, updated_at FROM models ORDER BY updated_at DESC`)
		if err != nil {
			writeJSON(w, 500, apiError{Error: err.Error()})
			return
		}
		defer rows.Close()
		list := []modelRecord{}
		for rows.Next() {
			var rec modelRecord
			if err := rows.Scan(&rec.ID, &rec.Name, &rec.UpdatedAt); err != nil {
				writeJSON(w, 500, apiError{Error: err.Error()})
				return
			}
			list = append(list, rec)
		}
		writeJSON(w, 200, list)
	})

	// 保存/更新模型（upsert），并记录为当前模型
	mux.HandleFunc("POST /api/models", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Name string          `json:"name"`
			Data json.RawMessage `json:"data"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || len(req.Data) == 0 {
			writeJSON(w, 400, apiError{Error: "无效的请求体，需要 name 和 data"})
			return
		}
		now := time.Now().UnixMilli()
		id := fmt.Sprintf("model_%d", now)
		_, err := gDB.Exec(`
INSERT INTO models (id, name, data, updated_at) VALUES (?, ?, ?, ?)
ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
			id, req.Name, string(req.Data), now)
		if err != nil {
			writeJSON(w, 500, apiError{Error: err.Error()})
			return
		}
		if _, err := gDB.Exec(`INSERT INTO meta (key, value) VALUES ('current_model', ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value`, req.Name); err != nil {
			writeJSON(w, 500, apiError{Error: err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "name": req.Name})
	})

	// 加载单个模型
	mux.HandleFunc("GET /api/models/{name}", func(w http.ResponseWriter, r *http.Request) {
		name := r.PathValue("name")
		var rec modelRecord
		var data string
		err := gDB.QueryRow(`SELECT id, name, updated_at, data FROM models WHERE name = ?`, name).
			Scan(&rec.ID, &rec.Name, &rec.UpdatedAt, &data)
		if err == sql.ErrNoRows {
			writeJSON(w, 404, apiError{Error: "模型不存在"})
			return
		}
		if err != nil {
			writeJSON(w, 500, apiError{Error: err.Error()})
			return
		}
		rec.Data = json.RawMessage(data)
		writeJSON(w, 200, rec)
	})

	// 删除模型
	mux.HandleFunc("DELETE /api/models/{name}", func(w http.ResponseWriter, r *http.Request) {
		name := r.PathValue("name")
		if _, err := gDB.Exec(`DELETE FROM models WHERE name = ?`, name); err != nil {
			writeJSON(w, 500, apiError{Error: err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true})
	})

	// 当前（上次打开）模型名
	mux.HandleFunc("GET /api/current", func(w http.ResponseWriter, r *http.Request) {
		var name string
		err := gDB.QueryRow(`SELECT value FROM meta WHERE key = 'current_model'`).Scan(&name)
		if err == sql.ErrNoRows {
			writeJSON(w, 200, map[string]any{"name": nil})
			return
		}
		if err != nil {
			writeJSON(w, 500, apiError{Error: err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"name": name})
	})

	// 导出本地数据库文件（平台实现：保存对话框）
	mux.HandleFunc("POST /api/db/export", func(w http.ResponseWriter, r *http.Request) {
		if err := exportDBToFile(); err != nil {
			writeJSON(w, 500, apiError{Error: err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true})
	})

	// 导入本地数据库文件（平台实现：选择对话框 + 校验替换）
	mux.HandleFunc("POST /api/db/import", func(w http.ResponseWriter, r *http.Request) {
		path, err := pickImportFile()
		if err != nil {
			writeJSON(w, 500, apiError{Error: err.Error()})
			return
		}
		if path == "" {
			writeJSON(w, 200, map[string]any{"ok": true, "cancelled": true})
			return
		}
		if err := importDBFromFile(path); err != nil {
			writeJSON(w, 500, apiError{Error: err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true})
	})

	// 静态资源（前端）
	mux.Handle("/", http.FileServer(http.Dir(tmpDir)))
	return mux
}

// 提取嵌入的静态文件到临时目录，返回临时目录路径
func extractDist() (string, error) {
	tmpDir, err := os.MkdirTemp("", "createdb-*")
	if err != nil {
		return "", err
	}
	embeddedFS, err := fs.Sub(distFS, "dist")
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", err
	}
	err = fs.WalkDir(embeddedFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		targetPath := tmpDir + "/" + path
		if d.IsDir() {
			return os.MkdirAll(targetPath, 0755)
		}
		data, err := fs.ReadFile(embeddedFS, path)
		if err != nil {
			return err
		}
		return os.WriteFile(targetPath, data, 0644)
	})
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", err
	}
	return tmpDir, nil
}

// 启动本地 HTTP 服务，返回访问 URL 和关闭函数
func startServer(tmpDir string) (string, func()) {
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		fmt.Println("启动服务器失败:", err)
		os.Exit(1)
	}
	actualPort := listener.Addr().(*net.TCPAddr).Port
	server := &http.Server{
		Handler: newMux(tmpDir),
	}
	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			fmt.Println("服务器错误:", err)
		}
	}()
	url := fmt.Sprintf("http://localhost:%d", actualPort)
	return url, func() { server.Close() }
}

// ---- 数据库文件导出/导入 ----
// 平台实现（main_mac.go / main_web.go）：
//   pickExportPath(defaultName) (string, error)  导出保存路径
//   pickImportFile() (string, error)             导入选择路径

// 复制文件
func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0644)
}

// 导出数据库到用户选择的位置
func exportDBToFile() error {
	target, err := pickExportPath("CreateDB.db")
	if err != nil {
		return err
	}
	if target == "" {
		return nil // 用户取消
	}
	return copyFile(dbPath(), target)
}

// 导入数据库文件：校验 SQLite 格式 -> 备份当前 -> 替换 -> 重开连接
func importDBFromFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("无法打开文件: %v", err)
	}
	header := make([]byte, 16)
	n, _ := f.Read(header)
	f.Close()
	if n < 16 || string(header) != "SQLite format 3\x00" {
		return fmt.Errorf("不是有效的 SQLite 数据库文件")
	}

	// 备份当前数据库
	backup := dbPath() + ".bak"
	if err := copyFile(dbPath(), backup); err != nil {
		return fmt.Errorf("备份当前数据库失败: %v", err)
	}
	// 替换为新文件
	if err := copyFile(path, dbPath()); err != nil {
		return fmt.Errorf("写入数据库文件失败: %v", err)
	}
	// 重开连接（旧连接指向已替换的旧文件）
	if gDB != nil {
		gDB.Close()
	}
	if _, err := openDB(); err != nil {
		return fmt.Errorf("重载数据库失败: %v", err)
	}
	fmt.Println("已导入数据库文件:", path)
	return nil
}
