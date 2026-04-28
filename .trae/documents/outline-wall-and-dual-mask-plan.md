# 轮廓墙 + 双掩码策略实现计划

## 一、当前代码现状

### 1.1 已有基础（可直接复用）

| 文件 | 已有内容 | 状态 |
|---|---|---|
| `src/workers/imageProcessor.js` | `irregularDetect()` - 边缘 BFS + 轮廓墙算法 | ✅ 已实现 |
| `src/workers/imageProcessor.js` | `innerContourRemove()` - 内轮廓二次抠图 | ✅ 已实现 |
| `src/modules/splitMode/splitController.js` | 拆分模式 UI + 异形检测交互 | ✅ 已集成 |
| `index.html` | 单图模式基础 UI | ✅ 已存在 |

### 1.2 缺失的部分

| 功能 | 缺失原因 |
|---|---|
| 单图模式无轮廓墙 | `main.js` 只调用了 `processImage` + `detectAssets`，没调用 `irregularDetect` |
| 单图模式无内轮廓抠图 | `main.js` 没有内轮廓抠图的 UI 和交互逻辑 |
| `detectAssets` 无双掩码 | 只有单掩码膨胀，没有闭运算掩码 + 精确像素恢复 |

---

## 二、总体设计思路

### 2.1 架构决策

**方案 A：完全替换现有流程**
- 用 `irregularDetect` 替换 `processImage` + `detectAssets`
- 优点：统一，代码简洁
- 缺点：破坏已有的自动模式（白底、洋红、棋盘格等）

**方案 B：新增"异形抠图"模式**
- 在背景模式 select 中增加"异形抠图"选项
- 选择后启用轮廓墙 + 内轮廓功能
- 优点：不破坏现有功能，用户按需选择
- 缺点：代码分支增多

**选择：方案 B**

理由：
1. 现有自动模式对纯色底（白底、洋红）已经足够好
2. 异形抠图是针对"深色渐变背景 + 黑色外轮廓"这类特殊场景的
3. 用户可根据图片类型灵活选择

### 2.2 用户交互流程（单图模式）

```
上传图片
  ↓
选择背景模式：
  ├─ 自动/白底/纯色/棋盘格/保留透明 → 现有流程不变
  └─ 【新增】异形抠图 → 新流程
       ↓
       1. 点击"取背景色" → 在原图上点击背景区域
       2. [可选] 点击"取轮廓色" → 在原图上点击黑色外轮廓
       3. 点击"开始抠图" → Worker 执行 irregularDetect
       4. 显示候选区域列表（带颜色标注）
       5. [可选] 勾选区域 → 点击"去除内部背景" → innerContourRemove
       6. 导出选中/全部
```

---

## 三、具体实施步骤

### Phase 1: 单图模式集成异形抠图 UI

**目标：** 在单图模式的侧边栏增加"异形抠图"所需的控件

#### 步骤 1.1: 修改 index.html（单图模式侧边栏）

**位置：** `index.html` 中 `single-mode-panel` 的 `.controls` 区域

**现有结构：**
```html
<div class="control-group">
  <label for="bg-mode">背景模式</label>
  <select id="bg-mode">
    <option value="auto">自动</option>
    <option value="white">白底抠图</option>
    <option value="solid">纯色底抠图</option>
    <option value="checkerboard">棋盘格抠图</option>
    <option value="keep-transparent">保留透明</option>
  </select>
</div>
```

