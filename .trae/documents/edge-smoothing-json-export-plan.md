# 边缘平滑 + JSON 数据导出实现计划

## 一、当前项目状态

### 1.1 已完成的功能
| 功能 | 状态 | 备注 |
|---|---|---|
| 单图抠图（多种背景模式） | ✅ | 自动、白底、纯色、棋盘格、保留透明、异形抠图 |
| 批量抠图 | ✅ | 去背景 + 自动拆分素材 |
| 异形抠图（轮廓墙） | ✅ | 背景色+轮廓色标注，边缘 BFS 检测 |
| 内轮廓抠图 | ✅ | 二次抠图去除素材内部背景 |
| 素材预览 | ✅ | 从整图提取像素渲染缩略图 |
| 拆分模式 | ✅ | 手动选框 + 自动网格 + 异形检测 |
| 合并模式 | ✅ | 多图合并为素材板 |
| ZIP 下载 | ✅ | 拆分后的素材打包下载 |

### 1.2 未完成/可改进的部分
| 功能 | 优先级 | 原因 |
|---|---|---|
| 边缘平滑（Matting） | P1 | 当前硬切割，素材边缘有锯齿 |
| JSON 数据导出 | P1 | 记录素材坐标，方便导入游戏引擎 |
| 双掩码策略（Phase 4） | P2 | 解决"藤蔓素材被拆分"问题 |
| 导出引擎格式 | P2 | Unity/Phaser/Cocos2d 兼容 |

---

## 二、需求分析

### 2.1 边缘平滑（Matting）

**问题：**
当前抠图是硬切割（背景像素 alpha=0，前景像素 alpha=255），素材边缘有锯齿感，尤其是曲线和斜线边缘。

**目标效果：**
边缘像素的 alpha 值根据"前景/背景混合程度"平滑过渡，产生抗锯齿效果。

**技术方案：**
参考 GIMP 的"羽化选区"和 BackgroundMattingV2 的思想，在 Worker 中实现：

```
步骤：
1. 找到所有"边界像素"（前景像素的 8-邻域中有背景像素）
2. 对每个边界像素，统计邻域中前景像素的比例
3. alpha = 前景比例 * 255（0-255 之间的平滑值）
4. 非边界像素保持 alpha=255
```

### 2.2 JSON 数据导出

**问题：**
用户下载素材后，如果需要导入游戏引擎（Unity、Phaser 等），需要知道每个素材在原图中的坐标和尺寸。

**目标：**
导出时附带 JSON 数据文件，记录每个素材的元信息。

**JSON 格式设计：**
```json
{
  "meta": {
    "app": "游戏UI素材工具",
    "version": "1.0.0",
    "image": "source-image.png",
    "size": { "w": 2048, "h": 2048 }
  },
  "frames": {
    "asset-001.png": {
      "frame": { "x": 10, "y": 20, "w": 64, "h": 64 },
      "rotated": false,
      "trimmed": false,
      "sourceSize": { "w": 64, "h": 64 }
    },
    "asset-002.png": {
      "frame": { "x": 84, "y": 20, "w": 48, "h": 72 },
      "rotated": false,
      "trimmed": false,
      "sourceSize": { "w": 48, "h": 72 }
    }
  }
}
```

**兼容格式：**
- TexturePacker JSON (Hash) 格式 — Unity 等常用
- TexturePacker JSON (Array) 格式 — Phaser 常用
- CSS Sprite 格式 — Web 开发常用

---

## 三、具体实施步骤

### Phase 1: 边缘平滑（Matting）

#### 步骤 1.1: Worker 中新增 `smoothEdges` 函数

**文件：** `src/workers/imageProcessor.js`

**新增函数：**
```javascript
function smoothEdges(imageData, bgMask, edgeWidth) {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);
  const edgePixels = new Set();
  
  // 1. 找到所有边界像素
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (bgMask[idx] === 0) { // 前景像素
        // 检查 8-邻域
        let hasBg = false;
        for (let dy = -1; dy <= 1 && !hasBg; dy++) {
          for (let dx = -1; dx <= 1 && !hasBg; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (bgMask[(y + dy) * width + (x + dx)] === 1) {
              hasBg = true;
            }
          }
        }
        if (hasBg) {
          edgePixels.add(idx);
        }
      }
    }
  }
  
  // 2. 对边界像素平滑 alpha
  for (const idx of edgePixels) {
    const x = idx % width;
    const y = Math.floor(idx / width);
    
    let fgCount = 0;
    let total = 0;
    
    // 在 edgeWidth 范围内统计
    for (let dy = -edgeWidth; dy <= edgeWidth; dy++) {
      for (let dx = -edgeWidth; dx <= edgeWidth; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          total++;
          if (bgMask[ny * width + nx] === 0) {
            fgCount++;
          }
        }
      }
    }
    
    // alpha = 前景比例 * 255
    const alpha = Math.round((fgCount / total) * 255);
    const pi = idx * 4;
    result[pi + 3] = alpha;
  }
  
  return result;
}
```

