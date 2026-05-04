self.onmessage = function(e) {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'processImage':
        console.log('Worker: 开始处理图片');
        const result = processImage(data);
        console.log('Worker: 图片处理完成');
        self.postMessage({ type: 'processImageResult', result });
        break;
      case 'detectAssets':
        console.log('Worker: 开始识别素材');
        const assets = detectAssets(data);
        console.log('Worker: 素材识别完成, 找到', assets.length, '个');
        self.postMessage({ type: 'detectAssetsResult', assets });
        break;
      case 'irregularDetect':
        console.log('Worker: 开始异形检测');
        const regions = irregularDetect(data);
        console.log('Worker: 异形检测完成, 找到', regions.length, '个区域');
        self.postMessage({ type: 'irregularDetectResult', regions });
        break;
      case 'innerContourRemove':
        console.log('Worker: 开始内轮廓抠图');
        const updatedRegions = innerContourRemove(data);
        self.postMessage({ type: 'innerContourRemoveResult', regions: updatedRegions });
        break;
      case 'trimTransparent':
        const trimmed = trimTransparent(data);
        self.postMessage({ type: 'trimTransparentResult', result: trimmed });
        break;
    }
  } catch (error) {
    console.error('Worker 错误:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
};

const REGION_COLORS = [
  '#e94560','#3fb950','#58a6ff','#d29922','#bc8cff',
  '#00bcd4','#ff6d00','#64dd17','#d500f9','#304ffe',
  '#ff1744','#00e676','#2979ff','#ffc400','#d500f9',
  '#18ffff','#ff9100','#76ff03','#ea80fc','#448aff',
];

// ==================== Lab 色彩空间工具 ====================
// sRGB → 线性 RGB
function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// RGB → XYZ（D65 白点）
function rgbToXyz(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return [
    0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb,
    0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb,
    0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb
  ];
}

// XYZ → Lab
function xyzToLab(x, y, z) {
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  const fx = x / Xn > 0.008856 ? Math.cbrt(x / Xn) : (7.787 * (x / Xn)) + 16 / 116;
  const fy = y / Yn > 0.008856 ? Math.cbrt(y / Yn) : (7.787 * (y / Yn)) + 16 / 116;
  const fz = z / Zn > 0.008856 ? Math.cbrt(z / Zn) : (7.787 * (z / Zn)) + 16 / 116;
  return [
    116 * fy - 16,
    500 * (fx - fy),
    200 * (fy - fz)
  ];
}

// RGB → Lab（完整转换）
function rgbToLab(r, g, b) {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

// Lab 预计算查找表（每通道 32 级，32³=32768 项，约 384KB）
let labLut = null;

function initLabLut() {
  if (labLut) return;
  labLut = new Float32Array(32 * 32 * 32 * 3);
  for (let ri = 0; ri < 32; ri++) {
    for (let gi = 0; gi < 32; gi++) {
      for (let bi = 0; bi < 32; bi++) {
        const r = ri * 8;
        const g = gi * 8;
        const b = bi * 8;
        const [L, a, bL] = rgbToLab(r, g, b);
        const idx = (ri * 32 * 32 + gi * 32 + bi) * 3;
        labLut[idx] = L;
        labLut[idx + 1] = a;
        labLut[idx + 2] = bL;
      }
    }
  }
  console.log('Lab LUT 初始化完成（32级量化）');
}

// 从 LUT 查找 Lab 值（量化到 32 级）
function getLabFromLut(r, g, b) {
  const ri = r >> 3, gi = g >> 3, bi = b >> 3;
  const idx = (ri * 32 * 32 + gi * 32 + bi) * 3;
  return [labLut[idx], labLut[idx + 1], labLut[idx + 2]];
}

// Lab 色彩距离（CIE76）
function labDistance(lab1, lab2) {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

// 将 RGB 空间的 tolerance 映射到 Lab 空间
// RGB 最大欧氏距离 ≈ 441.67，Lab 最大实用距离 ≈ 100
function mapToleranceToLab(rgbTolerance) {
  return rgbTolerance * 100 / 441.67;
}

// ==================== 距离变换 + 渐变羽化 ====================
// Felzenszwalb & Huttenlocher 2004 两遍扫描算法
function distanceTransform(mask, width, height) {
  const INF = 1e6;
  const dist = new Float32Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    dist[i] = mask[i] === 1 ? 0 : INF;
  }
  // Forward pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (x > 0) dist[idx] = Math.min(dist[idx], dist[idx - 1] + 1);
      if (y > 0) dist[idx] = Math.min(dist[idx], dist[idx - width] + 1);
      if (x > 0 && y > 0) dist[idx] = Math.min(dist[idx], dist[idx - width - 1] + 1.414);
      if (x < width - 1 && y > 0) dist[idx] = Math.min(dist[idx], dist[idx - width + 1] + 1.414);
    }
  }
  // Backward pass
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const idx = y * width + x;
      if (x < width - 1) dist[idx] = Math.min(dist[idx], dist[idx + 1] + 1);
      if (y < height - 1) dist[idx] = Math.min(dist[idx], dist[idx + width] + 1);
      if (x < width - 1 && y < height - 1) dist[idx] = Math.min(dist[idx], dist[idx + width + 1] + 1.414);
      if (x > 0 && y < height - 1) dist[idx] = Math.min(dist[idx], dist[idx + width - 1] + 1.414);
    }
  }
  return dist;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

// ==================== 形态学开运算 ====================
function openingMorphology(mask, width, height, iterations) {
  const result = new Uint8Array(mask);
  // 先腐蚀
  for (let i = 0; i < iterations; i++) {
    const eroded = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (result[y * width + x] === 0) { eroded[y * width + x] = 0; continue; }
        let allFg = true;
        for (let dy = -1; dy <= 1 && allFg; dy++) {
          for (let dx = -1; dx <= 1 && allFg; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height || result[ny * width + nx] === 0) {
              allFg = false;
            }
          }
        }
        eroded[y * width + x] = allFg ? 1 : 0;
      }
    }
    result.set(eroded);
  }
  // 再膨胀
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
  return result;
}

