# 批量图像处理系统设计方案

## 一、现状分析

当前项目（`切图/`）是一个基于 Vite + 原生 JS 的**单图**抠图工具，核心功能包括：
- 单张图片上传、预览
- Web Worker 进行背景去除处理（自动/白底/纯色/棋盘格/保留透明）
- 候选素材识别与裁切
- 单张/ZIP 导出

**需要改造为**：支持批量上传→批量抠图→批量命名→批量下载的完整工作流系统。

## 二、系统架构设计

### 整体流程

```
批量上传 → 上传队列管理 → 批量抠图处理 → 预览与调整 → 批量命名 → 批量下载
```

### 模块架构

```
src/
├── main.js                    # 应用入口，初始化与模块协调
├── styles.css                 # 全局样式
├── modules/
│   ├── uploadManager.js       # 批量上传模块
│   ├── processManager.js      # 批量抠图处理模块
│   ├── namingManager.js       # 批量命名模块
│   ├── downloadManager.js     # 批量下载模块
│   └── stateManager.js        # 全局状态管理
├── workers/
│   └── imageProcessor.js      # 图像处理 Worker（复用+增强）
└── utils/
    └── helpers.js             # 工具函数
```

## 三、各模块详细设计

### 1. 批量上传模块 (`uploadManager.js`)

**功能清单：**
- 支持一次选择多个文件（`<input multiple>`）
- 支持拖拽批量上传
- 文件格式验证：JPG、PNG、WEBP
- 文件大小限制：10MB/文件
- 上传队列管理：添加、删除、重排
- 上传进度显示（每个文件的加载进度）
- 缩略图预览生成
- 队列状态统计（总数、已上传、失败）

**数据结构：**
```js
fileItem = {
  id: string,            // 唯一标识
  file: File,            // 原始 File 对象
  name: string,          // 原始文件名
  size: number,          // 文件大小
  type: string,          // MIME 类型
  status: 'pending' | 'loaded' | 'error',  // 状态
  progress: number,      // 加载进度 0-100
  thumbnail: string,     // 缩略图 DataURL
  originalImage: Image,  // 加载后的 Image 对象
  imageData: ImageData,  // 原始像素数据
  error: string,         // 错误信息
}
```

**UI 区域：**
- 拖拽上传区（支持多文件）
- 文件队列列表（缩略图 + 文件名 + 大小 + 状态 + 删除按钮）
- 批量操作栏（全选、清空、添加更多文件）
- 统计信息（已选 X 个文件，共 Y MB）

### 2. 批量抠图模块 (`processManager.js`)

**功能清单：**
- 批量自动抠图：对上传队列中的所有图片依次处理
- 抠图模式：自动/白底/纯色/棋盘格/保留透明
- 精度设置：高（容差低）、中（默认）、低（容差高）
  - 高精度：容差 40，去边 5
  - 中精度：容差 80，去边 15
  - 低精度：容差 150，去边 25
- 手动调整模式：对单张图片进行参数微调
- 透明通道保留
- 处理进度条（已处理 X/总数）
- 处理结果预览（单张/全部网格预览）
- 可中断处理（取消按钮）

**处理流程：**
```
开始批量处理 → 逐张发送给 Worker → 收到结果更新状态 → 更新进度 → 全部完成
```

**数据结构扩展：**
```js
fileItem.processResult = {
  status: 'pending' | 'processing' | 'done' | 'error',
  processedImageData: ImageData,  // 处理后像素数据
  bgMask: Uint8Array,            // 背景掩码
  candidates: [],                 // 从此图识别出的候选素材
  processTime: number,           // 处理耗时(ms)
}
```

**UI 区域：**
- 全局处理参数面板（模式、精度选择）
- 批量处理按钮 + 进度条
- 单张手动调整入口（点击图片进入详细调整）
- 处理结果网格预览（处理前后对比）

### 3. 批量命名模块 (`namingManager.js`)

**功能清单：**
- 自定义命名模板系统
  - `{name}` - 原始文件名（不含扩展名）
  - `{index}` - 序号（支持自定义起始数字和位数）
  - `{date}` - 日期（YYYY-MM-DD）
  - `{time}` - 时间（HH-mm-ss）
  - `{timestamp}` - 时间戳
  - `{width}` - 图片宽度
  - `{height}` - 图片高度
  - `{size}` - 文件大小
- 模板输入框 + 变量快捷插入按钮
- 序号设置：起始数字（默认1）、位数（默认3，如001）
- 命名预览列表（模板 + 预览结果对照）
- 文件名唯一性处理：自动添加序号后缀避免冲突
- 单独修改某个文件的命名（覆盖模板）

