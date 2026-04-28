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
    }
  } catch (error) {
    console.error('Worker 错误:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
};

function processImage({ imageData, bgMode, tolerance, edgeRemoval, selectedColor }) {
  const { width, height, data } = imageData;
  const pixelData = new Uint8ClampedArray(data);
  
  let bgMask;
  
  switch (bgMode) {
    case 'auto':
      bgMask = detectAndCreateMask(pixelData, width, height, tolerance);
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
      bgMask = detectAndCreateMask(pixelData, width, height, tolerance);
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
  
  return {
    imageData: {
      width,
      height,
      data: Array.from(pixelData)
    },
    bgMask: Array.from(bgMask)
  };
}

function detectAndCreateMask(data, width, height, tolerance) {
  const hasAlpha = checkForAlphaChannel(data);
  
  if (hasAlpha) {
    const alphaRatio = getAlphaRatio(data);
    if (alphaRatio > 0.5) {
      return createTransparentMask(data, width, height);
    }
  }
  
  const cornerColors = sampleCornerColors(data, width, height);
  console.log('采样背景色:', cornerColors);
  
  const isCheckerboard = detectCheckerboard(data, width, height);
  
  if (isCheckerboard) {
    return createCheckerboardMask(data, width, height, tolerance);
  }
  
  const bgColor = cornerColors;
  const bgBrightness = (bgColor[0] + bgColor[1] + bgColor[2]) / 3;
  
  // 对于深色背景，使用更大的容差
  let effectiveTolerance = tolerance;
  if (bgBrightness < 80) {
    // 深色背景（如深灰、黑色）
    effectiveTolerance = Math.max(tolerance, 120);
    console.log('检测到深色背景，亮度:', bgBrightness, '使用大容差:', effectiveTolerance);
  } else if (bgBrightness < 180) {
    // 中等亮度背景
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

function sampleCornerColors(data, width, height) {
  // 采样图片边缘的像素（边框采样）
  const edgeSamples = [];
  const borderWidth = Math.max(10, Math.floor(Math.min(width, height) * 0.03));
  
  // 采样上下左右四条边
  for (let x = 0; x < width; x += 3) {
    for (let y = 0; y < borderWidth && y < height; y++) {
      const idx = (y * width + x) * 4;
      edgeSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    for (let y = Math.max(0, height - borderWidth); y < height; y++) {
      const idx = (y * width + x) * 4;
      edgeSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  
  for (let y = borderWidth; y < height - borderWidth; y += 3) {
    for (let x = 0; x < borderWidth && x < width; x++) {
      const idx = (y * width + x) * 4;
      edgeSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    for (let x = Math.max(0, width - borderWidth); x < width; x++) {
      const idx = (y * width + x) * 4;
      edgeSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  
  return getMostCommonColor(edgeSamples);
}

function getMostCommonColor(samples) {
  const colorMap = new Map();
  
  for (const color of samples) {
    // 量化颜色，忽略微小变化
    const quantized = color.map(c => Math.round(c / 5) * 5);
    const key = quantized.join(',');
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }
  
  let maxCount = 0;
  let mostCommon = samples[0];
  
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
  const mask = new Uint8Array(width * height);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    
    const dr = r - targetColor[0];
    const dg = g - targetColor[1];
    const db = b - targetColor[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    
    if (distance < tolerance) {
      mask[i / 4] = 1;
    }
  }
  
  return mask;
}

function createCheckerboardMask(data, width, height, tolerance) {
  const mask = new Uint8Array(width * height);
  const checkerColors = detectCheckerboardColors(data, width, height);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    
    let isChecker = false;
    for (const color of checkerColors) {
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      
      if (distance < tolerance * 1.5) {
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

function detectAssets({ imageData, bgMask, mergeDistance, minArea, padding }) {
  const { width, height, data } = imageData;
  const pixelData = new Uint8ClampedArray(data);
  const mask = new Uint8Array(bgMask.length);
  
  for (let i = 0; i < bgMask.length; i++) {
    mask[i] = bgMask[i] === 1 ? 0 : 1;
  }
  
  const dilatedMask = dilateMask(mask, width, height, Math.floor(mergeDistance / 2));
  
  const regions = findConnectedRegions(dilatedMask, width, height);
  
  const filteredRegions = regions
    .filter(region => {
      const width = region.maxX - region.minX + 1;
      const height = region.maxY - region.minY + 1;
      const area = width * height;
      return area >= minArea;
    })
    .filter(region => {
      const edgeMargin = 5;
      const touchesEdge = 
        region.minX <= edgeMargin ||
        region.maxX >= width - edgeMargin ||
        region.minY <= edgeMargin ||
        region.maxY >= height - edgeMargin;
      
      const regionWidth = region.maxX - region.minX + 1;
      const regionHeight = region.maxY - region.minY + 1;
      const aspectRatio = Math.max(regionWidth, regionHeight) / Math.min(regionWidth, regionHeight);
      
      if (touchesEdge && aspectRatio > 5) {
        return false;
      }
      
      return true;
    });
  
  filteredRegions.sort((a, b) => {
    if (Math.abs(a.minY - b.minY) < 20) {
      return a.minX - b.minX;
    }
    return a.minY - b.minY;
  });
  
  const assets = filteredRegions.map((region, index) => {
    const x = Math.max(0, region.minX - padding);
    const y = Math.max(0, region.minY - padding);
    const w = Math.min(width - x, region.maxX - region.minX + 1 + padding * 2);
    const h = Math.min(height - y, region.maxY - region.minY + 1 + padding * 2);
    
    const assetImageData = new Uint8ClampedArray(w * h * 4);
    
    for (let cy = 0; cy < h; cy++) {
      for (let cx = 0; cx < w; cx++) {
        const srcX = x + cx;
        const srcY = y + cy;
        const srcIdx = (srcY * width + srcX) * 4;
        const destIdx = (cy * w + cx) * 4;
        
        if (bgMask[srcY * width + srcX] === 1) {
          assetImageData[destIdx + 3] = 0;
        } else {
          assetImageData[destIdx] = pixelData[srcIdx];
          assetImageData[destIdx + 1] = pixelData[srcIdx + 1];
          assetImageData[destIdx + 2] = pixelData[srcIdx + 2];
          assetImageData[destIdx + 3] = pixelData[srcIdx + 3];
        }
      }
    }
    
    return {
      id: index + 1,
      name: `candidate-${String(index + 1).padStart(3, '0')}`,
      x, y, w, h,
      imageData: {
        width: w,
        height: h,
        data: Array.from(assetImageData)
      }
    };
  });
  
  return assets;
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
  const dr = color[0] - target[0];
  const dg = color[1] - target[1];
  const db = color[2] - target[2];
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  return distance < tolerance;
}
