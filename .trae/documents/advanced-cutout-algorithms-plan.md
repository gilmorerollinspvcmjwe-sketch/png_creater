# 抠图算法增强计划

## 目标
在不改变现有 UI 布局的前提下，用最少的界面改动实现最大的算法增强。所有核心算法改进集中在 `imageProcessor.js`（Web Worker），UI 仅在现有控件区域内新增 1-2 个开关。

---

## 一、改进项总览

| 序号 | 改进项 | 改动文件 | UI 改动 | 难度 | 优先级 |
|------|--------|---------|---------|------|--------|
| 1 | Lab 色彩空间替代 RGB | imageProcessor.js | 无 | 中 | P0 |
| 2 | 距离变换 + 渐变羽化 | imageProcessor.js | 无（复用 edge-smooth） | 中 | P0 |
| 3 | 扫描线 Flood Fill | imageProcessor.js | 无 | 中 | P1 |
| 4 | Otsu 自适应阈值 | imageProcessor.js + index.html + main.js | 1 个复选框 | 低 | P1 |
| 5 | 形态学开运算 | imageProcessor.js | 无 | 低 | P1 |
| 6 | 直方图双峰检测 | imageProcessor.js | 无 | 低 | P2 |

---

## 二、每项改进的详细设计

### 改进 1：Lab 色彩空间替代 RGB 欧氏距离

**问题**：当前 `createSolidColorMask` 使用 RGB 欧氏距离 `√(ΔR²+ΔG²+ΔB²)`，但人眼对不同颜色的敏感度不同（对绿色最敏感、蓝色最不敏感）。例如浅蓝色背景和白色前景在 RGB 空间距离可能很大，但视觉上很接近，导致抠不干净。

**方案**：将颜色比较从 RGB 空间转到 CIE Lab 空间，使用 CIE76 公式 `√(ΔL²+Δa²+Δb²)`。Lab 空间中距离更接近人眼感知。

**改动范围**：仅 `src/workers/imageProcessor.js`

**实现步骤**：

1. 在 Worker 文件顶部新增 `rgbToLab(r, g, b)` 函数
   - 先 RGB → XYZ（sRGB 线性化 + D65 白点矩阵）
   - 再 XYZ → Lab（含立方根非线性变换）
   - 返回 `[L, a, b]`

2. 新增 `labDistance(lab1, lab2)` 函数
   - `√((L1-L2)² + (a1-a2)² + (b1-b2)²)`

3. 修改 `createSolidColorMask()` 函数
   - 将 `targetColor` 预先转为 Lab
   - 循环内每个像素 RGB → Lab → 计算距离
   - **性能优化**：对 256×256×256 的 RGB 空间预计算查找表（LUT），Worker 内一次性算好 `rgbToLabLut`，后续直接查表，避免每像素做浮点运算。内存约 48MB（3×4字节×16M），可能过大。
   - **折中方案**：只预计算量化后的 LUT（每通道 32 级，32³=32768 项，约 384KB），精度足够。

4. 同步修改以下使用 RGB 距离的函数：
   - `createCheckerboardMask()` - 棋盘格背景匹配
   - `isColorCloseTo()` - 颜色近似判断
   - `irregularDetect()` 内的颜色比较逻辑

5. `colorUtils.js` 中的 `colorDistance()` 也同步改为 Lab 版本（供其他模块使用）

**传参不变**：`tolerance` 参数含义从"RGB 距离阈值"变为"Lab 距离阈值"。Lab 距离范围大约 0-100（纯白到纯黑约 100），需要调整 `tolerance` 的默认值和范围。**兼容方案**：在 Worker 内部自动换算，`labTolerance = tolerance * 100 / 441`（441 是 RGB 最大欧氏距离 √(255²×3)），用户无需改变操作习惯。