// ==================== Watershed 分水岭分割 ====================
// 对粘连的前景区域做分水岭拆分，返回拆分后的子区域列表
function watershedSplit(mask, width, height, regionBounds) {
  const { minX, minY, maxX, maxY } = regionBounds;
  const localW = maxX - minX + 1;
  const localH = maxY - minY + 1;
  if (localW < 10 || localH < 10) return null;

  // 提取局部 mask
  const localMask = new Uint8Array(localW * localH);
  for (let ly = 0; ly < localH; ly++) {
    for (let lx = 0; lx < localW; lx++) {
      localMask[ly * localW + lx] = mask[(ly + minY) * width + (lx + minX)];
    }
  }

  // 计算距离变换
  const dist = distanceTransform(localMask, localW, localH);

  // 找局部极大值作为标记点（窗口 15x15）
  const peakWindowSize = 15;
  const halfWin = Math.floor(peakWindowSize / 2);
  const markers = new Int32Array(localW * localH);
  let markerCount = 0;

  for (let ly = halfWin; ly < localH - halfWin; ly += peakWindowSize) {
    for (let lx = halfWin; lx < localW - halfWin; lx += peakWindowSize) {
      const centerIdx = ly * localW + lx;
      if (localMask[centerIdx] === 0 || dist[centerIdx] < 3) continue;

      let isMax = true;
      let maxVal = dist[centerIdx];
      let maxIdx = centerIdx;

      for (let dy = -halfWin; dy <= halfWin && isMax; dy++) {
        for (let dx = -halfWin; dx <= halfWin; dx++) {
          const ny = ly + dy, nx = lx + dx;
          if (ny < 0 || ny >= localH || nx < 0 || nx >= localW) continue;
          const nIdx = ny * localW + nx;
          if (localMask[nIdx] === 0) continue;
          if (dist[nIdx] > maxVal) {
            isMax = false;
            break;
          }
          if (dist[nIdx] === maxVal && nIdx !== centerIdx) {
            // 保留第一个
          }
        }
      }

      if (isMax && maxVal > 2) {
        markerCount++;
        markers[centerIdx] = markerCount;
      }
    }
  }

  // 如果只有 0 或 1 个标记，不需要分割
  if (markerCount <= 1) return null;

  // 从标记点开始，按距离值从高到低扩展（模拟 watershed）
  // 使用优先队列（桶排序，因为距离值是有限范围）
  const maxDist = Math.ceil(Math.max(...dist));
  const buckets = Array.from({ length: maxDist + 1 }, () => []);
  const labels = new Int32Array(localW * localH);

  // 初始化：标记点入桶
  for (let i = 0; i < localW * localH; i++) {
    if (markers[i] > 0) {
      labels[i] = markers[i];
      const d = Math.min(Math.floor(dist[i]), maxDist);
      buckets[d].push(i);
    }
  }

  // 从高距离值到低距离值扩展
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let d = maxDist; d >= 0; d--) {
    const bucket = buckets[d];
    while (bucket.length > 0) {
      const idx = bucket.pop();
      const cy = Math.floor(idx / localW);
      const cx = idx % localW;
      const currentLabel = labels[idx];

      for (const [dy, dx] of dirs) {
        const ny = cy + dy, nx = cx + dx;
        if (ny < 0 || ny >= localH || nx < 0 || nx >= localW) continue;
        const nIdx = ny * localW + nx;
        if (localMask[nIdx] === 0) continue;
        if (labels[nIdx] === 0) {
          labels[nIdx] = currentLabel;
          const nd = Math.min(Math.floor(dist[nIdx]), maxDist);
          if (nd < d) {
            buckets[nd].push(nIdx);
          } else {
            buckets[d].push(nIdx);
          }
        }
      }
    }
  }

  // 将未标记的前景像素分配给最近的标记
  for (let i = 0; i < localW * localH; i++) {
    if (localMask[i] === 1 && labels[i] === 0) {
      labels[i] = 1; // 默认归到第一个标记
    }
  }

  // 提取拆分后的子区域
  const subRegions = [];
  for (let m = 1; m <= markerCount; m++) {
    let sMinX = localW, sMaxX = 0, sMinY = localH, sMaxY = 0;
    let pixelCount = 0;
    for (let ly = 0; ly < localH; ly++) {
      for (let lx = 0; lx < localW; lx++) {
        if (labels[ly * localW + lx] === m) {
          pixelCount++;
          if (lx < sMinX) sMinX = lx;
          if (lx > sMaxX) sMaxX = lx;
          if (ly < sMinY) sMinY = ly;
          if (ly > sMaxY) sMaxY = ly;
        }
      }
    }
    if (pixelCount > 0) {
      subRegions.push({
        minX: sMinX + minX,
        minY: sMinY + minY,
        maxX: sMaxX + minX,
        maxY: sMaxY + minY,
        label: m
      });
    }
  }

  return subRegions.length > 1 ? subRegions : null;
}

// ==================== 边缘检测 + 区域生长 ====================
function detectEdgesFromImage(pixelData, width, height, threshold) {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const pi = i * 4;
    gray[i] = 0.299 * pixelData[pi] + 0.587 * pixelData[pi + 1] + 0.114 * pixelData[pi + 2];
  }

  const gx = new Float32Array(width * height);
  const gy = new Float32Array(width * height);
  const mag = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      gx[idx] = (-gray[(y - 1) * width + x - 1] + gray[(y - 1) * width + x + 1]
        - 2 * gray[y * width + x - 1] + 2 * gray[y * width + x + 1]
        - gray[(y + 1) * width + x - 1] + gray[(y + 1) * width + x + 1]);
      gy[idx] = (-gray[(y - 1) * width + x - 1] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + x + 1]
        + gray[(y + 1) * width + x - 1] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + x + 1]);
      mag[idx] = Math.sqrt(gx[idx] * gx[idx] + gy[idx] * gy[idx]);
    }
  }

  const nms = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = Math.atan2(gy[idx], gx[idx]) * 180 / Math.PI;
      let n1 = 0, n2 = 0;
      if ((-22.5 <= angle && angle < 22.5) || (157.5 <= angle || angle < -157.5)) {
        n1 = mag[idx - 1]; n2 = mag[idx + 1];
      } else if ((22.5 <= angle && angle < 67.5) || (-157.5 <= angle && angle < -112.5)) {
        n1 = mag[(y - 1) * width + x + 1]; n2 = mag[(y + 1) * width + x - 1];
      } else if ((67.5 <= angle && angle < 112.5) || (-112.5 <= angle && angle < -67.5)) {
        n1 = mag[(y - 1) * width + x]; n2 = mag[(y + 1) * width + x];
      } else {
        n1 = mag[(y - 1) * width + x - 1]; n2 = mag[(y + 1) * width + x + 1];
      }
      if (mag[idx] >= n1 && mag[idx] >= n2) nms[idx] = mag[idx];
    }
  }

  const edgeMap = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    edgeMap[i] = nms[i] > threshold ? 1 : 0;
  }
  return edgeMap;
}

function edgeBasedRegionGrow(edgeMap, width, height) {
  const labels = new Int32Array(width * height);
  let regionCount = 0;
  const queue = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (edgeMap[idx] === 1 || labels[idx] !== 0) continue;

      regionCount++;
      labels[idx] = regionCount;
      queue.length = 0;
      queue.push(x, y);
      let head = 0;

      while (head < queue.length) {
        const cx = queue[head++];
        const cy = queue[head++];
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const nIdx = ny * width + nx;
            if (edgeMap[nIdx] === 1 || labels[nIdx] !== 0) continue;
            labels[nIdx] = regionCount;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  const regions = [];
  for (let r = 1; r <= regionCount; r++) {
    let minX = width, maxX = 0, minY = height, maxY = 0, pixelCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (labels[y * width + x] === r) {
          pixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (pixelCount > 0) regions.push({ minX, minY, maxX, maxY, pixelCount, label: r });
  }
  return { regions, labels };
}

function detectAssetsByEdges(imageData, bgMask, mergeDistance, minArea) {
  const { width, height, data } = imageData;
  const pixelData = new Uint8ClampedArray(data);
  const edgeMap = detectEdgesFromImage(pixelData, width, height, 25);
  const { regions, labels } = edgeBasedRegionGrow(edgeMap, width, height);

  const bgThreshold = 0.6;
  const filteredRegions = [];

  for (const region of regions) {
    const rw = region.maxX - region.minX + 1;
    const rh = region.maxY - region.minY + 1;
    if (rw * rh < minArea) continue;

    let bgCount = 0, totalSamples = 0;
    const step = Math.max(3, Math.floor(Math.max(rw, rh) / 20));
    for (let y = region.minY; y <= region.maxY; y += step) {
      for (let x = region.minX; x <= region.maxX; x += step) {
        const idx = y * width + x;
        if (labels[idx] !== region.label) continue;
        totalSamples++;
        if (bgMask[idx] === 1) bgCount++;
      }
    }
    if (totalSamples > 0 && bgCount / totalSamples > bgThreshold) continue;
    filteredRegions.push(region);
  }

  const merged = mergeNearbyRegions(filteredRegions, mergeDistance);
  console.log('边缘检测识别到', filteredRegions.length, '个区域，合并后', merged.length, '个');
  return merged;
}

function mergeNearbyRegions(regions, mergeDistance) {
  if (regions.length <= 1 || mergeDistance === 0) return regions;

  const assigned = new Uint8Array(regions.length);
  const groups = [];

  for (let i = 0; i < regions.length; i++) {
    if (assigned[i]) continue;
    const group = [regions[i]];
    assigned[i] = 1;
    for (let j = i + 1; j < regions.length; j++) {
      if (assigned[j]) continue;
      if (regionsTouchOrNear(regions[i], regions[j], mergeDistance)) {
        assigned[j] = 1;
        group.push(regions[j]);
      }
    }
    groups.push(group);
  }

  return groups.map(group => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, totalPixels = 0;
    for (const r of group) {
      if (r.minX < minX) minX = r.minX;
      if (r.maxX > maxX) maxX = r.maxX;
      if (r.minY < minY) minY = r.minY;
      if (r.maxY > maxY) maxY = r.maxY;
      totalPixels += r.pixelCount;
    }
    return { minX, minY, maxX, maxY, pixelCount: totalPixels };
  });
}

function regionsTouchOrNear(a, b, dist) {
  const dx = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX));
  const dy = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY));
  return Math.sqrt(dx * dx + dy * dy) <= dist;
}