**参数说明：**
- `edgeWidth`: 平滑范围（像素），默认 1-2

#### 步骤 1.2: 在 `processImage` 中集成平滑

**修改位置：** `src/workers/imageProcessor.js` 的 `processImage` 函数

**新增参数：**
```javascript
function processImage({ imageData, bgMode, tolerance, edgeRemoval, dilateErode = 0, selectedColor, smoothEdge = 0 }) {
  // ... 现有代码 ...
  
  // 在最后添加平滑处理
  if (smoothEdge > 0) {
    const smoothedData = smoothEdges(
      { width, height, data: pixelData },
      bgMask,
      smoothEdge
    );
    pixelData = smoothedData;
  }
  
  return {
    imageData: { width, height, data: Array.from(pixelData) },
    bgMask: Array.from(bgMask)
  };
}
```

#### 步骤 1.3: 单图模式 UI 增加平滑选项

**文件：** `index.html`

**在抠图设置区域新增：**
```html
<div class="control-group">
  <label for="edge-smooth">边缘平滑 <span class="range-val" id="edge-smooth-value">0</span></label>
  <input type="range" id="edge-smooth" min="0" max="3" value="0">
  <small class="hint">0=关闭, 1=轻度, 2=中度, 3=强度</small>
</div>
```

**文件：** `src/styles/single-mode.css`

**新增样式：**
```css
.hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  display: block;
}
```

#### 步骤 1.4: 单图模式事件监听

**文件：** `src/main.js`

**在 `setupSingleEventListeners` 中新增：**
```javascript
const edgeSmooth = document.getElementById('edge-smooth');
const edgeSmoothValue = document.getElementById('edge-smooth-value');
if (edgeSmooth) {
  edgeSmooth.addEventListener('input', (e) => {
    if (edgeSmoothValue) edgeSmoothValue.textContent = e.target.value;
  });
}
```

**修改 `processNormal` 发送参数：**
```javascript
worker.postMessage({
  type: 'processImage',
  data: {
    // ... 现有参数 ...
    smoothEdge: parseInt(document.getElementById('edge-smooth').value)
  }
});
```

#### 步骤 1.5: 批量模式集成平滑

**文件：** `src/modules/processManager.js`

**在 `processSingleFile` 的 `worker.postMessage` 中添加：**
```javascript
worker.postMessage({
  type: 'processImage',
  data: {
    // ... 现有参数 ...
    smoothEdge: 1  // 批量模式默认轻度平滑
  }
});
```

---

### Phase 2: JSON 数据导出

#### 步骤 2.1: 新增 JSON 生成工具函数

**文件：** `src/utils/helpers.js`

**新增函数：**
```javascript
export function generateTexturePackerJson(assets, sourceImageName, sourceWidth, sourceHeight) {
  const frames = {};
  for (const asset of assets) {
    frames[asset.name + '.png'] = {
      frame: { x: asset.x, y: asset.y, w: asset.w, h: asset.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: asset.w, h: asset.h },
      sourceSize: { w: asset.w, h: asset.h }
    };
  }
  
  return {
    meta: {
      app: '游戏UI素材工具',
      version: '1.0.0',
      image: sourceImageName,
      format: 'RGBA8888',
      size: { w: sourceWidth, h: sourceHeight }
    },
    frames: frames
  };
}

export function generateTexturePackerJsonArray(assets, sourceImageName, sourceWidth, sourceHeight) {
  const frames = assets.map(asset => ({
    filename: asset.name + '.png',
    frame: { x: asset.x, y: asset.y, w: asset.w, h: asset.h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: asset.w, h: asset.h },
    sourceSize: { w: asset.w, h: asset.h }
  }));
  
  return {
    meta: {
      app: '游戏UI素材工具',
      version: '1.0.0',
      image: sourceImageName,
      format: 'RGBA8888',
      size: { w: sourceWidth, h: sourceHeight }
    },
    frames: frames
  };
}

export function generateCssSprite(assets, sourceImageName) {
  let css = `/* Generated by 游戏UI素材工具 */\n`;
  css += `.sprite { background-image: url('${sourceImageName}'); }\n\n`;
  
  for (const asset of assets) {
    css += `.sprite-${asset.name} {\n`;
    css += `  width: ${asset.w}px;\n`;
    css += `  height: ${asset.h}px;\n`;
    css += `  background-position: -${asset.x}px -${asset.y}px;\n`;
    css += `}\n\n`;
  }
  
  return css;
}
```

#### 步骤 2.2: 修改单图模式导出函数

**文件：** `src/main.js`