**命名预览示例：**
```
模板: icon_{index}_{name}
预览:
  001 → icon_001_button-home
  002 → icon_002_button-settings
  003 → icon_003_avatar
```

**UI 区域：**
- 命名模板输入区
- 变量快捷按钮组
- 序号设置（起始值、位数）
- 命名预览列表
- 单独修改入口

### 4. 批量下载模块 (`downloadManager.js`)

**功能清单：**
- 下载全部处理后的图片
- 选择部分图片下载（勾选）
- 下载格式选项：
  - 单个 PNG 文件逐个下载
  - ZIP 压缩包批量下载（含 manifest.json）
- 下载进度条
- 成功/失败状态反馈
- 包含 manifest 清单文件

**UI 区域：**
- 下载选项（格式选择）
- 全选/反选/部分选择
- 下载按钮 + 进度条
- 下载结果统计

## 四、界面原型设计

### 整体布局（四步工作流）

```
┌─────────────────────────────────────────────────────────┐
│  批量图像处理系统                                         │
│  [①上传] ── [②抠图] ── [③命名] ── [④下载]               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  步骤①：批量上传                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         📁 点击或拖拽上传图片                      │   │
│  │    支持 PNG、JPG、WEBP，单文件不超过10MB           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  文件队列 (8个文件, 共12.3MB)                            │
│  ┌──────┬──────────────────┬──────┬──────┬───────┐   │
│  │ [✓]  │ 🖼 btn-home.png  │ 45KB │ ✓已载 │ [删除] │   │
│  │ [✓]  │ 🖼 avatar.png    │ 120KB│ ✓已载 │ [删除] │   │
│  │ [✓]  │ 🖼 bg-dialog.jpg │ 2.1MB│ ✓已载 │ [删除] │   │
│  │ ...  │ ...              │ ...  │ ...   │ ...    │   │
│  └──────┴──────────────────┴──────┴──────┴───────┘   │
│                                                         │
│  [全选] [清空] [添加更多]              [下一步：批量抠图 →] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  步骤②：批量抠图                                         │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │ 抠图设置          │  │ 处理进度                    │  │
│  │ 模式: [自动 ▾]    │  │ ████████░░ 6/8 (75%)       │  │
│  │ 精度: [●中 ○高 ○低]│  │                            │  │
│  │ [开始批量抠图]     │  │ 处理结果预览                │  │
│  │ [取消]            │  │ ┌──┐ ┌──┐ ┌──┐ ┌──┐       │  │
│  │                   │  │ │✓ │ │✓ │ │⏳│ │⏳│       │  │
│  │ 手动调整          │  │ └──┘ └──┘ └──┘ └──┘       │  │
│  │ [选中图片微调参数] │  │ ┌──┐ ┌──┐ ┌──┐ ┌──┐       │  │
│  │                   │  │ │⏳│ │⏳│ │☐ │ │☐ │       │  │
│  └──────────────────┘  │ └──┘ └──┘ └──┘ └──┘       │  │
│                        └────────────────────────────┘  │
│  [← 上一步]                         [下一步：批量命名 →] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  步骤③：批量命名                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 命名模板: [icon_{index}_{name}        ]          │  │
│  │ 变量: [{name}] [{index}] [{date}] [{time}]       │  │
│  │ 序号: 起始值 [1]  位数 [3]                        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  命名预览                                               │
│  ┌──────────────────────┬─────────────────────────┐   │
│  │ 原文件名              │ 新文件名                  │   │
│  │ btn-home.png         │ icon_001_btn-home.png    │   │
│  │ avatar.png           │ icon_002_avatar.png      │   │
│  │ bg-dialog.jpg        │ icon_003_bg-dialog.png   │   │
│  └──────────────────────┴─────────────────────────┘   │
│                                                         │
│  [← 上一步]                              [下一步：下载 →] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  步骤④：批量下载                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 下载格式: [● ZIP压缩包 ○ 单个文件]                 │  │
│  │ 选择范围: [● 全部 ○ 仅选中]                        │  │
│  │ [全选] [反选]                                     │  │
│  │                                                   │  │
│  │ 文件列表 (勾选要下载的文件)                         │  │
│  │ [✓] icon_001_btn-home.png    45KB   ✓就绪         │  │
│  │ [✓] icon_002_avatar.png     120KB   ✓就绪         │  │
│  │ [✓] icon_003_bg-dialog.png  2.1MB   ✓就绪         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  下载进度: ████████████████░░░ 85%                       │
│                                                         │
│  [← 上一步]                         [开始批量下载]       │
└─────────────────────────────────────────────────────────┘
```

## 五、核心技术实现方案

### 5.1 状态管理 (`stateManager.js`)

采用集中式状态管理，所有模块共享同一个状态对象：