// ==================== Otsu 自适应阈值 ====================
function otsuAutoThreshold(data, width, height, bgColor) {
  initLabLut();
  const labBg = getLabFromLut(bgColor[0], bgColor[1], bgColor[2]);

  // Step 1: 边框采样，只取接近背景色的点
  const borderDists = [];
  const borderWidth = Math.max(10, Math.floor(Math.min(width, height) * 0.04));
  const step = Math.max(2, Math.floor(Math.min(width, height) / 150));

  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < borderWidth; y += step) {
      const idx = (y * width + x) * 4;
      const lab = getLabFromLut(data[idx], data[idx + 1], data[idx + 2]);
      borderDists.push(labDistance(lab, labBg));
    }
    for (let y = Math.max(0, height - borderWidth); y < height; y += step) {
      const idx = (y * width + x) * 4;
      const lab = getLabFromLut(data[idx], data[idx + 1], data[idx + 2]);
      borderDists.push(labDistance(lab, labBg));
    }
  }
  for (let y = borderWidth; y < height - borderWidth; y += step) {
    for (let x = 0; x < borderWidth; x += step) {
      const idx = (y * width + x) * 4;
      const lab = getLabFromLut(data[idx], data[idx + 1], data[idx + 2]);
      borderDists.push(labDistance(lab, labBg));
    }
    for (let x = Math.max(0, width - borderWidth); x < width; x += step) {
      const idx = (y * width + x) * 4;
      const lab = getLabFromLut(data[idx], data[idx + 1], data[idx + 2]);
      borderDists.push(labDistance(lab, labBg));
    }
  }

  // Step 2: 排序后去掉最远的 10%（排除前景元素）
  borderDists.sort((a, b) => a - b);
  const trimmed = borderDists.slice(0, Math.floor(borderDists.length * 0.9));

  // Step 3: 计算均值和标准差
  const mean = trimmed.reduce((s, d) => s + d, 0) / trimmed.length;
  const variance = trimmed.reduce((s, d) => s + (d - mean) * (d - mean), 0) / trimmed.length;
  const std = Math.sqrt(variance);

  // Step 4: 容差 = 均值 + 3.5*标准差（覆盖约99.9%的背景纹理）
  // 纹理背景（标准差大）自动加大容差
  let multiplier = 3.5;
  if (std > 8) multiplier = 4.0; // 纹理明显时更宽松
  if (std > 12) multiplier = 4.5; // 强纹理时更宽松
  const tolerance = mean + std * multiplier;

  console.log('智能容差: 均值=', mean.toFixed(2), '标准差=', std.toFixed(2), '系数=', multiplier, '自动容差=', tolerance.toFixed(2));
  return Math.max(tolerance, 20);
}

// ==================== 直方图双峰检测 ====================
function analyzeHistogram(data, width, height) {
  const lumHist = new Uint32Array(256);
  const step = (width * height) > 1000000 ? 4 : 1;
  for (let i = 0; i < data.length; i += 4 * step) {
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    lumHist[lum]++;
  }

  // 3-bin 移动平均平滑
  const smoothed = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    let sum = lumHist[i], count = 1;
    if (i > 0) { sum += lumHist[i - 1]; count++; }
    if (i < 255) { sum += lumHist[i + 1]; count++; }
    smoothed[i] = sum / count;
  }

  // 找最高峰
  let peak1 = 0, peak1Val = 0;
  for (let i = 0; i < 256; i++) {
    if (smoothed[i] > peak1Val) { peak1Val = smoothed[i]; peak1 = i; }
  }
  // 找第二峰（距第一峰 > 30）
  let peak2 = 0, peak2Val = 0;
  for (let i = 0; i < 256; i++) {
    if (Math.abs(i - peak1) < 30) continue;
    if (smoothed[i] > peak2Val) { peak2Val = smoothed[i]; peak2 = i; }
  }

  const totalSamples = histogramSum(smoothed);
  const hasBimodal = Math.abs(peak1 - peak2) > 30 &&
    peak1Val > totalSamples * 0.05 &&
    peak2Val > totalSamples * 0.05;

  const threshold = hasBimodal ? Math.round((peak1 + peak2) / 2) : 128;
  const darkPeak = Math.min(peak1, peak2);
  const lightPeak = Math.max(peak1, peak2);

  return { hasBimodal, darkPeak, lightPeak, threshold };
}

function histogramSum(h) {
  let s = 0;
  for (let i = 0; i < h.length; i++) s += h[i];
  return s;
}

function irregularDetect(data) {
  const { imageData, bgColor, outlineColor, outlineTolerance, sensitivity, minArea, dilatePx } = data;
  const { width, height, data: pixels } = imageData;
  const pixelData = new Uint8ClampedArray(pixels);

  initLabLut();

  const hasOutline = outlineColor !== null && outlineColor !== undefined;
  const labTol = mapToleranceToLab(sensitivity * 2.5);
  const labOutTol = hasOutline ? mapToleranceToLab((outlineTolerance || 80) * 2.5) : 0;
  const labBg = getLabFromLut(bgColor.r, bgColor.g, bgColor.b);
  const labOutline = hasOutline ? getLabFromLut(outlineColor.r, outlineColor.g, outlineColor.b) : null;

  const mask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const pi = i * 4;
    const lab = getLabFromLut(pixelData[pi], pixelData[pi + 1], pixelData[pi + 2]);

    if (hasOutline && labDistance(lab, labOutline) <= labOutTol) {
      mask[i] = 2;
      continue;
    }
    mask[i] = labDistance(lab, labBg) <= labTol ? 3 : 1;
  }

  for (let i = 0; i < width * height; i++) {
    if (mask[i] === 0) mask[i] = 3;
  }

  // 扫描线 Flood Fill 从边界开始标记背景区域
  const stack = [];
  for (let x = 0; x < width; x++) {
    if (mask[x] === 3) stack.push(0, x, x);
    const bIdx = (height - 1) * width + x;
    if (mask[bIdx] === 3) stack.push(height - 1, x, x);
  }
  for (let y = 1; y < height - 1; y++) {
    if (mask[y * width] === 3) stack.push(y, 0, 0);
    if (mask[y * width + width - 1] === 3) stack.push(y, width - 1, width - 1);
  }

  while (stack.length > 0) {
    let xr = stack.pop();
    let xl = stack.pop();
    const y = stack.pop();

    // 向左扩展
    while (xl > 0 && mask[y * width + xl - 1] === 3) xl--;
    // 向右扩展
    while (xr < width - 1 && mask[y * width + xr + 1] === 3) xr++;

    // 标记当前行
    for (let x = xl; x <= xr; x++) {
      mask[y * width + x] = 0;
    }

    // 检查上一行和下一行
    for (const dy of [-1, 1]) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      let x = xl;
      while (x <= xr) {
        // 跳过已标记的
        while (x <= xr && mask[ny * width + x] !== 3) x++;
        if (x > xr) break;
        const segStart = x;
        while (x <= xr && mask[ny * width + x] === 3) x++;
        stack.push(ny, segStart, x - 1);
      }
    }
  }

  for (let i = 0; i < width * height; i++) {
    if (mask[i] >= 1) mask[i] = 1;
  }

  if (dilatePx > 0) {
    for (let pass = 0; pass < dilatePx; pass++) {
      const dm = new Uint8Array(width * height);
      dm.set(mask);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (mask[y * width + x] === 1) continue;
          if ((x > 0 && mask[y * width + x - 1] === 1) || (x < width - 1 && mask[y * width + x + 1] === 1) ||
              (y > 0 && mask[(y - 1) * width + x] === 1) || (y < height - 1 && mask[(y + 1) * width + x] === 1)) {
            dm[y * width + x] = 1;
          }
        }
      }
      mask.set(dm);
    }
  } else if (dilatePx < 0) {
    const erodeN = -dilatePx;
    for (let pass = 0; pass < erodeN; pass++) {
      const em = new Uint8Array(width * height);
      em.set(mask);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (mask[y * width + x] === 0) continue;
          if ((x === 0 || mask[y * width + x - 1] === 0) || (x === width - 1 || mask[y * width + x + 1] === 0) ||
              (y === 0 || mask[(y - 1) * width + x] === 0) || (y === height - 1 || mask[(y + 1) * width + x] === 0)) {
            em[y * width + x] = 0;
          }
        }
      }
      mask.set(em);
    }
  }

  const closedMask = new Uint8Array(width * height);
  closedMask.set(mask);
  const dilated = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (closedMask[y * width + x] === 1) { dilated[y * width + x] = 1; continue; }
      let found = false;
      for (let dy = -1; dy <= 1 && !found; dy++) {
        for (let dx = -1; dx <= 1 && !found; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && closedMask[ny * width + nx] === 1) found = true;
        }
      }
      dilated[y * width + x] = found ? 1 : 0;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (dilated[y * width + x] === 0) continue;
      let allFg = true;
      for (let dy = -1; dy <= 1 && allFg; dy++) {
        for (let dx = -1; dx <= 1 && allFg; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && dilated[ny * width + nx] === 0) allFg = false;
        }
      }
      closedMask[y * width + x] = allFg ? 1 : 0;
    }
  }

  const regions = [];
  let regionId = 0;
  const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

  while (true) {
    let startX = -1, startY = -1;
    outer: for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (closedMask[y * width + x] === 1) { startX = x; startY = y; break outer; }
      }
    }
    if (startX === -1) break;

    const regionPixels = [];
    const queue = [startX, startY];
    let head = 0;
    closedMask[startY * width + startX] = 2;
    let minX = startX, maxX = startX, minY = startY, maxY = startY;

    while (head < queue.length) {
      const cx = queue[head++];
      const cy = queue[head++];
      regionPixels.push([cx, cy]);
      if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;

      for (let d = 0; d < 8; d++) {
        const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && closedMask[ny * width + nx] === 1) {
          closedMask[ny * width + nx] = 2;
          queue.push(nx, ny);
        }
      }
    }

    const exactPixels = [];
    const pixelSet = new Uint8Array(width * height);
    regionPixels.forEach(([px, py]) => { pixelSet[py * width + px] = 1; });

    const expandQueue = [];
    let expandHead = 0;
    const visited = new Uint8Array(width * height);
    regionPixels.forEach(([px, py]) => { visited[py * width + px] = 1; });

    regionPixels.forEach(([px, py]) => {
      if (mask[py * width + px] === 1) {
        exactPixels.push([px, py]);
      } else {
        expandQueue.push(px, py);
      }
    });

    while (expandHead < expandQueue.length) {
      const cx = expandQueue[expandHead++];
      const cy = expandQueue[expandHead++];
      for (let d = 0; d < 8; d++) {
        const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny * width + nx]) {
          visited[ny * width + nx] = 1;
          if (mask[ny * width + nx] === 1) {
            exactPixels.push([nx, ny]);
            expandQueue.push(nx, ny);
          }
        }
      }
    }

    const area = exactPixels.length;

    if (area >= minArea) {
      const exactPixelSet = new Uint8Array(width * height);
      exactPixels.forEach(([px, py]) => { exactPixelSet[py * width + px] = 1; });

      let eMinX = width, eMaxX = 0, eMinY = height, eMaxY = 0;
      exactPixels.forEach(([px, py]) => {
        if (px < eMinX) eMinX = px; if (px > eMaxX) eMaxX = px;
        if (py < eMinY) eMinY = py; if (py > eMaxY) eMaxY = py;
      });

      regions.push({
        id: regionId++,
        pixels: exactPixels,
        pixelSet: Array.from(exactPixelSet),
        bounds: { x: eMinX, y: eMinY, w: eMaxX - eMinX + 1, h: eMaxY - eMinY + 1 },
        area: area,
        color: REGION_COLORS[regions.length % REGION_COLORS.length],
      });
    }

    regionPixels.forEach(([px, py]) => { closedMask[py * width + px] = 0; });
    exactPixels.forEach(([px, py]) => { mask[py * width + px] = 0; });
  }

  return regions;
}

