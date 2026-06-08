package main

import (
	"embed"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
)

//go:embed dist
var distFS embed.FS

func main() {
	// 提取嵌入的静态文件到临时目录
	tmpDir, err := os.MkdirTemp("", "createdb-*")
	if err != nil {
		fmt.Println("创建临时目录失败:", err)
		os.Exit(1)
	}
	defer os.RemoveAll(tmpDir)

	// 将嵌入的文件系统解压到临时目录
	embeddedFS, err := fs.Sub(distFS, "dist")
	if err != nil {
		fmt.Println("读取嵌入文件失败:", err)
		os.Exit(1)
	}

	// 递归解压文件
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
		fmt.Println("解压文件失败:", err)
		os.Exit(1)
	}

	// 启动 HTTP 服务器
	port := "0"
	server := &http.Server{
		Addr:    ":" + port,
		Handler: http.FileServer(http.Dir(tmpDir)),
	}

	// 获取实际端口
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		fmt.Println("启动服务器失败:", err)
		os.Exit(1)
	}
	actualPort := listener.Addr().(*net.TCPAddr).Port

	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			fmt.Println("服务器错误:", err)
		}
	}()

	url := fmt.Sprintf("http://localhost:%d", actualPort)
	fmt.Println("Create DB 启动中...")
	fmt.Println("访问地址:", url)

	// 打开浏览器
	openBrowser(url)

	// 等待用户输入以关闭
	fmt.Println("按 Enter 键退出...")
	fmt.Scanln()
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