**预计算 LUT 详细方案**：
```
// 在 Worker 全局作用域，收到第一条 processImage 消息时初始化
let labLut = null; // Float32Array, 32*32*32*3 = 98304 个 float

function initLabLut() {
  labLut = new Float32Array(32 * 32 * 32 * 3);
  for (let ri = 0; ri < 32; ri++) {
    for (let gi = 0; gi < 32; gi++) {
      for (let bi = 0; bi < 32; bi++) {
        const r = ri * 8; // 量化: 0,8,16,...,248
        const g = gi * 8;
        const b = bi * 8;
        const [L, a, bLab] = rgbToLab(r, g, b);
        const idx = (ri * 32 * 32 + gi * 32 + bi) * 3;
        labLut[idx] = L;
        labLut[idx + 1] = a;
        labLut[idx + 2] = bLab;
      }
    }
  }
}

// 查表函数
function getLabFromLut(r, g, b) {
  const ri = r >> 3, gi = g >> 3, bi = b >> 3; // 等价于 Math.floor(x/8)
  const idx = (ri * 32 * 32 + gi * 32 + bi) * 3;
  return [labLut[idx], labLut[idx+1], labLut[idx+2]];
}
```

---

### 改进 2：距离变换 + 渐变羽化（替代当前 smoothEdges）

**问题**：当前 `smoothEdges()` 找到边界像素后，用邻域内前景/背景比例计算 alpha。这种方法只在边界 1px 处生效，且对所有边界像素一视同仁，导致过渡带很窄、生硬。`edge-smooth` 参数只是控制邻域半径，效果有限。

**方案**：引入距离变换（Distance Transform），计算每个前景像素到最近背景像素的距离，然后在边缘过渡带内根据距离做线性/平滑 alpha 渐变。过渡带宽度由用户控制。

**改动范围**：仅 `src/workers/imageProcessor.js`，UI 不变（复用现有 `edge-smooth` 滑块）

**实现步骤**：

1. 新增 `distanceTransform(bgMask, width, height)` 函数
   - 对 bgMask=1（背景）的像素距离为 0
   - 对 bgMask=0（前景）的像素，计算到最近背景像素的欧氏距离
   - 使用两遍扫描算法（forward pass + backward pass），时间复杂度 O(n)
   - 参考 Felzenszwalb & Huttenlocher 2004 的算法
   - 返回 `Float32Array`，每个元素是到最近背景像素的距离

2. 修改 `smoothEdges()` 函数
   - 替换原有逻辑为：
     ```
     1. 调用 distanceTransform 得到距离图
     2. edgeWidth 参数映射为过渡带宽度（edgeSmooth=1→3px, 2→6px, 3→10px）
     3. 对距离 < transitionWidth 的前景像素：
        alpha = clamp(distance / transitionWidth, 0, 1) * 255
        （使用 smoothstep 函数: t*t*(3-2t) 让过渡更自然）
     4. 距离 >= transitionWidth 的像素保持原 alpha=255
     5. 距离 = 0 的像素（背景）保持 alpha=0
     ```

3. 保留原有 `smoothEdges` 作为 `smoothEdgesLegacy` 以防回退

**关键代码结构**：
```javascript
function distanceTransform(mask, width, height) {
  const dist = new Float32Array(width * height);
  // 初始化：背景距离=0，前景距离=∞
  for (let i = 0; i < mask.length; i++) {
    dist[i] = mask[i] === 1 ? 0 : 1e6;
  }
  // Forward pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // 检查左、上、左上、右上邻居
      // 更新最短距离
    }
  }
  // Backward pass
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      // 检查右、下、左下、右下邻居
      // 更新最短距离
    }
  }
  return dist;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function smoothEdges(pixelData, bgMask, width, height, edgeSmooth) {
  const result = new Uint8ClampedArray(pixelData);
  const dist = distanceTransform(bgMask, width, height);
  const transitionWidth = [0, 3, 6, 10][Math.min(edgeSmooth, 3)];

  for (let i = 0; i < dist.length; i++) {
    if (bgMask[i] === 0 && dist[i] < transitionWidth) {
      const alpha = smoothstep(dist[i] / transitionWidth) * 255;
      result[i * 4 + 3] = Math.round(alpha);
    }
  }
  return result;
}
```