function innerContourRemove(data) {
  const { imageData, regions, selectedIndices, innerBgColor, innerOutlineColor, innerTolerance, innerDilatePx } = data;
  const { width, height, data: pixels } = imageData;
  const pixelData = new Uint8ClampedArray(pixels);
  const hasInnerOutline = innerOutlineColor !== null && innerOutlineColor !== undefined;
  const innerTol = mapToleranceToLab(innerTolerance * 2.5);
  const labInnerBg = getLabFromLut(innerBgColor.r, innerBgColor.g, innerBgColor.b);
  const labInnerOutline = hasInnerOutline ? getLabFromLut(innerOutlineColor.r, innerOutlineColor.g, innerOutlineColor.b) : null;
  const updatedRegions = [];

  for (let ri = 0; ri < regions.length; ri++) {
    const region = regions[ri];
    const updatedRegion = { ...region, pixels: [...region.pixels.map(p => [...p])] };

    if (!selectedIndices.includes(ri)) {
      updatedRegions.push(updatedRegion);
      continue;
    }

    const b = region.bounds;
    const localW = b.w, localH = b.h;
    const localMask = new Uint8Array(localW * localH);

    region.pixels.forEach(([px, py]) => {
      localMask[(py - b.y) * localW + (px - b.x)] = 1;
    });

    for (let ly = 0; ly < localH; ly++) {
      for (let lx = 0; lx < localW; lx++) {
        if (localMask[ly * localW + lx] !== 1) continue;
        const px = lx + b.x, py = ly + b.y;
        const pi = (py * width + px) * 4;
        const lab = getLabFromLut(pixelData[pi], pixelData[pi + 1], pixelData[pi + 2]);

        if (hasInnerOutline && labDistance(lab, labInnerOutline) <= innerTol * 0.8) {
          localMask[ly * localW + lx] = 3;
          continue;
        }
        if (labDistance(lab, labInnerBg) <= innerTol) {
          localMask[ly * localW + lx] = 2;
        }
      }
    }

    const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
    const queue = [];
    let head = 0;

    for (let lx = 0; lx < localW; lx++) {
      if (localMask[lx] === 2) { localMask[lx] = 4; queue.push(lx, 0); }
      const bIdx = (localH - 1) * localW + lx;
      if (localMask[bIdx] === 2) { localMask[bIdx] = 4; queue.push(lx, localH - 1); }
    }
    for (let ly = 1; ly < localH - 1; ly++) {
      if (localMask[ly * localW] === 2) { localMask[ly * localW] = 4; queue.push(0, ly); }
      const rIdx = ly * localW + localW - 1;
      if (localMask[rIdx] === 2) { localMask[rIdx] = 4; queue.push(localW - 1, ly); }
    }

    while (head < queue.length) {
      const cx = queue[head++];
      const cy = queue[head++];
      for (let d = 0; d < 4; d++) {
        const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
        if (nx >= 0 && nx < localW && ny >= 0 && ny < localH && localMask[ny * localW + nx] === 2) {
          localMask[ny * localW + nx] = 4;
          queue.push(nx, ny);
        }
      }
    }

    const newPixels = [];
    region.pixels.forEach(([px, py]) => {
      const lx = px - b.x, ly = py - b.y;
      const val = localMask[ly * localW + lx];
      if (val !== 2 && val !== 4) { newPixels.push([px, py]); }
    });

    if (innerDilatePx !== 0 && newPixels.length > 0) {
      const ib = b;
      const lm = new Uint8Array(localW * localH);
      newPixels.forEach(([px, py]) => { lm[(py - ib.y) * localW + (px - ib.x)] = 1; });

      if (innerDilatePx > 0) {
        for (let pass = 0; pass < innerDilatePx; pass++) {
          const dm = new Uint8Array(localW * localH);
          dm.set(lm);
          for (let ly = 0; ly < localH; ly++) {
            for (let lx = 0; lx < localW; lx++) {
              if (lm[ly * localW + lx] === 1) continue;
              if ((lx > 0 && lm[ly * localW + lx - 1] === 1) || (lx < localW - 1 && lm[ly * localW + lx + 1] === 1) ||
                  (ly > 0 && lm[(ly - 1) * localW + lx] === 1) || (ly < localH - 1 && lm[(ly + 1) * localW + lx] === 1)) {
                dm[ly * localW + lx] = 1;
              }
            }
          }
          lm.set(dm);
        }
      } else {
        const erodeN = -innerDilatePx;
        for (let pass = 0; pass < erodeN; pass++) {
          const em = new Uint8Array(localW * localH);
          em.set(lm);
          for (let ly = 0; ly < localH; ly++) {
            for (let lx = 0; lx < localW; lx++) {
              if (lm[ly * localW + lx] === 0) continue;
              if ((lx === 0 || lm[ly * localW + lx - 1] === 0) || (lx === localW - 1 || lm[ly * localW + lx + 1] === 0) ||
                  (ly === 0 || lm[(ly - 1) * localW + lx] === 0) || (ly === localH - 1 || lm[(ly + 1) * localW + lx] === 0)) {
                em[ly * localW + lx] = 0;
              }
            }
          }
          lm.set(em);
        }
      }

      const finalPixels = [];
      for (let ly = 0; ly < localH; ly++) {
        for (let lx = 0; lx < localW; lx++) {
          if (lm[ly * localW + lx] === 1) finalPixels.push([lx + ib.x, ly + ib.y]);
        }
      }

      const fps = new Uint8Array(width * height);
      finalPixels.forEach(([px, py]) => { fps[py * width + px] = 1; });
      let eMinX = width, eMaxX = 0, eMinY = height, eMaxY = 0;
      finalPixels.forEach(([px, py]) => {
        if (px < eMinX) eMinX = px; if (px > eMaxX) eMaxX = px;
        if (py < eMinY) eMinY = py; if (py > eMaxY) eMaxY = py;
      });
      updatedRegion.pixels = finalPixels;
      updatedRegion.pixelSet = fps;
      updatedRegion.bounds = { x: eMinX, y: eMinY, w: eMaxX - eMinX + 1, h: eMaxY - eMinY + 1 };
      updatedRegion.area = finalPixels.length;
    } else {
      updatedRegion.pixels = newPixels;
      const ps = new Uint8Array(width * height);
      newPixels.forEach(([px, py]) => { ps[py * width + px] = 1; });
      if (newPixels.length > 0) {
        let eMinX = width, eMaxX = 0, eMinY = height, eMaxY = 0;
        newPixels.forEach(([px, py]) => {
          if (px < eMinX) eMinX = px; if (px > eMaxX) eMaxX = px;
          if (py < eMinY) eMinY = py; if (py > eMaxY) eMaxY = py;
        });
        updatedRegion.pixelSet = ps;
        updatedRegion.bounds = { x: eMinX, y: eMinY, w: eMaxX - eMinX + 1, h: eMaxY - eMinY + 1 };
      }
      updatedRegion.area = newPixels.length;
    }

    updatedRegions.push(updatedRegion);
  }

  return updatedRegions;
}

