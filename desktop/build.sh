#!/bin/bash
set -e

echo "=== DBDesigner Pro 桌面版构建脚本 ==="

# 1. 构建前端
echo "[1/4] 构建前端..."
cd "$(dirname "$0")/.."
npm run build

# 2. 复制前端构建产物到 desktop/dist
echo "[2/4] 复制构建产物..."
rm -rf desktop/dist
cp -r dist desktop/dist
# 复制图标到 release 目录
cp public/sql-logo.png release/sql-logo.png

# 3. 构建 Go 程序
echo "[3/4] 构建 Go 程序..."
cd desktop

# macOS ARM64 (Apple Silicon) - 原生版 (CGO + AppKit: Dock 图标、后台驻留、Cmd+Q 退出)
echo "  -> 构建 macOS ARM64 (原生)..."
CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 go build -o ../release/DBDesignerPro-macOS-arm64 .

# macOS AMD64 (Intel) - 纯 Go 兜底（CGO 交叉编译受限时使用）
echo "  -> 构建 macOS AMD64 (兜底)..."
CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -o ../release/DBDesignerPro-macOS-amd64 .

# Windows AMD64
echo "  -> 构建 Windows AMD64..."
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o ../release/DBDesignerPro-Windows-amd64.exe .

# Linux AMD64
echo "  -> 构建 Linux AMD64..."
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ../release/DBDesignerPro-Linux-amd64 .

echo "[4/4] 构建完成！"
echo ""
echo "输出文件:"
ls -lh ../release/