**修改为：**
```html
<div class="control-group">
  <label for="bg-mode">背景模式</label>
  <select id="bg-mode">
    <option value="auto">自动</option>
    <option value="white">白底抠图</option>
    <option value="solid">纯色底抠图</option>
    <option value="checkerboard">棋盘格抠图</option>
    <option value="keep-transparent">保留透明</option>
    <option value="irregular">【新】异形抠图</option>
  </select>
</div>

<!-- 原有控件（容差、去边强度、合并距离等）在普通模式下显示 -->
<div id="normal-mode-controls">
  <!-- 现有控件保持不动 -->
</div>

<!-- 新增：异形抠图专用控件 -->
<div id="irregular-mode-controls" style="display:none">
  <div class="control-group">
    <label>背景色</label>
    <div class="color-pick-row">
      <input type="color" id="ir-bg-color-picker" value="#ffffff">
      <span id="ir-bg-color-status">未取色</span>
      <button id="ir-bg-pick-btn" class="btn btn-sm btn-secondary">🧪 取色</button>
    </div>
  </div>
  <div class="control-group">
    <label>轮廓色（可选）</label>
    <div class="color-pick-row">
      <input type="color" id="ir-outline-color-picker" value="#000000">
      <span id="ir-outline-color-status">未取色</span>
      <button id="ir-outline-pick-btn" class="btn btn-sm btn-secondary">🧪 取色</button>
    </div>
  </div>
  <div class="control-group">
    <label>轮廓容差 <span id="outline-tol-val">80</span></label>
    <input type="range" id="outline-tolerance" min="1" max="100" value="80">
  </div>
  <div class="control-group">
    <label>检测灵敏度 <span id="detect-sens-val">30</span></label>
    <input type="range" id="detect-sensitivity" min="1" max="100" value="30">
  </div>
  <div class="control-group">
    <label>最小面积 <span id="ir-min-area-val">100</span></label>
    <input type="range" id="ir-min-area" min="10" max="5000" value="100" step="10">
  </div>
  <div class="control-group">
    <label>轮廓外扩 <span id="dilate-px-val">-1</span></label>
    <input type="range" id="dilate-px" min="-5" max="10" value="-1">
  </div>
</div>
```

**新增 CSS 样式：** 在 `src/styles/single-mode.css` 中添加 `.color-pick-row` 样式（参考 split-merge-mode.css）

#### 步骤 1.2: 修改 main.js - 状态管理

**位置：** `src/main.js` 中 `singleState` 对象

**添加状态字段：**
```javascript
const singleState = {
  // ... 现有字段 ...
  selectedBgColor: null,
  // 新增：
  selectedOutlineColor: null,
  irMode: {
    bgColor: null,       // {r, g, b}
    outlineColor: null,  // {r, g, b} | null
    regions: [],         // 检测到的区域列表
    selectedRegions: new Set(), // 勾选了内轮廓抠图的区域
  },
  pickMode: null, // null | 'bg' | 'outline'
};
```

#### 步骤 1.3: 修改 main.js - 事件监听

**位置：** `src/main.js` 中 `setupSingleEventListeners()` 函数

**新增事件监听：**
```javascript
// 背景模式切换时显示/隐藏对应控件
el.bgMode.addEventListener('change', (e) => {
  const isIrregular = e.target.value === 'irregular';
  document.getElementById('normal-mode-controls').style.display = isIrregular ? 'none' : '';
  document.getElementById('irregular-mode-controls').style.display = isIrregular ? '' : 'none';
  // 重置取色状态
  if (!isIrregular) {
    resetIrregularState();
  }
});

// 取背景色按钮
document.getElementById('ir-bg-pick-btn').addEventListener('click', () => {
  if (!singleState.originalImage) { alert('请先上传图片'); return; }
  singleState.pickMode = 'bg';
  showToast('请点击原图上的背景区域');
});

// 取轮廓色按钮
document.getElementById('ir-outline-pick-btn').addEventListener('click', () => {
  if (!singleState.originalImage) { alert('请先上传图片'); return; }
  singleState.pickMode = 'outline';
  showToast('请点击原图上的黑色外轮廓');
});

// 原图点击取色（在现有 handleImageClick 中扩展）
```