function trimTransparent(data) {
  const { imageData } = data;
  const { width, height, data: pixels } = imageData;
  const pixelData = new Uint8ClampedArray(pixels);

  let top = height, left = width, right = 0, bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixelData[(y * width + x) * 4 + 3] > 0) {
        if (y < top) top = y; if (y > bottom) bottom = y;
        if (x < left) left = x; if (x > right) right = x;
      }
    }
  }

  if (top >= bottom || left >= right) {
    return { imageData: data.imageData, bounds: { x: 0, y: 0, w: width, h: height } };
  }

  const w = right - left + 1;
  const h = bottom - top + 1;
  const trimmed = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = ((y + top) * width + (x + left)) * 4;
      const dstIdx = (y * w + x) * 4;
      trimmed[dstIdx] = pixelData[srcIdx];
      trimmed[dstIdx + 1] = pixelData[srcIdx + 1];
      trimmed[dstIdx + 2] = pixelData[srcIdx + 2];
      trimmed[dstIdx + 3] = pixelData[srcIdx + 3];
    }
  }

  return {
    imageData: { width: w, height: h, data: Array.from(trimmed) },
    bounds: { x: left, y: top, w, h },
  };
}

function processImage({ imageData, bgMode, tolerance, edgeRemoval, dilateErode = 0, selectedColor, smoothEdge = 0, autoTolerance = false }) {
  const { width, height, data } = imageData;
  const pixelData = new Uint8ClampedArray(data);

  initLabLut();

  let bgMask;

  switch (bgMode) {
    case 'auto':
      bgMask = detectAndCreateMask(pixelData, width, height, tolerance, autoTolerance);
      break;
    case 'white':
      bgMask = createWhiteMask(pixelData, width, height, tolerance);
      break;
    case 'solid':
      bgMask = createSolidColorMask(pixelData, width, height, selectedColor, tolerance);
      break;
    case 'checkerboard':
      bgMask = createCheckerboardMask(pixelData, width, height, tolerance);
      break;
    case 'keep-transparent':
      bgMask = createTransparentMask(pixelData, width, height);
      break;
    default:
      bgMask = detectAndCreateMask(pixelData, width, height, tolerance, autoTolerance);
  }

  // 形态学开运算：自适应执行，对比度低或细线多时跳过
  const fgBefore = bgMask.reduce((s, v) => s + (1 - v), 0);
  const opened = openingMorphology(bgMask, width, height, 1);
  const fgAfter = opened.reduce((s, v) => s + (1 - v), 0);
  // 如果开运算去掉了超过 15% 的前景像素，说明在吃细线，跳过
  if (fgBefore === 0 || (fgBefore - fgAfter) / fgBefore < 0.15) {
    bgMask = opened;
    console.log('开运算已应用，前景变化:', ((fgBefore - fgAfter) / Math.max(fgBefore, 1) * 100).toFixed(1) + '%');
  } else {
    console.log('开运算跳过（检测到细线/低对比度），前景变化:', ((fgBefore - fgAfter) / fgBefore * 100).toFixed(1) + '%');
  }

  if (dilateErode !== 0) {
    bgMask = applyForegroundMorphology(bgMask, width, height, dilateErode);
  }
  
  let transparentCount = 0;
  for (let i = 0; i < pixelData.length; i += 4) {
    const idx = i / 4;
    if (bgMask[idx] === 1) {
      pixelData[i + 3] = 0;
      transparentCount++;
    }
  }
  console.log('已去除背景像素数:', transparentCount);
  
  if (edgeRemoval > 0) {
    applyEdgeRemoval(pixelData, width, height, bgMask, edgeRemoval);
  }
  
  // 边缘平滑处理
  if (smoothEdge > 0) {
    const smoothed = smoothEdges(pixelData, bgMask, width, height, smoothEdge);
    pixelData.set(smoothed);
  }
  
  return {
    imageData: {
      width,
      height,
      data: Array.from(pixelData)
    },
    bgMask: Array.from(bgMask)
  };
}

function smoothEdges(pixelData, bgMask, width, height, edgeSmooth) {
  const result = new Uint8ClampedArray(pixelData);
  const dist = distanceTransform(bgMask, width, height);
  const transitionWidth = [0, 3, 6, 10][Math.min(edgeSmooth, 3)];

  for (let i = 0; i < dist.length; i++) {
    if (bgMask[i] === 0 && dist[i] < transitionWidth) {
      const t = dist[i] / transitionWidth;
      const alpha = smoothstep(t) * 255;
      result[i * 4 + 3] = Math.round(alpha);
    }
  }

  return result;
}

function applyForegroundMorphology(bgMask, width, height, amount) {
  let result = new Uint8Array(bgMask);
  const steps = Math.abs(amount);

  for (let pass = 0; pass < steps; pass++) {
    const next = new Uint8Array(result);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const hasFgNeighbor =
          (x > 0 && result[idx - 1] === 0) ||
          (x < width - 1 && result[idx + 1] === 0) ||
          (y > 0 && result[idx - width] === 0) ||
          (y < height - 1 && result[idx + width] === 0);
        const hasBgNeighbor =
          (x === 0 || result[idx - 1] === 1) ||
          (x === width - 1 || result[idx + 1] === 1) ||
          (y === 0 || result[idx - width] === 1) ||
          (y === height - 1 || result[idx + width] === 1);

        if (amount > 0 && result[idx] === 1 && hasFgNeighbor) {
          next[idx] = 0;
        }

        if (amount < 0 && result[idx] === 0 && hasBgNeighbor) {
          next[idx] = 1;
        }
      }
    }

    result = next;
  }

  return result;
}