**修改 `exportCandidates` 函数：**
```javascript
async function exportCandidates(candidates) {
  if (candidates.length === 0) {
    alert('没有可导出的素材');
    return;
  }

  showLoading('正在导出素材...');

  const zip = new JSZip();
  const imagesFolder = zip.folder('images');
  const manifest = [];
  const srcData = singleState.processedImageData;
  const srcW = srcData?.width || 0;

  // 提取所有素材像素
  for (const candidate of candidates) {
    // ... 现有提取逻辑 ...
    imagesFolder.file(fileName, blob);
    manifest.push({
      name: candidate.name,
      file: fileName,
      x: candidate.x,
      y: candidate.y,
      w: candidate.w,
      h: candidate.h
    });
  }

  // 生成 JSON 数据文件
  const jsonHash = generateTexturePackerJson(
    manifest,
    singleState.fileName,
    srcW,
    srcData?.height || 0
  );
  zip.file('spritesheet.json', JSON.stringify(jsonHash, null, 2));

  const jsonArray = generateTexturePackerJsonArray(
    manifest,
    singleState.fileName,
    srcW,
    srcData?.height || 0
  );
  zip.file('spritesheet-array.json', JSON.stringify(jsonArray, null, 2));

  const css = generateCssSprite(manifest, singleState.fileName);
  zip.file('sprites.css', css);

  // 生成预览 HTML
  zip.file('preview.html', generatePreviewHtml(manifest));

  const content = await zip.generateAsync({ type: 'blob' });

  const link = document.createElement('a');
  link.download = 'asset-cutout-export.zip';
  link.href = URL.createObjectURL(content);
  link.click();

  hideLoading();
}
```

#### 步骤 2.3: 修改批量模式导出函数

**文件：** `src/modules/downloadManager.js`

**修改 `downloadAsZip` 函数：**
```javascript
async function downloadAsZip(files, namingResults) {
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');
  const allAssets = []; // 收集所有素材信息
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const baseName = namingResults.get(file.id) || file.name.replace(/\.[^.]+$/, '');
    const sourceData = file.processResult.processedImageData;

    if (file.processResult.assets && file.processResult.assets.length > 0) {
      for (let j = 0; j < file.processResult.assets.length; j++) {
        const asset = file.processResult.assets[j];
        // ... 提取像素逻辑 ...
        imagesFolder.file(assetFileName, blob);

        allAssets.push({
          name: `${baseName}_${String(j + 1).padStart(3, '0')}`,
          file: assetFileName,
          x: asset.x,
          y: asset.y,
          w: asset.w,
          h: asset.h,
          sourceImage: file.name
        });
      }
    }
  }

  // 生成 JSON 数据文件
  if (allAssets.length > 0) {
    const jsonHash = generateTexturePackerJson(
      allAssets,
      'batch-export.png',
      allAssets.reduce((max, a) => Math.max(max, a.x + a.w), 0),
      allAssets.reduce((max, a) => Math.max(max, a.y + a.h), 0)
    );
    zip.file('spritesheet.json', JSON.stringify(jsonHash, null, 2));

    const jsonArray = generateTexturePackerJsonArray(
      allAssets,
      'batch-export.png',
      // ... 同上 ...
    );
    zip.file('spritesheet-array.json', JSON.stringify(jsonArray, null, 2));
  }

  // ... 继续现有 ZIP 生成逻辑 ...
}
```

**新增 import：**
```javascript
import { generateTexturePackerJson, generateTexturePackerJsonArray, generateCssSprite } from '../utils/helpers.js';
```

#### 步骤 2.4: UI 增加导出格式选择

**文件：** `index.html`

**在导出区域新增：**
```html
<div class="control-group">
  <label>数据格式</label>
  <div class="checkbox-group">
    <label class="checkbox-row">
      <input type="checkbox" id="export-json-hash" checked> TexturePacker JSON (Hash)
    </label>
    <label class="checkbox-row">
      <input type="checkbox" id="export-json-array"> TexturePacker JSON (Array)
    </label>
    <label class="checkbox-row">
      <input type="checkbox" id="export-css"> CSS Sprite
    </label>
  </div>
</div>
```

---

### Phase 3: 双掩码策略（Phase 4 补完）

#### 步骤 3.1: Worker 中修改 `detectAssets`

**文件：** `src/workers/imageProcessor.js`

**当前代码（单掩码膨胀）：**
```javascript
const dilatedMask = dilateMask(mask, width, height, Math.floor(mergeDistance / 2));
const regions = findConnectedRegions(dilatedMask, width, height);
```

