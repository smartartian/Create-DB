//go:build !darwin || !cgo

package main

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
)

// 纯 Go 兜底入口（非 macOS，或 macOS 上禁用 CGO 时）：
// 启动本地服务并打开系统浏览器，等待输入退出。
func main() {
	tmpDir, err := extractDist()
	if err != nil {
		fmt.Println("解压文件失败:", err)
		os.Exit(1)
	}
	defer os.RemoveAll(tmpDir)

	db, err := openDB()
	if err != nil {
		fmt.Println("SQLite 初始化失败:", err)
		os.Exit(1)
	}
	defer db.Close()
	fmt.Println("数据文件:", dbPath())

	url, _ := startServer(tmpDir)
	fmt.Println("Create DB 启动中...")
	fmt.Println("访问地址:", url)

	openBrowser(url)

	fmt.Println("按 Enter 键退出...")
	fmt.Scanln()
}

// 非 macOS 原生版不支持原生文件对话框
func pickExportPath(defaultName string) (string, error) {
	return "", fmt.Errorf("仅桌面原生版支持导出数据库文件")
}

func pickImportFile() (string, error) {
	return "", fmt.Errorf("仅桌面原生版支持导入数据库文件")
}

func openBrowser(url string) {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "darwin":
		cmd = "open"
		args = []string{url}
	case "windows":
		cmd = "rundll32"
		args = []string{"url.dll,FileProtocolHandler", url}
	default:
		cmd = "xdg-open"
		args = []string{url}
	}

	exec.Command(cmd, args...).Start()
}