---

### 改进 3：扫描线 Flood Fill（替代 irregularDetect 中的 BFS）

**问题**：`irregularDetect()` 中的 `floodFillFromBorder` 使用 BFS 队列逐像素填充。当图片很大（如 4000×3000）且大面积背景时，队列操作（push/pop）开销大，内存占用高。

**方案**：用扫描线填充（Scanline Flood Fill）替代 BFS。扫描线每次处理一整行连续的同色像素，大幅减少循环次数。

**改动范围**：仅 `src/workers/imageProcessor.js` 中的 `floodFillFromBorder()` 函数

**实现步骤**：

1. 重写 `floodFillFromBorder(data, width, height, bgColor, tolerance)` 函数
   - 从四条边界的像素开始
   - 使用栈存储待处理的扫描线段 `{y, xLeft, xRight}`
   - 对每个扫描线段：
     a. 向左右扩展找到整段连续的背景色像素
     b. 检查上一行和下一行对应范围内是否有需要填充的段
     c. 将新段压栈
   - 标记填充区域为 `bgMask[idx] = 1`

2. 颜色比较使用改进 1 的 Lab 距离（如果已实现）

**关键代码结构**：
```javascript
function floodFillFromBorder(data, width, height, bgColor, tolerance) {
  const bgMask = new Uint8Array(width * height);
  const labBg = rgbToLab(bgColor[0], bgColor[1], bgColor[2]);

  function isBgColor(x, y) {
    const idx = (y * width + x) * 4;
    const lab = getLabFromLut(data[idx], data[idx+1], data[idx+2]);
    return labDistance(lab, labBg) < tolerance;
  }

  // 初始化：四条边所有像素作为种子
  const stack = [];
  for (let x = 0; x < width; x++) {
    if (isBgColor(x, 0)) stack.push({ y: 0, xl: x, xr: x });
    if (height > 1 && isBgColor(x, height-1)) stack.push({ y: height-1, xl: x, xr: x });
  }
  for (let y = 1; y < height - 1; y++) {
    if (isBgColor(0, y)) stack.push({ y, xl: 0, xr: 0 });
    if (width > 1 && isBgColor(width-1, y)) stack.push({ y, xl: width-1, xr: width-1 });
  }

  while (stack.length > 0) {
    const { y, xl, xr } = stack.pop();
    // 向左右扩展 xl, xr
    // 标记 bgMask
    // 检查 y-1 和 y+1 行对应范围内是否有新段
    // 去重（已标记的跳过）
  }
  return bgMask;
}
```

---

### 改进 4：Otsu 自适应阈值（自动容差）

**问题**：用户需要手动调节"容差"滑块。对大多数图片，白底/纯色底的容差不需要精确调参，可以用算法自动找到最佳分界点。

**方案**：用 Otsu 方法分析颜色距离的直方图，自动计算将前景/背景区分开的最佳阈值。当用户勾选"智能容差"时，忽略手动值。

**改动范围**：
- `src/workers/imageProcessor.js` - 新增 `otsuThreshold()` 函数
- `index.html` - 在"容差"滑块下方新增 1 个复选框
- `src/main.js` - 传递新参数到 Worker

**实现步骤**：

1. Worker 内新增 `otsuAutoThreshold(data, width, height, bgColor)` 函数
   - 计算每个像素到背景色的 Lab 距离（0-100 范围）
   - 构建 256-bin 直方图（将距离量化到 0-255）
   - 遍历所有可能的阈值 t（0-255），计算类间方差
   - 返回使类间方差最大的 t 作为最佳阈值