**修改 `handleImageClick`：**
```javascript
function handleImageClick(e) {
  // 如果处于取色模式
  if (singleState.pickMode) {
    const rect = singleElements.originalPreview.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * singleState.fileWidth);
    const y = Math.floor((e.clientY - rect.top) / rect.height * singleState.fileHeight);
    
    const idx = (y * singleState.fileWidth + x) * 4;
    const r = singleState.originalImageData.data[idx];
    const g = singleState.originalImageData.data[idx + 1];
    const b = singleState.originalImageData.data[idx + 2];
    
    if (singleState.pickMode === 'bg') {
      singleState.irMode.bgColor = {r, g, b};
      document.getElementById('ir-bg-color-picker').value = rgbToHex(r, g, b);
      document.getElementById('ir-bg-color-status').textContent = `RGB(${r},${g},${b})`;
      showToast('背景色已选取');
    } else if (singleState.pickMode === 'outline') {
      singleState.irMode.outlineColor = {r, g, b};
      document.getElementById('ir-outline-color-picker').value = rgbToHex(r, g, b);
      document.getElementById('ir-outline-color-status').textContent = `RGB(${r},${g},${b})`;
      showToast('轮廓色已选取');
    }
    
    singleState.pickMode = null;
    return;
  }
  
  // ... 原有的纯色取色逻辑（保留）...
}
```

### Phase 2: 调用 Worker 的 irregularDetect

#### 步骤 2.1: 修改 main.js - processImage 函数

**位置：** `src/main.js` 中 `processImage()` 函数

**修改逻辑：**
```javascript
function processImage() {
  if (!singleState.originalImage) return;
  
  const bgMode = singleElements.bgMode.value;
  
  if (bgMode === 'irregular') {
    // 异形抠图模式
    if (!singleState.irMode.bgColor) {
      alert('请先选取背景色');
      return;
    }
    processIrregular();
  } else {
    // 原有流程
    processNormal();
  }
}

function processIrregular() {
  showLoading('正在检测异形素材...');
  
  worker.postMessage({
    type: 'irregularDetect',
    data: {
      imageData: {
        width: singleState.fileWidth,
        height: singleState.fileHeight,
        data: Array.from(singleState.originalImageData.data)
      },
      bgColor: singleState.irMode.bgColor,
      outlineColor: singleState.irMode.outlineColor,
      outlineTolerance: parseInt(document.getElementById('outline-tolerance').value),
      sensitivity: parseInt(document.getElementById('detect-sensitivity').value),
      minArea: parseInt(document.getElementById('ir-min-area').value),
      dilatePx: parseInt(document.getElementById('dilate-px').value)
    }
  });
  
  processTimeout = setTimeout(() => {
    hideLoading();
    alert('检测超时，请尝试调整参数');
  }, 30000);
}
```

#### 步骤 2.2: 修改 main.js - Worker onmessage 处理

**位置：** `src/main.js` 中 Worker 的 `onmessage` 回调

**新增处理：**
```javascript
worker.onmessage = function(e) {
  const { type, result, assets, regions, error } = e.data;
  
  switch (type) {
    case 'processImageResult':
      handleProcessedImage(result);
      break;
    case 'detectAssetsResult':
      handleDetectedAssets(assets);
      break;
    case 'irregularDetectResult':
      handleIrregularDetectResult(regions);
      break;
    case 'innerContourRemoveResult':
      handleInnerContourRemoveResult(regions);
      break;
    case 'error':
      // ...
  }
};
```

**新增处理函数：**
```javascript
function handleIrregularDetectResult(regions) {
  clearTimeout(processTimeout);
  
  singleState.irMode.regions = regions;
  singleState.candidates = regions.map((r, i) => ({
    id: i + 1,
    name: `candidate-${String(i + 1).padStart(3, '0')}`,
    x: r.bounds.x,
    y: r.bounds.y,
    w: r.bounds.w,
    h: r.bounds.h,
    pixels: r.pixels,        // 精确像素坐标列表
    pixelSet: r.pixelSet,    // Uint8Array 掩码
    color: r.color,
    area: r.area,
  }));
  singleState.selectedCandidates = new Set(singleState.candidates.map(c => c.id));
  
  singleElements.candidateCount.textContent = regions.length;
  renderIrregularCandidates();
  
  // 显示透明预览（基于不规则像素）
  renderIrregularPreview();
  
  hideLoading();
}
```