**修改为双掩码：**
```javascript
// 掩码 A：原始掩码
const originalMask = new Uint8Array(mask);

// 掩码 B：闭运算掩码（用于连通性）
const closedMask = closingMorphology(mask, width, height, 1);

// 在闭运算掩码上找区域
const regions = findConnectedRegions(closedMask, width, height);

// 对每个区域，从原始掩码精确提取像素
const preciseRegions = regions.map(region => {
  // 1. 收集闭运算区域内的原始前景像素作为种子
  const seeds = [];
  for (let y = region.minY; y <= region.maxY; y++) {
    for (let x = region.minX; x <= region.maxX; x++) {
      if (originalMask[y * width + x] === 1) {
        seeds.push({ x, y });
      }
    }
  }
  
  // 2. 8-连通 BFS，只收集原始前景像素
  const exactPixels = [];
  const visited = new Uint8Array(width * height);
  const queue = [...seeds];
  queue.forEach(p => visited[p.y * width + p.x] = 1);
  
  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    exactPixels.push([p.x, p.y]);
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = p.x + dx, ny = p.y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
            !visited[ny * width + nx] && originalMask[ny * width + nx] === 1) {
          visited[ny * width + nx] = 1;
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }
  
  // 3. 计算精确边界框
  let minX = width, maxX = 0, minY = height, maxY = 0;
  exactPixels.forEach(([px, py]) => {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  });
  
  return {
    minX, maxX, minY, maxY,
    pixels: exactPixels
  };
});
```

**新增 `closingMorphology` 函数：**
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

#### 步骤 3.2: UI 增加双掩码开关

**文件：** `index.html`

**在素材识别区域新增：**
```html
<div class="control-group">
  <label class="checkbox-row">
    <input type="checkbox" id="dual-mask-mode"> 双掩码模式（防止素材拆分）
  </label>
  <small class="hint">适用：藤蔓、链条等中间有镂空的素材</small>
</div>
```

#### 步骤 3.3: 单图模式事件监听

**文件：** `src/main.js`

**在 `detectAssets` 发送参数时添加：**
```javascript
worker.postMessage({
  type: 'detectAssets',
  data: {
    // ... 现有参数 ...
    dualMask: document.getElementById('dual-mask-mode').checked
  }
});
```

---

## 四、文件修改清单

| # | 文件 | 修改类型 | 修改内容 |
|---|---|---|---|
| 1 | `src/workers/imageProcessor.js` | 新增 | `smoothEdges` 函数 |
| 2 | `src/workers/imageProcessor.js` | 修改 | `processImage` 集成平滑参数 |
| 3 | `src/workers/imageProcessor.js` | 修改 | `detectAssets` 双掩码策略 |
| 4 | `src/workers/imageProcessor.js` | 新增 | `closingMorphology` 函数 |
| 5 | `src/utils/helpers.js` | 新增 | `generateTexturePackerJson` 等 3 个函数 |
| 6 | `index.html` | 新增 | 边缘平滑滑块、数据格式复选框、双掩码开关 |
| 7 | `src/styles/single-mode.css` | 新增 | `.hint` 样式 |
| 8 | `src/main.js` | 修改 | 平滑参数传递、JSON 导出逻辑 |
| 9 | `src/modules/downloadManager.js` | 修改 | 批量导出 JSON 数据 |
| 10 | `src/modules/processManager.js` | 修改 | 批量处理添加平滑参数 |

---

## 五、测试计划

### 5.1 功能测试

| # | 测试场景 | 预期结果 |
|---|---|---|
| 1 | 抠图后设置边缘平滑=1 | 素材边缘柔和，无锯齿 |
| 2 | 边缘平滑=3 | 边缘更柔和，但可能丢失细节 |
| 3 | 导出 ZIP | 包含 images/、spritesheet.json、spritesheet-array.json、sprites.css、preview.html |
| 4 | 取消勾选 JSON 格式 | ZIP 中不包含对应的 JSON 文件 |
| 5 | 藤蔓素材 + 双掩码 | 藤蔓不被拆成多个碎片 |
| 6 | 普通素材 + 双掩码 | 与单掩码效果一致 |

### 5.2 性能测试

| # | 测试场景 | 预期性能 |
|---|---|---|
| 1 | 1024x1024 边缘平滑 | < 1 秒 |
| 2 | 2048x2048 边缘平滑 | < 3 秒 |
| 3 | 双掩码策略（10个素材） | 比单掩码慢 20% 以内 |

---

## 六、实施顺序

| Phase | 内容 | 预估时间 | 优先级 |
|---|---|---|---|
| Phase 1 | 边缘平滑（Worker + UI） | 2h | P1 |
| Phase 2 | JSON 数据导出 | 3h | P1 |
| Phase 3 | 双掩码策略 | 2h | P2 |
| **总计** | | **~7h** | |

**建议顺序：** Phase 1 → Phase 2 → Phase 3

理由：
- Phase 1 和 Phase 2 是独立的功能，可以并行开发
- Phase 3 是对现有 `detectAssets` 的重构，需要更谨慎测试
