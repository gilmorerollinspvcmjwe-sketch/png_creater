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

function irregularDetect(data) {
  const { imageData, bgColor, outlineColor, outlineTolerance, sensitivity, minArea, dilatePx } = data;
  const { width, height, data: pixels } = imageData;
  const pixelData = new Uint8ClampedArray(pixels);

  const hasOutline = outlineColor !== null && outlineColor !== undefined;
  const tol = sensitivity * 2.5;
  const outTol = hasOutline ? (outlineTolerance || 80) * 2.5 : 0;

  const mask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const pi = i * 4;
    const r = pixelData[pi], g = pixelData[pi + 1], b = pixelData[pi + 2];

    if (hasOutline) {
      const odr = r - outlineColor.r, odg = g - outlineColor.g, odb = b - outlineColor.b;
      const oDist = Math.sqrt(odr * odr + odg * odg + odb * odb);
      if (oDist <= outTol) { mask[i] = 2; continue; }
    }

    const bdr = r - bgColor.r, bdg = g - bgColor.g, bdb = b - bgColor.b;
    const bDist = Math.sqrt(bdr * bdr + bdg * bdg + bdb * bdb);
    mask[i] = bDist <= tol ? 3 : 1;
  }

  for (let i = 0; i < width * height; i++) {
    if (mask[i] === 0) mask[i] = 3;
  }

  const bgQueue = [];
  let bgHead = 0;
  for (let x = 0; x < width; x++) {
    if (mask[x] === 3) { mask[x] = 0; bgQueue.push(x, 0); }
    const bIdx = (height - 1) * width + x;
    if (mask[bIdx] === 3) { mask[bIdx] = 0; bgQueue.push(x, height - 1); }
  }
  for (let y = 1; y < height - 1; y++) {
    const lIdx = y * width;
    if (mask[lIdx] === 3) { mask[lIdx] = 0; bgQueue.push(0, y); }
    const rIdx = y * width + width - 1;
    if (mask[rIdx] === 3) { mask[rIdx] = 0; bgQueue.push(width - 1, y); }
  }

  const BG_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
  while (bgHead < bgQueue.length) {
    const cx = bgQueue[bgHead++];
    const cy = bgQueue[bgHead++];
    for (let d = 0; d < 4; d++) {
      const nx = cx + BG_DIRS[d][0], ny = cy + BG_DIRS[d][1];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx] === 3) {
        mask[ny * width + nx] = 0;
        bgQueue.push(nx, ny);
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
  const innerTol = innerTolerance * 2.5;
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
        const r = pixelData[pi], g = pixelData[pi + 1], bl = pixelData[pi + 2];

        if (hasInnerOutline) {
          const odr = r - innerOutlineColor.r, odg = g - innerOutlineColor.g, odb = bl - innerOutlineColor.b;
          const oDist = Math.sqrt(odr * odr + odg * odg + odb * odb);
          if (oDist <= innerTol * 0.8) { localMask[ly * localW + lx] = 3; continue; }
        }

        const bdr = r - innerBgColor.r, bdg = g - innerBgColor.g, bdb = bl - innerBgColor.b;
        const bDist = Math.sqrt(bdr * bdr + bdg * bdg + bdb * bdb);
        if (bDist <= innerTol) { localMask[ly * localW + lx] = 2; }
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
  const mask = new Uint8Array(bgMask.length);
  
  for (let i = 0; i < bgMask.length; i++) {
    mask[i] = bgMask[i] === 1 ? 0 : 1;
  }
  
  const dilatedMask = dilateMask(mask, width, height, Math.floor(mergeDistance / 2));
  const regions = findConnectedRegions(dilatedMask, width, height);
  
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
  
  const assets = filteredRegions.map((region, index) => {
    const x = Math.max(0, region.minX - padding);
    const y = Math.max(0, region.minY - padding);
    const w = Math.min(width - x, region.maxX - region.minX + 1 + padding * 2);
    const h = Math.min(height - y, region.maxY - region.minY + 1 + padding * 2);
    
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