#### 步骤 2.3: 新增渲染函数

**`renderIrregularCandidates()`：**
- 显示候选区域列表（带颜色标注）
- 每个区域可勾选"内轮廓抠图"
- 参考 `splitController.js` 中的 `updateRegionListUI`

**`renderIrregularPreview()`：**
- 在透明预览 canvas 上，按不规则像素渲染
- 只有 pixelSet 标记的像素才显示，其余透明

### Phase 3: 集成内轮廓二次抠图

#### 步骤 3.1: UI 控件

**在 irregular-mode-controls 区域追加：**
```html
<!-- 检测完成后显示 -->
<div id="inner-contour-section" style="display:none">
  <div class="section-title">内轮廓抠图</div>
  <div class="control-group">
    <label>内部背景色</label>
    <div class="color-pick-row">
      <input type="color" id="inner-bg-color-picker" value="#ffffff">
      <span id="inner-bg-color-status">未取色</span>
      <button id="inner-bg-pick-btn" class="btn btn-sm btn-secondary">🧪 取色</button>
    </div>
  </div>
  <div class="control-group">
    <label>内部轮廓色（可选）</label>
    <div class="color-pick-row">
      <input type="color" id="inner-outline-color-picker" value="#000000">
      <span id="inner-outline-color-status">未取色</span>
      <button id="inner-outline-pick-btn" class="btn btn-sm btn-secondary">🧪 取色</button>
    </div>
  </div>
  <div class="control-group">
    <label>内部容差 <span id="inner-tol-val">50</span></label>
    <input type="range" id="inner-tolerance" min="1" max="100" value="50">
  </div>
  <div class="control-group">
    <label>内扣外扩 <span id="inner-dilate-px-val">-1</span></label>
    <input type="range" id="inner-dilate-px" min="-5" max="10" value="-1">
  </div>
  <button id="apply-inner-btn" class="btn btn-primary">🕳️ 去除内部背景</button>
</div>
```

#### 步骤 3.2: 事件处理

```javascript
document.getElementById('apply-inner-btn').addEventListener('click', () => {
  const selectedIndices = Array.from(singleState.irMode.selectedRegions);
  if (selectedIndices.length === 0) {
    alert('请先勾选要处理的区域');
    return;
  }
  if (!singleState.irMode.innerBgColor) {
    alert('请先选取内部背景色');
    return;
  }
  
  showLoading('正在去除内部背景...');
  
  worker.postMessage({
    type: 'innerContourRemove',
    data: {
      imageData: {
        width: singleState.fileWidth,
        height: singleState.fileHeight,
        data: Array.from(singleState.originalImageData.data)
      },
      regions: singleState.irMode.regions,
      selectedIndices: selectedIndices,
      innerBgColor: singleState.irMode.innerBgColor,
      innerOutlineColor: singleState.irMode.innerOutlineColor,
      innerTolerance: parseInt(document.getElementById('inner-tolerance').value),
      innerDilatePx: parseInt(document.getElementById('inner-dilate-px').value)
    }
  });
});
```

### Phase 4: 双掩码策略（增强 detectAssets）

#### 步骤 4.1: 修改 Worker 中的 detectAssets

**位置：** `src/workers/imageProcessor.js`

**现有逻辑：**
```javascript
const dilatedMask = dilateMask(mask, width, height, Math.floor(mergeDistance / 2));
const regions = findConnectedRegions(dilatedMask, width, height);
```