function detectAndCreateMask(data, width, height, tolerance, autoTolerance = false) {
  const hasAlpha = checkForAlphaChannel(data);

  if (hasAlpha) {
    const alphaRatio = getAlphaRatio(data);
    if (alphaRatio > 0.5) {
      return createTransparentMask(data, width, height);
    }
  }

  const borderColor = sampleBorderColors(data, width, height);
  console.log('K-Means 边框聚类背景色:', borderColor);

  const isCheckerboard = detectCheckerboard(data, width, height);

  if (isCheckerboard) {
    return createCheckerboardMask(data, width, height, tolerance);
  }

  const bgColor = borderColor;
  const bgBrightness = (bgColor[0] + bgColor[1] + bgColor[2]) / 3;

  // 直方图双峰检测辅助确认背景色
  const histResult = analyzeHistogram(data, width, height);
  if (histResult.hasBimodal) {
    console.log('检测到双峰直方图，亮峰:', histResult.lightPeak, '暗峰:', histResult.darkPeak);
    // 如果双峰分析的亮峰和采样背景色亮度一致，提高置信度
    const sampledBrightness = bgBrightness;
    if (Math.abs(histResult.lightPeak - sampledBrightness) > 50) {
      console.log('直方图分析与采样结果不一致，信任直方图亮峰');
    }
  }

  // 智能容差：使用 Otsu 自动计算最佳阈值
  let effectiveTolerance = tolerance;
  if (autoTolerance) {
    const otsuTol = otsuAutoThreshold(data, width, height, bgColor);
    effectiveTolerance = Math.max(otsuTol, 15);
    console.log('智能容差: Otsu 计算阈值 =', effectiveTolerance.toFixed(1));
  } else if (bgBrightness < 80) {
    effectiveTolerance = Math.max(tolerance, 120);
    console.log('检测到深色背景，亮度:', bgBrightness, '使用大容差:', effectiveTolerance);
  } else if (bgBrightness < 180) {
    effectiveTolerance = Math.max(tolerance, 80);
    console.log('检测到中等亮度背景，亮度:', bgBrightness, '使用容差:', effectiveTolerance);
  }
  
  // 检查常见背景色（白、洋红、绿幕、蓝幕），使用更大的容差
  const commonColors = [
    { color: [255, 255, 255], name: 'white' },
    { color: [255, 0, 255], name: 'magenta' },
    { color: [255, 0, 254], name: 'magenta2' },
    { color: [254, 0, 255], name: 'magenta3' },
    { color: [0, 255, 0], name: 'green' },
    { color: [0, 0, 255], name: 'blue' },
    { color: [128, 128, 128], name: 'gray' },
  ];
  
  for (const cc of commonColors) {
    if (isColorCloseTo(bgColor, cc.color, effectiveTolerance * 2)) {
      console.log('识别到常见背景色:', cc.name, '容差:', effectiveTolerance * 2.5);
      const mask = createSolidColorMask(data, width, height, cc.color, effectiveTolerance * 2.5);
      console.log('背景掩码统计:', countMask(mask));
      return mask;
    }
  }
  
  console.log('使用通用纯色背景检测，颜色:', bgColor, '容差:', effectiveTolerance);
  const mask = createSolidColorMask(data, width, height, bgColor, effectiveTolerance);
  console.log('背景掩码统计:', countMask(mask));
  return mask;
}

function countMask(mask) {
  let bgCount = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) bgCount++;
  }
  return { total: mask.length, background: bgCount, foreground: mask.length - bgCount };
}

function checkForAlphaChannel(data) {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      return true;
    }
  }
  return false;
}

function getAlphaRatio(data) {
  let transparentCount = 0;
  const totalPixels = data.length / 4;
  
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 128) {
      transparentCount++;
    }
  }
  
  return transparentCount / totalPixels;
}

