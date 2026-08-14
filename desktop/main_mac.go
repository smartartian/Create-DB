//go:build darwin && cgo

package main

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework Cocoa -framework WebKit
#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#include <stdlib.h>
#include <pthread.h>
#include <stdio.h>

static NSString *gUrl;
static NSWindow *gWindow;
static WKWebView *gWebView;

// 检查当前是否在进程主线程（AppKit 要求）
static int isMainThread(void) { return pthread_main_np(); }

// 保存对话框：返回选择路径（调用方 free），取消返回 NULL
static char *macSavePanel(const char *defaultName) {
    NSSavePanel *panel = [NSSavePanel savePanel];
    [panel setNameFieldStringValue:[NSString stringWithUTF8String:defaultName]];
    [panel setAllowedFileTypes:@[@"db"]];
    if ([panel runModal] == NSModalResponseOK) {
        NSString *path = [[panel URL] path];
        return strdup([path UTF8String]);
    }
    return NULL;
}

// 打开对话框：返回选择路径（调用方 free），取消返回 NULL
static char *macOpenPanel(void) {
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    [panel setAllowedFileTypes:@[@"db", @"sqlite", @"sqlite3"]];
    [panel setAllowsMultipleSelection:NO];
    [panel setMessage:@"选择要导入的数据库文件"];
    if ([panel runModal] == NSModalResponseOK) {
        NSURL *url = [[panel URLs] firstObject];
        return strdup([url.path UTF8String]);
    }
    return NULL;
}

// 应用代理 + 窗口代理：
// - 点击窗口关闭按钮 = 隐藏窗口，进程后台驻留（不退出）
// - Dock 图标点击恢复窗口
// - Cmd+Q / Dock 退出才是真正退出
@interface DBCreateAppDelegate : NSObject <NSApplicationDelegate, NSWindowDelegate>
@end

@implementation DBCreateAppDelegate
- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    [NSApp activateIgnoringOtherApps:YES];
    // 创建原生窗口并加载本地页面
    NSRect frame = NSMakeRect(0, 0, 1280, 800);
    gWindow = [[NSWindow alloc] initWithContentRect:frame
                                          styleMask:(NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable)
                                            backing:NSBackingStoreBuffered
                                              defer:NO];
    [gWindow setTitle:@"Create DB"];
    [gWindow setDelegate:self];
    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    gWebView = [[WKWebView alloc] initWithFrame:frame configuration:config];
    [gWebView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:gUrl]]];
    [gWindow setContentView:gWebView];
    [gWindow center];
    [gWindow makeKeyAndOrderFront:nil];
}
// 窗口关闭按钮：隐藏到后台，不退出
- (BOOL)windowShouldClose:(id)sender {
    [gWindow orderOut:nil];
    return NO;
}
- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return NO;
}
// Dock 图标点击：恢复窗口
- (BOOL)applicationShouldHandleReopen:(NSApplication *)sender hasVisibleWindows:(BOOL)flag {
    if (gWindow) {
        [gWindow makeKeyAndOrderFront:nil];
    }
    return YES;
}
- (NSApplicationTerminateReply)applicationShouldTerminate:(NSApplication *)sender {
    return NSTerminateNow;
}
@end

// 运行 AppKit 主循环（阻塞），创建原生窗口并保持进程常驻。
// 注意：AppKit 的 setMainMenu 等操作必须在主线程执行。
// Dock 图标由 app bundle 的 AppIcon.icns 提供（macOS 自动圆角遮罩）。
static void runAppKit(const char *url) {
    gUrl = [NSString stringWithUTF8String:url];
    [NSApplication sharedApplication];
    DBCreateAppDelegate *delegate = [[DBCreateAppDelegate alloc] init];
    [NSApp setDelegate:delegate];
    // 主菜单：确保 Cmd+Q 退出可用
    NSMenu *mainMenu = [[NSMenu alloc] init];
    NSMenuItem *appMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:appMenuItem];
    NSMenu *appMenu = [[NSMenu alloc] init];
    [appMenu addItemWithTitle:@"退出 Create DB" action:@selector(terminate:) keyEquivalent:@"q"];
    [appMenuItem setSubmenu:appMenu];
    [NSApp setMainMenu:mainMenu];
    [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
    [NSApp run];
}
*/
import "C"

import (
	"fmt"
	"os"
	"runtime"
	"unsafe"
)

// macOS 原生版：WKWebView 原生窗口 + Dock 图标的常驻应用。
// 点击窗口关闭按钮 = 隐藏窗口后台驻留；点击 Dock 图标恢复窗口；
// Cmd+Q 或 Dock 退出才是真正退出。
// Dock 图标由 app bundle 的 AppIcon.icns 提供（系统自动圆角遮罩）。
func main() {
	// 将 main goroutine 锁定到启动它的 OS 线程（即进程主线程），
	// 确保 AppKit 操作（setMainMenu 等）在正确的主线程执行
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	fmt.Println("主线程检查: isMainThread =", C.isMainThread() != 0)

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

	cs := C.CString(url)
	defer C.free(unsafe.Pointer(cs))
	C.runAppKit(cs)
	fmt.Println("Create DB 已退出")
}

// macOS 平台实现：保存对话框选择导出路径
func pickExportPath(defaultName string) (string, error) {
	cs := C.CString(defaultName)
	defer C.free(unsafe.Pointer(cs))
	path := C.macSavePanel(cs)
	if path == nil {
		return "", nil // 用户取消
	}
	defer C.free(unsafe.Pointer(path))
	return C.GoString(path), nil
}

// macOS 平台实现：打开对话框选择导入文件
func pickImportFile() (string, error) {
	path := C.macOpenPanel()
	if path == nil {
		return "", nil // 用户取消
	}
	defer C.free(unsafe.Pointer(path))
	return C.GoString(path), nil
}