**修改为双掩码：**
```javascript
// 掩码 A：原始掩码（用于精确像素提取）
const originalMask = new Uint8Array(mask);

// 掩码 B：闭运算掩码（用于连通性分析，防止素材被拆开）
const closedMask = closingMorphology(mask, width, height, 1);

// 在闭运算掩码上找连通区域
const regions = findConnectedRegions(closedMask, width, height);

// 对每个区域，从闭运算区域出发，在原始掩码上精确提取像素
const preciseRegions = regions.map(region => {
  // 1. 收集闭运算区域内所有原始前景像素作为种子
  const seeds = [];
  for (let y = region.minY; y <= region.maxY; y++) {
    for (let x = region.minX; x <= region.maxX; x++) {
      if (originalMask[y * width + x] === 1) {
        seeds.push({x, y});
      }
    }
  }
  
  // 2. 从种子出发，8-连通 BFS，只收集原始前景像素
  const exactPixels = [];
  const visited = new Uint8Array(width * height);
  const queue = [...seeds];
  queue.forEach(p => visited[p.y * width + p.x] = 1);
  
  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    exactPixels.push(p);
    
    // 8-邻域检查
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = p.x + dx, ny = p.y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
            !visited[ny * width + nx] && originalMask[ny * width + nx] === 1) {
          visited[ny * width + nx] = 1;
          queue.push({x: nx, y: ny});
        }
      }
    }
  }
  
  // 3. 重新计算精确边界框
  let minX = width, maxX = 0, minY = height, maxY = 0;
  exactPixels.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  
  return {
    minX, maxX, minY, maxY,
    pixels: exactPixels
  };
});
```

**新增闭运算函数：**
```javascript
function closingMorphology(mask, width, height, iterations) {
  const result = new Uint8Array(mask);
  
  // 膨胀
  for (let i = 0; i < iterations; i++) {
    const dilated = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (result[y * width + x] === 1) { dilated[y * width + x] = 1; continue; }
        let found = false;
        for (let dy = -1; dy <= 1 && !found; dy++) {
          for (let dx = -1; dx <= 1 && !found; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && result[ny * width + nx] === 1) {
              found = true;
            }
          }
        }
        dilated[y * width + x] = found ? 1 : 0;
      }
    }
    result.set(dilated);
  }
  
  // 腐蚀（恢复边缘）
  for (let i = 0; i < iterations; i++) {
    const eroded = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (result[y * width + x] === 0) { eroded[y * width + x] = 0; continue; }
        let allFg = true;
        for (let dy = -1; dy <= 1 && allFg; dy++) {
          for (let dx = -1; dx <= 1 && allFg; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && result[ny * width + nx] === 0) {
              allFg = false;
            }
          }
        }
        eroded[y * width + x] = allFg ? 1 : 0;
      }
    }
    result.set(eroded);
  }
  
  return result;
}
```

### Phase 5: 导出适配

#### 步骤 5.1: 异形模式导出

**问题：** `exportCandidates` 函数假设候选素材是矩形裁剪，但异形模式的素材是不规则形状。

**修改方案：**
```javascript
function exportCandidates(candidates) {
  // ... 现有 ZIP 创建逻辑 ...
  
  for (const candidate of candidates) {
    let canvas, ctx;
    
    if (candidate.pixels) {
      // 异形模式：按精确像素创建透明 PNG
      canvas = document.createElement('canvas');
      canvas.width = candidate.w;
      canvas.height = candidate.h;
      ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(candidate.w, candidate.h);
      
      // 只填充精确像素
      candidate.pixels.forEach(({x, y}) => {
        const localX = x - candidate.x;
        const localY = y - candidate.y;
        if (localX >= 0 && localX < candidate.w && localY >= 0 && localY < candidate.h) {
          const srcIdx = (y * singleState.fileWidth + x) * 4;
          const dstIdx = (localY * candidate.w + localX) * 4;
          imageData.data[dstIdx] = singleState.originalImageData.data[srcIdx];
          imageData.data[dstIdx + 1] = singleState.originalImageData.data[srcIdx + 1];
          imageData.data[dstIdx + 2] = singleState.originalImageData.data[srcIdx + 2];
          imageData.data[dstIdx + 3] = 255;
        }
      });
      
      ctx.putImageData(imageData, 0, 0);
    } else {
      // 原有矩形模式逻辑
      // ...
    }
    
    // ... 继续导出 ...
  }
}
```