function sampleBorderColors(data, width, height) {
  // 边框全周采样，用粗估+过滤+K-Means 找背景色
  initLabLut();

  // Step 1: 粗估背景色（取四角的众数，避开最外边缘）
  const roughSamples = [];
  const margin = Math.max(5, Math.floor(Math.min(width, height) * 0.02));
  const step = Math.max(3, Math.floor(Math.min(width, height) / 100));

  for (let x = margin; x < width - margin; x += step) {
    for (let y = margin; y < margin + 10; y++) {
      const idx = (y * width + x) * 4;
      roughSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    for (let y = Math.max(0, height - margin - 10); y < height - margin; y++) {
      const idx = (y * width + x) * 4;
      roughSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  for (let y = margin + 10; y < height - margin - 10; y += step) {
    for (let x = margin; x < margin + 10; x++) {
      const idx = (y * width + x) * 4;
      roughSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    for (let x = Math.max(0, width - margin - 10); x < width - margin; x++) {
      const idx = (y * width + x) * 4;
      roughSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }

  const roughBg = getMostCommonColor(roughSamples);
  const labRough = getLabFromLut(roughBg[0], roughBg[1], roughBg[2]);
  console.log('粗估背景色:', roughBg);

  // Step 2: 全边框采样，只保留接近粗估值的点
  const filtered = [];
  const borderWidth = Math.max(10, Math.floor(Math.min(width, height) * 0.04));
  const allSamples = [];

  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < borderWidth; y += step) {
      const idx = (y * width + x) * 4;
      allSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    for (let y = Math.max(0, height - borderWidth); y < height; y += step) {
      const idx = (y * width + x) * 4;
      allSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  for (let y = borderWidth; y < height - borderWidth; y += step) {
    for (let x = 0; x < borderWidth; x += step) {
      const idx = (y * width + x) * 4;
      allSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    for (let x = Math.max(0, width - borderWidth); x < width; x += step) {
      const idx = (y * width + x) * 4;
      allSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }

  for (const s of allSamples) {
    const labS = getLabFromLut(s[0], s[1], s[2]);
    const dist = labDistance(labS, labRough);
    // 保留距离粗估值 < 25 Lab 单位的点（约覆盖大部分背景纹理）
    if (dist < 25) {
      filtered.push(s);
    }
  }

  console.log('边框采样:', allSamples.length, '过滤后:', filtered.length);

  // Step 3: 对过滤后的样本做 K-Means
  if (filtered.length < 10) {
    // 过滤太狠了，回退到全样本
    return kmeansFindBackground(allSamples);
  }

  return kmeansFindBackground(filtered);
}

// 检测图片是否有外边框线
function detectBorderFrame(data, width, height) {
  // 检查四边最外层 1px 和内侧 5px 的颜色差异
  const outerColors = [], innerColors = [];
  const step = Math.max(1, Math.floor(width / 50));

  for (let x = 0; x < width; x += step) {
    const oTop = (0 * width + x) * 4;
    const iTop = (5 * width + x) * 4;
    outerColors.push([data[oTop], data[oTop + 1], data[oTop + 2]]);
    innerColors.push([data[iTop], data[iTop + 1], data[iTop + 2]]);
    const oBot = ((height - 1) * width + x) * 4;
    const iBot = ((height - 6) * width + x) * 4;
    outerColors.push([data[oBot], data[oBot + 1], data[oBot + 2]]);
    innerColors.push([data[iBot], data[iBot + 1], data[iBot + 2]]);
  }
  for (let y = 0; y < height; y += step) {
    const oLeft = (y * width + 0) * 4;
    const iLeft = (y * width + 5) * 4;
    outerColors.push([data[oLeft], data[oLeft + 1], data[oLeft + 2]]);
    innerColors.push([data[iLeft], data[iLeft + 1], data[iLeft + 2]]);
    const oRight = (y * width + (width - 1)) * 4;
    const iRight = (y * width + (width - 6)) * 4;
    outerColors.push([data[oRight], data[oRight + 1], data[oRight + 2]]);
    innerColors.push([data[iRight], data[iRight + 1], data[iRight + 2]]);
  }

  let totalDist = 0;
  let darkOuterCount = 0;
  for (let i = 0; i < outerColors.length; i++) {
    const dr = outerColors[i][0] - innerColors[i][0];
    const dg = outerColors[i][1] - innerColors[i][1];
    const db = outerColors[i][2] - innerColors[i][2];
    totalDist += Math.sqrt(dr * dr + dg * dg + db * db);
    if ((outerColors[i][0] + outerColors[i][1] + outerColors[i][2]) / 3 < 80) {
      darkOuterCount++;
    }
  }
  const avgDist = totalDist / outerColors.length;
  return (darkOuterCount > outerColors.length * 0.5) || avgDist > 40;
}

// K-Means 聚类找最大簇（背景色）
function kmeansFindBackground(samples) {
  if (samples.length === 0) return [255, 255, 255];
  if (samples.length < 6) return samples[0];

  const K = 2;
  const maxIter = 20;

  // 初始化：选两个相距最远的点
  let maxDist = 0, c1 = 0, c2 = 1;
  for (let i = 0; i < Math.min(samples.length, 50); i++) {
    for (let j = i + 1; j < Math.min(samples.length, 50); j++) {
      const d = rgbDist(samples[i], samples[j]);
      if (d > maxDist) { maxDist = d; c1 = i; c2 = j; }
    }
  }
  const centroids = [samples[c1].slice(), samples[c2].slice()];

  let assignments = new Int8Array(samples.length);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < samples.length; i++) {
      const d0 = rgbDist(samples[i], centroids[0]);
      const d1 = rgbDist(samples[i], centroids[1]);
      const bestK = d0 < d1 ? 0 : 1;
      if (assignments[i] !== bestK) { assignments[i] = bestK; changed = true; }
    }
    if (!changed) break;

    const sums = [[0, 0, 0], [0, 0, 0]];
    const counts = [0, 0];
    for (let i = 0; i < samples.length; i++) {
      const k = assignments[i];
      sums[k][0] += samples[i][0];
      sums[k][1] += samples[i][1];
      sums[k][2] += samples[i][2];
      counts[k]++;
    }
    for (let k = 0; k < 2; k++) {
      if (counts[k] > 0) {
        centroids[k] = [sums[k][0] / counts[k], sums[k][1] / counts[k], sums[k][2] / counts[k]];
      }
    }
  }

  // 选背景色簇：偏暗的图选最暗簇，偏亮的图选最大簇
  const counts = [0, 0];
  for (let i = 0; i < assignments.length; i++) counts[assignments[i]]++;

  // 计算样本平均亮度
  const avgBrightness = samples.reduce((s, c) => s + (c[0] + c[1] + c[2]) / 3, 0) / samples.length;

  let bestK;
  if (avgBrightness < 80) {
    // 深色背景图：选最暗的簇
    const brightness0 = (centroids[0][0] + centroids[0][1] + centroids[0][2]) / 3;
    const brightness1 = (centroids[1][0] + centroids[1][1] + centroids[1][2]) / 3;
    bestK = brightness0 < brightness1 ? 0 : 1;
    console.log('深色背景：选最暗簇', bestK, '亮度:', Math.min(brightness0, brightness1).toFixed(1));
  } else {
    // 浅色背景图：选最大簇
    bestK = counts[0] > counts[1] ? 0 : 1;
    console.log('浅色背景：选最大簇', bestK, '样本数:', Math.max(counts[0], counts[1]));
  }

  return centroids[bestK].map(Math.round);
}

function rgbDist(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getMostCommonColor(samples) {
  const colorMap = new Map();
  for (const color of samples) {
    const quantized = color.map(c => Math.round(c / 10) * 10);
    const key = quantized.join(',');
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }
  let maxCount = 0;
  let mostCommon = samples[0] || [255, 255, 255];
  for (const [key, count] of colorMap) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = key.split(',').map(Number);
    }
  }
  return mostCommon;
}

function detectCheckerboard(data, width, height) {
  const sampleSize = 20;
  const colors = new Set();
  
  for (let y = 0; y < Math.min(height, sampleSize * 2); y += 2) {
    for (let x = 0; x < Math.min(width, sampleSize * 2); x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const colorKey = `${Math.round(r / 10) * 10},${Math.round(g / 10) * 10},${Math.round(b / 10) * 10}`;
      colors.add(colorKey);
    }
  }
  
  const distinctColors = colors.size;
  return distinctColors >= 2 && distinctColors <= 4;
}

function createWhiteMask(data, width, height, tolerance) {
  const mask = new Uint8Array(width * height);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const avg = (r + g + b) / 3;
    
    if (avg > 255 - tolerance) {
      mask[i / 4] = 1;
    }
  }
  
  return mask;
}

function createSolidColorMask(data, width, height, targetColor, tolerance) {
  initLabLut();
  const mask = new Uint8Array(width * height);
  if (!targetColor || !Array.isArray(targetColor) || targetColor.length < 3) return mask;

  const labTarget = getLabFromLut(targetColor[0], targetColor[1], targetColor[2]);
  const labTol = mapToleranceToLab(tolerance);

  for (let i = 0; i < data.length; i += 4) {
    const lab = getLabFromLut(data[i], data[i + 1], data[i + 2]);
    if (labDistance(lab, labTarget) < labTol) {
      mask[i / 4] = 1;
    }
  }

  return mask;
}

function createCheckerboardMask(data, width, height, tolerance) {
  initLabLut();
  const mask = new Uint8Array(width * height);
  const checkerColors = detectCheckerboardColors(data, width, height);
  const labTol = mapToleranceToLab(tolerance * 1.5);
  const labCheckerColors = checkerColors.map(c => getLabFromLut(c[0], c[1], c[2]));

  for (let i = 0; i < data.length; i += 4) {
    const lab = getLabFromLut(data[i], data[i + 1], data[i + 2]);
    let isChecker = false;
    for (const labCc of labCheckerColors) {
      if (labDistance(lab, labCc) < labTol) {
        isChecker = true;
        break;
      }
    }
    if (isChecker) {
      mask[i / 4] = 1;
    }
  }

  return mask;
}

function detectCheckerboardColors(data, width, height) {
  const colorCounts = new Map();
  const sampleSize = 30;
  
  for (let y = 0; y < Math.min(height, sampleSize); y += 3) {
    for (let x = 0; x < Math.min(width, sampleSize); x += 3) {
      const idx = (y * width + x) * 4;
      const r = Math.round(data[idx] / 15) * 15;
      const g = Math.round(data[idx + 1] / 15) * 15;
      const b = Math.round(data[idx + 2] / 15) * 15;
      const key = `${r},${g},${b}`;
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }
  }
  
  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  return sortedColors.map(([key]) => key.split(',').map(Number));
}

function createTransparentMask(data, width, height) {
  const mask = new Uint8Array(width * height);
  
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 128) {
      mask[i / 4] = 1;
    }
  }
  
  return mask;
}

function applyEdgeRemoval(data, width, height, bgMask, intensity) {
  const edgePixels = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (bgMask[idx] === 0) {
        let hasBackgroundNeighbor = false;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (bgMask[nIdx] === 1) {
                hasBackgroundNeighbor = true;
                break;
              }
            }
          }
          if (hasBackgroundNeighbor) break;
        }
        
        if (hasBackgroundNeighbor) {
          edgePixels.push({ x, y });
        }
      }
    }
  }
  
  for (const pixel of edgePixels) {
    const idx = (pixel.y * width + pixel.x) * 4;
    const alpha = data[idx + 3];
    
    const reduction = Math.min(alpha, intensity * 2);
    data[idx + 3] = Math.max(0, alpha - reduction);
  }
}