2. 修改 `processImage()` 函数
   - 新增参数 `autoTolerance`
   - 在 `bgMode='auto'` 或 `bgMode='white'` 时，如果 `autoTolerance=true`：
     先用采样像素计算 Otsu 阈值，替代传入的 tolerance

3. HTML 改动（在 `#tolerance` 滑块的 `.control-group` 内部追加）
   ```html
   <label class="checkbox-row" style="margin-top:4px">
     <input type="checkbox" id="auto-tolerance">
     智能容差
     <span class="tooltip-icon" title="自动分析图片，计算最佳容差值&#10;适合大部分白底/纯色底图片&#10;勾选后忽略手动容差值">?</span>
   </label>
   ```

4. main.js 改动
   - `processNormal()` 中读取 `document.getElementById('auto-tolerance').checked`
   - 传入 worker 消息 `autoTolerance: true/false`

**UI 影响**：仅在现有"容差"控件下方新增 1 行复选框，不增加任何新的滑块或面板。

---

### 改进 5：形态学开运算（Mask 预处理）

**问题**：当前处理流程是先创建 mask → 膨胀/腐蚀 → 去边 → 平滑。mask 上可能有小的噪点（孤立像素）和毛刺边缘，直接做膨胀/腐蚀无法消除。

**方案**：在 mask 创建后、膨胀/腐蚀前，增加一次开运算（先腐蚀后膨胀），消除小噪点和平滑边缘。

**改动范围**：仅 `src/workers/imageProcessor.js`

**实现步骤**：

1. 在 `processImage()` 中，bgMask 创建后、`applyForegroundMorphology` 前，插入开运算
   ```javascript
   // 消除 mask 上的小噪点
   bgMask = openMorphology(bgMask, width, height, 1);
   ```

2. 新增 `openMorphology(mask, width, height, radius)` 函数（或复用已有的 morphologicalOps.js 中的逻辑）
   - 先腐蚀 radius 像素（消除小岛）
   - 再膨胀 radius 像素（恢复主体形状）
   - Worker 内已有 `closingMorphology`，对应新增 `openingMorphology`

3. 开运算默认开启（radius=1），不需要用户控制，因为这是纯正向的预处理

**注意**：开运算会吃掉细线和尖角，radius=1 比较安全。如果将来需要更激进的清理，可以将 radius 暴露为参数。

---

### 改进 6：直方图双峰检测（背景色自动选择增强）

**问题**：`detectAndCreateMask()` 中的 `sampleCornerColors` 只采样边框像素。如果边框恰好有前景物体的边缘，采样结果不准确。且 `getMostCommonColor` 用量化 30 级粗糙，容易选错。

**方案**：结合边框采样和全图亮度直方图分析。如果直方图呈明显双峰（暗峰=前景，亮峰=背景），自动取亮峰作为背景色。

**改动范围**：仅 `src/workers/imageProcessor.js`

**实现步骤**：

1. 新增 `analyzeHistogram(data, width, height)` 函数
   - 计算全图亮度直方图（256 bins）
   - 用简单平滑（3-bin 移动平均）降噪
   - 找两个最高峰（双峰）
   - 如果双峰间距 > 30 且两峰高度 > 总像素 5%，认为是有效双峰
   - 返回 `{ hasBimodal: true, darkPeak, lightPeak, threshold }`

2. 修改 `detectAndCreateMask()` 函数
   - 在现有逻辑前先做直方图分析
   - 如果检测到双峰：用亮峰对应的灰度值辅助确认背景色
   - 如果边框采样和双峰分析一致，提高置信度
   - 如果冲突，优先信任双峰分析（更全局）

3. 这个改进和 Otsu 阈值配合使用效果更好

---

## 三、与现有项目的耦合方式

### Worker 消息协议（不变）

```
// 现有消息
postMessage({ type: 'processImage', data: { ... } })

// 新增字段（向后兼容，都有默认值）
data.autoTolerance = false  // 改进 4
```

### 数据流（改进后）

