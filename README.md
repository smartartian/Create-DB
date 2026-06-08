# Create DB

一款专业的数据库表结构设计工具，支持可视化 ER 图建模、SQL 生成、数据字典导出等功能。同时支持 MySQL 和 DM（达梦）两种数据库。

![Create DB 运行效果](public/page.png)

## 功能特性

### 核心功能
- **表结构设计**：创建、修改、删除表，定义字段名称、数据类型、长度、约束条件（主键、外键、唯一键、非空、默认值等）
- **关系建模**：可视化展示表间关系（一对一、一对多、多对多），支持拖拽式关系创建与修改
- **SQL 生成**：自动生成 DDL 语句，支持正向工程（从模型生成 SQL）
- **数据库支持**：兼容 MySQL 5.7+/8.0+ 和 DM（达梦）7+/8+

### 数据类型支持
- 全面支持 MySQL 和 DM 数据库的原生数据类型
- 提供数据类型映射功能，支持在不同数据库类型间转换时的数据类型自动适配
- 允许自定义数据类型及类型模板

### 导入导出功能
- 支持导入 SQL 脚本文件生成数据模型
- 支持导出 SQL 脚本（完整 DDL）
- 支持导出为标准模型文件格式（JSON）
- 支持导出为可视化文档（HTML 格式的数据字典）

### 文件夹层级管理
- 支持创建文件夹存放表，最多三级嵌套
- 支持拖拽移动表/文件夹
- 支持文件夹展开/折叠、重命名

### 用户界面与交互设计
- 采用直观的可视化拖拽式操作界面
- 提供多视图展示：ER 图视图、表结构详情视图、SQL 预览视图
- 支持自定义界面布局和主题
- 提供快捷键操作支持，提升操作效率
- 实现智能提示和自动补全功能

### 性能要求
- 支持大型数据模型（至少 100+ 表）的流畅操作
- 模型加载和保存时间不超过 3 秒
- SQL 生成和执行预览响应时间不超过 2 秒

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **状态管理**：Zustand
- **桌面端**：Go 1.23 + embed 静态文件嵌入
- **构建工具**：Vite + Go

## 三版本支持

| 版本 | 启动方式 | 适用场景 |
|------|----------|----------|
| **Web 网页版** | `npm run dev` / 部署到服务器 | 在线使用、团队协作 |
| **桌面版 (Go)** | 双击可执行文件 | 本地离线使用、无需安装依赖 |
| **DMG 安装包** | 双击 DMG 拖拽安装 | macOS 原生应用体验 |

## 快速开始

### Web 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建 Web 版本

```bash
npm run build
```

### 构建桌面版本

```bash
# 构建所有平台
./desktop/build.sh

# 仅构建 macOS DMG
./desktop/build-mac-dmg.sh
```

## 打包产物

### macOS
- `CreateDB-macOS.dmg` - macOS 安装包（支持 Apple Silicon + Intel）
- `DBDesignerPro-macOS-arm64` - Apple Silicon 可执行文件
- `DBDesignerPro-macOS-amd64` - Intel 可执行文件

### Windows
- `DBDesignerPro-Windows-amd64.exe` - Windows 可执行文件

### Linux
- `DBDesignerPro-Linux-amd64` - Linux 可执行文件

## 使用说明

### 创建表
1. 点击工具栏 "新建" 按钮或右键画布
2. 在右侧面板编辑表名、字段、索引等信息
3. 拖拽表节点调整位置

### 创建关系
1. 点击工具栏 "关系" 按钮
2. 选择源表和目标表
3. 选择关系类型（1:1 / 1:N / N:M）

### 导出 SQL
1. 点击工具栏 "导出" 按钮
2. 选择 "导出 SQL 脚本"
3. 选择保存位置

### 切换数据库类型
1. 点击工具栏数据库类型下拉框
2. 选择 MySQL 或 DM（达梦）
3. 数据类型会自动映射

## 项目结构

```
.
├── desktop/              # Go 桌面端代码
│   ├── main.go          # 主程序入口
│   ├── build.sh         # 全平台构建脚本
│   └── build-mac-dmg.sh # macOS DMG 构建脚本
├── public/              # 静态资源
│   ├── sql-logo.png     # 应用图标
│   └── page.png         # 程序运行效果图
├── release/             # 构建输出目录
├── src/                 # 前端源代码
│   ├── components/      # React 组件
│   ├── store/           # Zustand 状态管理
│   ├── sql-generator/   # SQL 生成器
│   ├── file-manager/    # 文件管理
│   └── types/           # TypeScript 类型定义
└── ...
```

## 兼容性

- **操作系统**：macOS 10.15+、Windows 10/11（64位）、主流 Linux 发行版
- **浏览器**：Chrome 90+、Firefox 88+、Edge 90+
- **数据库**：MySQL 5.7+、8.0+；DM 7+、8+

## 开发计划

- [x] 核心表结构设计功能
- [x] ER 图可视化
- [x] SQL 生成与导出
- [x] 数据字典导出
- [x] 文件夹层级管理
- [x] MySQL / DM 双数据库支持
- [x] 本地存储与自动保存
- [x] 撤销/重做功能
- [x] 多平台桌面版打包
- [x] macOS DMG 安装包
- [ ] 数据库逆向工程（从现有数据库导入结构）
- [ ] 增量 DDL 生成
- [ ] 数据库设计规范检查
- [ ] 性能优化建议
- [ ] 插件扩展机制

## 许可证

MIT License

## 作者

smartartian