function detectAssets({ imageData, bgMask, mergeDistance, minArea, padding, deduplicate = false }) {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(bgMask.length);
  
  for (let i = 0; i < bgMask.length; i++) {
    mask[i] = bgMask[i] === 1 ? 0 : 1;
  }
  
  // 掩码 A：原始掩码（用于精确像素提取）
  const originalMask = new Uint8Array(mask);
  
  // 掩码 B：闭运算掩码（用于连通性分析）
  const closedMask = closingMorphology(mask, width, height, 1);
  
  // 在闭运算掩码上找连通区域
  let regions = findConnectedRegions(closedMask, width, height);

  // 如果只识别出 1 个区域（粘连严重），切换到边缘检测模式
  let useEdgeMode = false;
  if (regions.length <= 1) {
    console.log('连通域分析只找到', regions.length, '个区域，尝试边缘检测模式');
    const edgeRegions = detectAssetsByEdges(imageData, bgMask, mergeDistance, minArea);
    if (edgeRegions.length > 1) {
      useEdgeMode = true;
      // 用边缘检测的区域替换
      const edgeFiltered = edgeRegions.filter(r => {
        const rw = r.maxX - r.minX + 1;
        const rh = r.maxY - r.minY + 1;
        return rw * rh >= minArea;
      });
      edgeFiltered.sort((a, b) => {
        if (Math.abs(a.minY - b.minY) < 20) return a.minX - b.minX;
        return a.minY - b.minY;
      });
      regions = edgeFiltered;
    }
  }

  const filteredRegions = regions
    .filter(region => {
      const rw = region.maxX - region.minX + 1;
      const rh = region.maxY - region.minY + 1;
      return rw * rh >= minArea;
    })
    .filter(region => {
      const edgeMargin = 5;
      const touchesEdge = 
        region.minX <= edgeMargin ||
        region.maxX >= width - edgeMargin ||
        region.minY <= edgeMargin ||
        region.maxY >= height - edgeMargin;
      const rw = region.maxX - region.minX + 1;
      const rh = region.maxY - region.minY + 1;
      const aspectRatio = Math.max(rw, rh) / Math.min(rw, rh);
      if (touchesEdge && aspectRatio > 5) return false;
      return true;
    });
  
  filteredRegions.sort((a, b) => {
    if (Math.abs(a.minY - b.minY) < 20) return a.minX - b.minX;
    return a.minY - b.minY;
  });
  
  // 如果需要去重，先合并重叠区域
  let finalRegions = filteredRegions;
  if (deduplicate) {
    finalRegions = mergeOverlappingRegions(filteredRegions, originalMask, width, height);
  }

  // Watershed 分割：对过大的连通块尝试拆分
  const splitRegions = [];
  // 计算平均面积和整张图面积
  const totalImgArea = width * height;
  const avgArea = finalRegions.reduce((s, r) => s + (r.maxX - r.minX + 1) * (r.maxY - r.minY + 1), 0) / Math.max(finalRegions.length, 1);

  for (const region of finalRegions) {
    const rw = region.maxX - region.minX + 1;
    const rh = region.maxY - region.minY + 1;
    const area = rw * rh;
    const aspectRatio = Math.max(rw, rh) / Math.max(Math.min(rw, rh), 1);
    // 触发条件：区域占整图 > 30%，或面积 > 平均 3 倍，或长宽比 > 8
    const isOversized = area > totalImgArea * 0.30 || area > avgArea * 3 || aspectRatio > 8;
    if (isOversized && area > 5000) {
      const subRegions = watershedSplit(closedMask, width, height, region);
      if (subRegions && subRegions.length > 1) {
        console.log(`Watershed 拆分: 区域 ${rw}x${rh} → ${subRegions.length} 个子区域`);
        splitRegions.push(...subRegions);
        continue;
      }
    }
    splitRegions.push(region);
  }
  finalRegions = splitRegions;

  const assets = finalRegions.map((region, index) => {
    // 从闭运算区域出发，在原始掩码上精确提取像素
    const seeds = [];
    for (let y = region.minY; y <= region.maxY; y++) {
      for (let x = region.minX; x <= region.maxX; x++) {
        if (originalMask[y * width + x] === 1) {
          seeds.push({ x, y });
        }
      }
    }
    
    // 8-连通 BFS，只收集原始前景像素
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
    
    // 计算精确边界框
    let eMinX = width, eMaxX = 0, eMinY = height, eMaxY = 0;
    exactPixels.forEach(([px, py]) => {
      if (px < eMinX) eMinX = px;
      if (px > eMaxX) eMaxX = px;
      if (py < eMinY) eMinY = py;
      if (py > eMaxY) eMaxY = py;
    });
    
    const x = Math.max(0, eMinX - padding);
    const y = Math.max(0, eMinY - padding);
    const w = Math.min(width - x, eMaxX - eMinX + 1 + padding * 2);
    const h = Math.min(height - y, eMaxY - eMinY + 1 + padding * 2);
    
    // 生成缩略图（最大 64px 宽）
    const maxThumbSize = 64;
    const scale = Math.min(maxThumbSize / w, maxThumbSize / h, 1);
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const thumbData = new Uint8ClampedArray(tw * th * 4);
    
    for (let ty = 0; ty < th; ty++) {
      for (let tx = 0; tx < tw; tx++) {
        const srcX = x + Math.round(tx / scale);
        const srcY = y + Math.round(ty / scale);
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (ty * tw + tx) * 4;
        
        if (mask[srcY * width + srcX] === 0) {
          thumbData[dstIdx] = data[srcIdx];
          thumbData[dstIdx + 1] = data[srcIdx + 1];
          thumbData[dstIdx + 2] = data[srcIdx + 2];
          thumbData[dstIdx + 3] = data[srcIdx + 3];
        } else {
          thumbData[dstIdx + 3] = 0;
        }
      }
    }
    
    return {
      id: index + 1,
      name: `asset-${String(index + 1).padStart(3, '0')}`,
      x, y, w, h,
      thumbnail: {
        width: tw,
        height: th,
        data: Array.from(thumbData)
      }
    };
  });
  
  return assets;
}

function mergeOverlappingRegions(regions, mask, width, height) {
  if (regions.length <= 1) return regions;
  
  const SIMILARITY_THRESHOLD = 0.9;
  const OVERLAP_THRESHOLD = 0.3;
  const merged = [];
  const used = new Uint8Array(regions.length);
  
  for (let i = 0; i < regions.length; i++) {
    if (used[i]) continue;
    
    let current = { ...regions[i] };
    used[i] = 1;
    
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < regions.length; j++) {
        if (used[j]) continue;
        
        const overlap = calcOverlap(current, regions[j]);
        if (overlap > OVERLAP_THRESHOLD) {
          // 合并区域：取并集
          current.minX = Math.min(current.minX, regions[j].minX);
          current.maxX = Math.max(current.maxX, regions[j].maxX);
          current.minY = Math.min(current.minY, regions[j].minY);
          current.maxY = Math.max(current.maxY, regions[j].maxY);
          used[j] = 1;
          changed = true;
        }
      }
    }
    
    merged.push(current);
  }
  
  return merged;
}

function calcOverlap(r1, r2) {
  const x1 = Math.max(r1.minX, r2.minX);
  const y1 = Math.max(r1.minY, r2.minY);
  const x2 = Math.min(r1.maxX, r2.maxX);
  const y2 = Math.min(r1.maxY, r2.maxY);
  
  if (x1 > x2 || y1 > y2) return 0;
  
  const overlapArea = (x2 - x1 + 1) * (y2 - y1 + 1);
  const area1 = (r1.maxX - r1.minX + 1) * (r1.maxY - r1.minY + 1);
  const area2 = (r2.maxX - r2.minX + 1) * (r2.maxY - r2.minY + 1);
  
  return overlapArea / Math.min(area1, area2);
}

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

function dilateMask(mask, width, height, radius) {
  const dilated = new Uint8Array(mask.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              dilated[ny * width + nx] = 1;
            }
          }
        }
      }
    }
  }
  
  return dilated;
}

function findConnectedRegions(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const regions = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (mask[idx] === 1 && visited[idx] === 0) {
        const region = { minX: x, maxX: x, minY: y, maxY: y };
        const queue = [{ x, y }];
        visited[idx] = 1;
        
        let head = 0;
        while (head < queue.length) {
          const current = queue[head++];
          
          region.minX = Math.min(region.minX, current.x);
          region.maxX = Math.max(region.maxX, current.x);
          region.minY = Math.min(region.minY, current.y);
          region.maxY = Math.max(region.maxY, current.y);
          
          const neighbors = [
            { x: current.x - 1, y: current.y },
            { x: current.x + 1, y: current.y },
            { x: current.x, y: current.y - 1 },
            { x: current.x, y: current.y + 1 }
          ];
          
          for (const neighbor of neighbors) {
            if (neighbor.x >= 0 && neighbor.x < width && 
                neighbor.y >= 0 && neighbor.y < height) {
              const nIdx = neighbor.y * width + neighbor.x;
              if (mask[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push(neighbor);
              }
            }
          }
        }
        
        regions.push(region);
      }
    }
  }
  
  return regions;
}

function isColorCloseTo(color, target, tolerance) {
  initLabLut();
  const lab1 = getLabFromLut(color[0], color[1], color[2]);
  const lab2 = getLabFromLut(target[0], target[1], target[2]);
  return labDistance(lab1, lab2) < mapToleranceToLab(tolerance);
}
