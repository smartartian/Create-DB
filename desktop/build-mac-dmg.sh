#!/bin/bash
set -e

APP_NAME="Create DB"
APP_BUNDLE="Create DB.app"
DMG_NAME="CreateDB-macOS"
VERSION="1.0.0"

echo "=== Create DB macOS DMG 打包脚本 ==="

# 1. 构建前端
echo "[1/5] 构建前端..."
cd "$(dirname "$0")/.."
npm run build

# 2. 复制前端构建产物到 desktop/dist
echo "[2/5] 复制构建产物..."
rm -rf desktop/dist
cp -r dist desktop/dist

# 3. 构建 macOS 可执行文件 (ARM64 + AMD64 通用二进制)
echo "[3/5] 构建 macOS 通用二进制..."
cd desktop

# 构建 ARM64
GOOS=darwin GOARCH=arm64 go build -o ../release/CreateDB-arm64 main.go

# 构建 AMD64
GOOS=darwin GOARCH=amd64 go build -o ../release/CreateDB-amd64 main.go

# 合并为通用二进制
lipo -create -output ../release/"Create DB" ../release/CreateDB-arm64 ../release/CreateDB-amd64
rm ../release/CreateDB-arm64 ../release/CreateDB-amd64

echo "  -> 通用二进制构建完成"

# 4. 创建 App Bundle
echo "[4/5] 创建 App Bundle..."
cd ..

# 创建目录结构
rm -rf "release/${APP_BUNDLE}"
mkdir -p "release/${APP_BUNDLE}/Contents/MacOS"
mkdir -p "release/${APP_BUNDLE}/Contents/Resources"

# 复制可执行文件
cp "release/Create DB" "release/${APP_BUNDLE}/Contents/MacOS/"

# 创建 Info.plist
cat > "release/${APP_BUNDLE}/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>zh_CN</string>
    <key>CFBundleDisplayName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleExecutable</key>
    <string>Create DB</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.smartartian.createdb</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

# 转换图标 (需要 sips 和 iconutil)
if [ -f "public/sql-logo.png" ]; then
    echo "  -> 生成应用图标..."
    mkdir -p release/icon.iconset
    sips -z 16 16 public/sql-logo.png --out release/icon.iconset/icon_16x16.png
    sips -z 32 32 public/sql-logo.png --out release/icon.iconset/icon_16x16@2x.png
    sips -z 32 32 public/sql-logo.png --out release/icon.iconset/icon_32x32.png
    sips -z 64 64 public/sql-logo.png --out release/icon.iconset/icon_32x32@2x.png
    sips -z 128 128 public/sql-logo.png --out release/icon.iconset/icon_128x128.png
    sips -z 256 256 public/sql-logo.png --out release/icon.iconset/icon_128x128@2x.png
    sips -z 256 256 public/sql-logo.png --out release/icon.iconset/icon_256x256.png
    sips -z 512 512 public/sql-logo.png --out release/icon.iconset/icon_256x256@2x.png
    sips -z 512 512 public/sql-logo.png --out release/icon.iconset/icon_512x512.png
    sips -z 1024 1024 public/sql-logo.png --out release/icon.iconset/icon_512x512@2x.png
    iconutil -c icns release/icon.iconset -o "release/${APP_BUNDLE}/Contents/Resources/AppIcon.icns"
    rm -rf release/icon.iconset
fi

# 签名应用 (ad-hoc 签名)
echo "  -> 签名应用..."
codesign --force --deep --sign - "release/${APP_BUNDLE}"

# 5. 创建 DMG
echo "[5/5] 创建 DMG 文件..."

# 清理旧 DMG
rm -f "release/${DMG_NAME}.dmg"

# 使用 create-dmg
create-dmg \
    --volname "${APP_NAME}" \
    --volicon "release/${APP_BUNDLE}/Contents/Resources/AppIcon.icns" \
    --window-pos 200 120 \
    --window-size 600 400 \
    --icon-size 100 \
    --icon "${APP_BUNDLE}" 175 120 \
    --hide-extension "${APP_BUNDLE}" \
    --app-drop-link 425 120 \
    "release/${DMG_NAME}.dmg" \
    "release/${APP_BUNDLE}"

# 清理
rm -rf "release/${APP_BUNDLE}"
rm -f "release/Create DB"

echo ""
echo "=== 打包完成！==="
echo "输出文件: release/${DMG_NAME}.dmg"
ls -lh "release/${DMG_NAME}.dmg"
