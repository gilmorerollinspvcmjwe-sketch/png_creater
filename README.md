# 游戏 UI 素材工具

一个基于浏览器的游戏 UI 素材处理工具，支持自动抠图、素材拆分、批量处理等功能，纯前端运行无需后端服务。

## 功能特性

### 1. 单图抠图
- **多种背景模式**：
  - 自动检测背景色
  - 白底抠图
  - 纯色底抠图（手动取色）
  - 棋盘格抠图
  - 保留透明通道
  - 异形抠图（复杂背景精确处理）
- **参数调节**：
  - 容差：背景色识别范围
  - 去边强度：去除边缘背景残留
  - 膨胀/腐蚀：调整素材边缘大小
  - 边缘平滑：抗锯齿处理，让边缘更柔和
- **素材识别**：
  - 合并距离：控制碎片合并阈值
  - 最小面积：过滤噪点和小碎块
  - 安全边距：防止边缘像素被裁剪
  - **去重检测**：自动合并相似素材（基于边界框重叠）
- **导出选项**：
  - 输出格式：PNG / WebP
  - 裁剪透明边缘
  - TexturePacker JSON (Hash/Array) 格式
  - CSS Sprite 格式

### 2. 批量抠图
- 上传多张素材图
- 自动去背景 + 拆分素材
- 进度显示
- 一键打包下载 ZIP

### 3. 拆分模式
- 手动拖拽选框
- 自动网格生成
- 异形检测
- 内轮廓抠图
- ZIP 打包下载

### 4. 合并模式
- 多图合并为素材板
- 自定义列数、间距
- 统一单元格尺寸
- 背景色设置

## 技术栈

- **前端框架**：原生 JavaScript (ES Modules)
- **构建工具**：Vite
- **图像处理**：Web Worker（多线程处理）
- **压缩打包**：JSZip
- **样式**：原生 CSS

## 项目结构

```
.
├── index.html              # 主页面
├── package.json
├── vite.config.js
├── src/
│   ├── main.js             # 应用入口
│   ├── styles/             # 样式文件
│   │   ├── base.css        # 基础样式
│   │   ├── layout.css      # 布局样式
│   │   ├── components.css  # 组件样式
│   │   ├── single-mode.css # 单图模式样式
│   │   └── batch-mode.css  # 批量模式样式
│   ├── modules/            # 功能模块
│   │   ├── stateManager.js # 状态管理
│   │   ├── uploadManager.js    # 上传管理
│   │   ├── processManager.js   # 处理管理
│   │   ├── namingManager.js    # 命名管理
│   │   ├── downloadManager.js  # 下载管理
│   │   ├── splitMode/          # 拆分模式
│   │   └── mergeMode/          # 合并模式
│   ├── workers/            # Web Worker
│   │   └── imageProcessor.js   # 图像处理核心
│   └── utils/              # 工具函数
│       └── helpers.js
└── README.md
```

## 使用方法

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 基本流程

1. **选择模式**：顶部导航栏切换功能模式
2. **上传图片**：点击或拖拽上传图片
3. **调整参数**：根据需要调整抠图参数
4. **开始处理**：点击处理按钮
5. **预览结果**：点击素材卡片可查看大图
6. **导出下载**：选择素材后导出 ZIP

## 核心算法

### 背景检测
- 四角采样自动识别背景色
- 支持透明通道检测
- 颜色距离容差匹配

### 素材识别
- 连通区域分析（8-连通）
- 闭运算形态学处理
- 双掩码策略（防止素材拆分）

### 边缘处理
- 背景膨胀/腐蚀
- 边界像素平滑（抗锯齿）
- 透明边缘裁剪

### 去重检测
- 边界框重叠计算
- 相似度阈值判断
- 自动合并相似素材

## 导出格式说明

### TexturePacker JSON (Hash)
Unity、Cocos2d 等引擎常用格式，帧数据以文件名为 key。

### TexturePacker JSON (Array)
Phaser 等框架常用格式，帧数据以数组形式存储。

### CSS Sprite
Web 开发常用，生成 CSS 背景定位代码。

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

需要支持 Web Worker 和 ES Modules 的现代浏览器。

## 许可证

MIT License