```
processImage 入口
  ↓
[改进6] 直方图分析（辅助背景色检测）
  ↓
detectAndCreateMask（背景检测）
  ↓ [改进1] Lab 色彩空间替代 RGB
  ↓
[改进5] 形态学开运算（去噪点）
  ↓
applyForegroundMorphology（膨胀/腐蚀，不变）
  ↓
背景像素设为透明（不变）
  ↓
applyEdgeRemoval（去边，不变）
  ↓
[改进2] 距离变换 + 渐变羽化（替代原 smoothEdges）
  ↓
返回结果
```

### irregularDetect 流程

```
irregularDetect 入口
  ↓
[改进3] 扫描线 Flood Fill（替代 BFS）
  ↓ [改进1] Lab 色彩空间
  ↓
后续连通域分析（不变）
```

---

## 四、UI 改动方案（最小化）

### 现有控件不变
- 背景模式、容差滑块、去边强度、膨胀/腐蚀、边缘平滑 —— 全部保持原样
- 素材识别控件 —— 不变
- 异形抠图控件 —— 不变

### 新增 UI 元素（仅 1 个复选框）

位置：`index.html` 中 `#tolerance` 滑块的 `.control-group` 内部，紧跟在 `<input type="range" id="tolerance" ...>` 下方

```html
<label class="checkbox-row" style="margin-top:4px">
  <input type="checkbox" id="auto-tolerance">
  智能容差
  <span class="tooltip-icon" title="自动分析图片颜色分布，计算最佳容差&#10;适合白底/纯色底图片&#10;勾选后手动容差值被忽略">?</span>
</label>
```

### 不需要新增的 UI
- Lab 色彩空间 → 算法内部替换，用户无感
- 距离变换羽化 → 复用现有"边缘平滑"滑块，效果更好但控件不变
- 扫描线填充 → 内部优化，用户无感
- 形态学开运算 → 默认开启，用户无感
- 直方图分析 → 辅助背景检测，用户无感

---

## 五、实施顺序和依赖关系

```
第一阶段（基础，无依赖）：
  ├── 改进 1: Lab 色彩空间 ← 最基础，其他改进都受益
  └── 改进 5: 形态学开运算 ← 最简单，几行代码

第二阶段（依赖改进 1）：
  ├── 改进 2: 距离变换 + 羽化
  └── 改进 3: 扫描线 Flood Fill（可选，如果性能不是瓶颈可跳过）

第三阶段（依赖改进 1）：
  ├── 改进 4: Otsu 自适应阈值
  └── 改进 6: 直方图双峰检测
```

---

## 六、风险和注意事项

1. **Lab LUT 内存**：32 级量化 LUT 约 384KB，Worker 内可接受。如果内存敏感可降到 16 级。
2. **tolerance 语义变化**：改用 Lab 后，原来 tolerance=80 对应的"范围"会变化。需要在 Worker 内做自动映射，确保用户体验连续。
3. **距离变换性能**：4000×3000 图片的距离变换约 1200 万像素，两遍扫描 O(n)，在 Worker 中预计 50-100ms，可接受。
4. **开运算对细线的影响**：radius=1 的开运算可能吃掉 1px 宽的线条。对于游戏 UI 素材一般不会有问题。
5. **向后兼容**：所有新增参数都有默认值，旧的调用方式不受影响。

---

## 七、涉及文件清单

| 文件 | 改动类型 | 改动内容 |
|------|---------|---------|
| `src/workers/imageProcessor.js` | 主要改动 | 新增 Lab 转换、距离变换、扫描线填充、Otsu、开运算、直方图分析；修改 createSolidColorMask、smoothEdges、floodFillFromBorder、detectAndCreateMask、processImage |
| `src/utils/colorUtils.js` | 小改动 | colorDistance 改为 Lab 版本 |
| `index.html` | 极小改动 | 新增 1 个复选框 |
| `src/main.js` | 小改动 | processNormal 中读取 autoTolerance 并传给 Worker |