---

## 四、文件修改清单

| # | 文件 | 修改类型 | 修改内容 |
|---|---|---|---|
| 1 | `index.html` | 修改 | 背景模式 select 增加"异形抠图"选项；新增 irregular-mode-controls 区域 |
| 2 | `src/styles/single-mode.css` | 新增 | .color-pick-row, .region-item, .inner-cb 等样式 |
| 3 | `src/main.js` | 修改 | singleState 增加 irMode 字段；setupSingleEventListeners 增加异形模式事件；processImage 增加分支逻辑 |
| 4 | `src/main.js` | 新增 | handleIrregularDetectResult, renderIrregularCandidates, renderIrregularPreview, processIrregular 函数 |
| 5 | `src/workers/imageProcessor.js` | 修改 | detectAssets 引入双掩码策略（closingMorphology + 精确像素提取） |
| 6 | `src/workers/imageProcessor.js` | 新增 | closingMorphology 函数 |
| 7 | `src/main.js` | 修改 | exportCandidates 支持不规则像素导出 |

---

## 五、测试计划

### 5.1 功能测试

| # | 测试场景 | 预期结果 |
|---|---|---|
| 1 | 上传深色背景+黑色轮廓素材图，选"异形抠图"，只取背景色 | 正确检测所有素材，边缘可能有轻微渗入 |
| 2 | 同上，再取轮廓色 | 边缘更精确，无渗入 |
| 3 | 选择大方框素材，执行内轮廓抠图 | 方框中间空白变为透明 |
| 4 | 普通模式（自动/白底）处理纯色底图 | 与修改前一致，无回归 |
| 5 | 双掩码策略：藤蔓素材（中间有镂空） | 不会被拆成多个碎片 |

### 5.2 性能测试

| # | 测试场景 | 预期性能 |
|---|---|---|
| 1 | 1024x1024 异形检测 | < 3 秒 |
| 2 | 2048x2048 异形检测 | < 8 秒 |
| 3 | 2048x2048 内轮廓抠图（10个区域） | < 5 秒 |

---

## 六、风险与备选方案

### 6.1 风险

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| Worker 算法复杂度过高 | 大图片处理超时 | 增加 Worker 超时时间；提示用户缩小图片 |
| 闭运算把相邻素材合并 | 检测数量减少 | 闭运算迭代次数默认 1，用户可调到 0 |
| 内轮廓抠图误判 | 素材内部被错误删除 | 提供撤销功能；默认不自动执行 |

### 6.2 备选方案

如果双掩码策略实现复杂，可以简化为：
- 只增加 `closingMorphology` 一步（不区分原始掩码和闭运算掩码）
- 牺牲一些精确度，但代码更简单

---

## 七、计划总结

| Phase | 内容 | 预估时间 | 优先级 |
|---|---|---|---|
| Phase 1 | 单图模式 UI 改造 | 2h | P1 |
| Phase 2 | 集成 irregularDetect | 2h | P1 |
| Phase 3 | 集成 innerContourRemove | 2h | P2 |
| Phase 4 | 双掩码策略 | 3h | P2 |
| Phase 5 | 导出适配 + 测试 | 2h | P3 |
| **总计** | | **~11h** | |

**建议实施顺序：** Phase 1 → Phase 2 → Phase 3 → Phase 5（基础测试）→ Phase 4

理由：Phase 1+2+3 可以形成完整可用的"异形抠图"功能，Phase 4 是对现有普通模式的增强，可以后续再做。