```js
const appState = {
  currentStep: 1,           // 当前步骤 1-4
  files: [],                // FileItem[]
  processSettings: {
    mode: 'auto',
    precision: 'medium',
    tolerance: 80,
    edgeRemoval: 15,
  },
  namingTemplate: '{name}',
  namingConfig: {
    startIndex: 1,
    digitCount: 3,
  },
  selectedIds: new Set(),   // 选中的文件ID
};
```

### 5.2 Web Worker 并发处理

当前使用单个 Worker 串行处理。批量场景下改为：
- 创建 Worker 池（最多 `navigator.hardwareConcurrency` 个 Worker，默认4个）
- 任务队列分发：每个空闲 Worker 自动领取下一个待处理图片
- 支持取消：维护一个取消标志，处理前检查

### 5.3 批量命名模板引擎

```js
function applyNamingTemplate(template, fileItem, globalIndex, config) {
  const { startIndex, digitCount } = config;
  const index = startIndex + globalIndex;
  const now = new Date();
  const nameWithoutExt = fileItem.name.replace(/\.[^.]+$/, '');

  return template
    .replace('{name}', nameWithoutExt)
    .replace('{index}', String(index).padStart(digitCount, '0'))
    .replace('{date}', now.toISOString().slice(0, 10))
    .replace('{time}', now.toTimeString().slice(0, 8).replace(/:/g, '-'))
    .replace('{timestamp}', String(Date.now()))
    .replace('{width}', String(fileItem.width))
    .replace('{height}', String(fileItem.height))
    .replace('{size}', formatFileSize(fileItem.size));
}
```

### 5.4 ZIP 批量下载

复用现有 JSZip 库，增加进度回调：

```js
async function batchDownloadZip(fileItems, namingResults, onProgress) {
  const zip = new JSZip();
  const total = fileItems.length;

  for (let i = 0; i < total; i++) {
    const item = fileItems[i];
    const fileName = namingResults[i] + '.png';
    const blob = await canvasToBlob(item.processResult.previewCanvas);
    zip.file(fileName, blob);
    onProgress((i + 1) / total * 80); // 80% for adding files
  }

  const content = await zip.generateAsync(
    { type: 'blob' },
    (metadata) => onProgress(80 + metadata.percent * 0.2)
  );

  triggerDownload(content, 'batch-cutout-export.zip');
}
```

### 5.5 性能优化策略

- **缩略图懒加载**：上传后仅生成小尺寸缩略图，详细预览按需生成
- **Worker 并发**：多 Worker 并行处理，充分利用多核
- **分批处理**：大量图片时，分批处理（每批10张），避免内存溢出
- **内存管理**：处理完成后及时释放不需要的 ImageData
- **虚拟列表**：文件队列使用虚拟滚动，避免大量 DOM 节点

## 六、实施步骤

### 第一阶段：基础架构重构
1. 创建模块文件结构（`src/modules/` 和 `src/utils/`）
2. 实现状态管理器 `stateManager.js`
3. 重构 `main.js` 为模块化入口
4. 将现有 Worker 代码保持不变，增强消息协议支持批量任务

### 第二阶段：批量上传模块
5. 实现多文件选择与拖拽上传
6. 实现文件验证（格式、大小）
7. 实现上传队列 UI（列表 + 缩略图 + 状态 + 操作）
8. 实现文件加载与进度显示

### 第三阶段：批量抠图模块
9. 实现批量处理流程（Worker 池 + 任务队列）
10. 实现精度预设（高/中/低）
11. 实现批量进度条与状态显示
12. 实现手动调整模式（单张参数微调）
13. 实现预览功能（单张/网格预览）

### 第四阶段：批量命名模块
14. 实现命名模板引擎
15. 实现变量替换与序号生成
16. 实现命名预览列表
17. 实现唯一性检查与冲突处理
18. 实现单独修改覆盖功能

### 第五阶段：批量下载模块
19. 实现 ZIP 压缩包批量下载
20. 实现选择下载（全部/部分）
21. 实现下载进度条
22. 实现下载状态反馈

### 第六阶段：整体集成与优化
23. 实现步骤导航（四步工作流切换）
24. 全流程串联与测试
25. 样式优化与响应式适配
26. 性能优化（虚拟列表、内存管理）

## 七、关键改造点（相对现有代码）

| 现有功能 | 改造内容 |
|---------|---------|
| 单文件 `<input>` | 改为 `multiple` 多文件上传 |
| 单一 `state.originalImage` | 改为 `state.files[]` 数组 |
| 单 Worker 串行 | 改为 Worker 池并发 |
| 固定候选名 `candidate-001` | 改为模板命名系统 |
| 单图导出/ZIP | 改为批量 ZIP + 进度条 |
| 单页左右布局 | 改为步骤式工作流布局 |
