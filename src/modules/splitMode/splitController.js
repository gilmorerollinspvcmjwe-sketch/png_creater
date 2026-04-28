import JSZip from 'jszip';

const REGION_COLORS = [
  '#e94560', '#3fb950', '#58a6ff', '#d29922', '#bc8cff',
  '#00bcd4', '#ff6d00', '#64dd17', '#d500f9', '#304ffe',
];

const splitState = {
  originalImage: null,
  processedImageData: null,
  splitMode: 'irregular',
  boxes: [],
  selectedBox: -1,
  regions: [],
  selectedRegion: -1,
  innerSelectedRegions: new Set(),
  irColorPickMode: null,
  irBgColor: null,
  irOutlineColor: null,
  innerBgColor: null,
  innerOutlineColor: null,
  scale: 1,
  dragging: false,
  dragType: null,
  dragStart: null,
  dragBoxStart: null,
};

let worker = null;
let mainCanvas, mainCtx, overlayCanvas, overlayCtx;

export function initSplitMode(sharedWorker) {
  worker = sharedWorker;
  mainCanvas = document.getElementById('split-main-canvas');
  mainCtx = mainCanvas.getContext('2d');
  overlayCanvas = document.getElementById('split-overlay-canvas');
  overlayCtx = overlayCanvas.getContext('2d');
  setupSplitEvents();
}

export function setSplitWorker(sharedWorker) {
  worker = sharedWorker;
}

function setupSplitEvents() {
  const fileInput = document.getElementById('split-file-input');
  const uploadZone = document.getElementById('split-upload-zone');

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) loadSplitImage(e.target.files[0]);
  });
  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault(); uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) loadSplitImage(e.dataTransfer.files[0]);
  });

  document.querySelectorAll('.sub-tab[data-split-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      splitState.splitMode = tab.dataset.splitMode;
      document.querySelectorAll('.sub-tab[data-split-mode]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('split-rect-panel').classList.toggle('active', splitState.splitMode === 'rect');
      document.getElementById('split-irregular-panel').classList.toggle('active', splitState.splitMode === 'irregular');
      drawOverlay();
    });
  });

  document.getElementById('split-bg-remove-toggle')?.addEventListener('change', (e) => {
    document.getElementById('split-bg-remove-options').style.display = e.target.checked ? 'block' : 'none';
  });
  document.getElementById('split-bg-tolerance')?.addEventListener('input', (e) => {
    document.getElementById('split-bg-tol-val').textContent = e.target.value;
  });
  document.getElementById('split-bg-pick-btn')?.addEventListener('click', () => enableColorPick('split-bg'));
  document.getElementById('split-apply-bg-remove')?.addEventListener('click', applyBgRemove);

  document.getElementById('split-grid-cols')?.addEventListener('input', (e) => {
    document.getElementById('split-grid-cols-val').textContent = e.target.value;
  });
  document.getElementById('split-grid-rows')?.addEventListener('input', (e) => {
    document.getElementById('split-grid-rows-val').textContent = e.target.value;
  });
  document.getElementById('split-auto-grid-btn')?.addEventListener('click', autoGrid);
  document.getElementById('split-clear-boxes-btn')?.addEventListener('click', () => { splitState.boxes = []; splitState.selectedBox = -1; drawOverlay(); });
  document.getElementById('split-undo-box-btn')?.addEventListener('click', () => { if (splitState.boxes.length > 0) { splitState.boxes.pop(); splitState.selectedBox = -1; drawOverlay(); } });

  document.getElementById('split-ir-bg-pick-btn')?.addEventListener('click', () => enableColorPick('ir-bg'));
  document.getElementById('split-ir-outline-pick-btn')?.addEventListener('click', () => enableColorPick('ir-outline'));
  document.getElementById('split-inner-bg-pick-btn')?.addEventListener('click', () => enableColorPick('inner-bg'));
  document.getElementById('split-inner-outline-pick-btn')?.addEventListener('click', () => enableColorPick('inner-outline'));

  const valueLabelByInputId = {
    'split-outline-tolerance': 'split-outline-tol-val',
    'split-detect-sensitivity': 'split-detect-sens-val',
    'split-min-area': 'split-min-area-val',
    'split-dilate-px': 'split-dilate-px-val',
    'split-inner-tolerance': 'split-inner-tol-val',
    'split-inner-dilate-px': 'split-inner-dilate-px-val',
  };

  Object.keys(valueLabelByInputId).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      const valEl = document.getElementById(valueLabelByInputId[id]);
      if (valEl) valEl.textContent = el.value;
    });
  });

  document.getElementById('ir-detect-btn')?.addEventListener('click', smartDetectIrregular);
  document.getElementById('ir-apply-inner-btn')?.addEventListener('click', applyInnerBgRemove);

  document.getElementById('ir-select-all-btn')?.addEventListener('click', () => { splitState.regions.forEach((_, i) => splitState.innerSelectedRegions.add(i)); updateRegionListUI(); drawOverlay(); });
  document.getElementById('ir-deselect-all-btn')?.addEventListener('click', () => { splitState.innerSelectedRegions.clear(); updateRegionListUI(); drawOverlay(); });
  document.getElementById('ir-invert-btn')?.addEventListener('click', () => { const s = new Set(); splitState.regions.forEach((_, i) => { if (!splitState.innerSelectedRegions.has(i)) s.add(i); }); splitState.innerSelectedRegions = s; updateRegionListUI(); drawOverlay(); });
  document.getElementById('ir-clear-btn')?.addEventListener('click', () => { splitState.regions = []; splitState.selectedRegion = -1; updateRegionListUI(); drawOverlay(); });
  document.getElementById('ir-undo-btn')?.addEventListener('click', () => { if (splitState.regions.length > 0) { splitState.regions.pop(); splitState.selectedRegion = -1; updateRegionListUI(); drawOverlay(); } });

  document.getElementById('split-download-btn')?.addEventListener('click', splitAndDownload);

  overlayCanvas.addEventListener('mousedown', handleOverlayMouseDown);
  overlayCanvas.addEventListener('mousemove', handleOverlayMouseMove);
  overlayCanvas.addEventListener('mouseup', handleOverlayMouseUp);
  overlayCanvas.addEventListener('mouseleave', () => { splitState.dragging = false; });
}

function enableColorPick(type) {
  splitState.irColorPickMode = type;
  overlayCanvas.style.cursor = 'crosshair';
  showToast('点击图片上的对应区域取色', 'info');
}

function handleOverlayMouseDown(e) {
  if (!splitState.originalImage) return;
  const rect = overlayCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const s = splitState.scale;

  if (splitState.irColorPickMode) {
    handleColorPick(mx, my, s);
    return;
  }

  if (splitState.splitMode === 'irregular') {
    handleIrregularClick(mx, my, s);
    return;
  }

  if (splitState.selectedBox >= 0) {
    const box = splitState.boxes[splitState.selectedBox];
    const bx = box.x * s, by = box.y * s, bw = box.w * s, bh = box.h * s;
    const handles = [{ n: 'tl', x: bx, y: by }, { n: 'tr', x: bx + bw, y: by }, { n: 'bl', x: bx, y: by + bh }, { n: 'br', x: bx + bw, y: by + bh }];
    for (const h of handles) {
      if (Math.abs(mx - h.x) < 8 && Math.abs(my - h.y) < 8) {
        splitState.dragging = true; splitState.dragType = 'resize'; splitState.resizeHandle = h.n;
        splitState.dragStart = { x: mx, y: my }; splitState.dragBoxStart = { ...box };
        return;
      }
    }
  }

  for (let i = splitState.boxes.length - 1; i >= 0; i--) {
    const box = splitState.boxes[i];
    if (mx >= box.x * s && mx <= (box.x + box.w) * s && my >= box.y * s && my <= (box.y + box.h) * s) {
      splitState.selectedBox = i;
      splitState.dragging = true; splitState.dragType = 'move';
      splitState.dragStart = { x: mx, y: my }; splitState.dragBoxStart = { ...box };
      drawOverlay();
      return;
    }
  }

  const newBox = { x: Math.floor(mx / s), y: Math.floor(my / s), w: 0, h: 0 };
  splitState.boxes.push(newBox);
  splitState.selectedBox = splitState.boxes.length - 1;
  splitState.dragging = true; splitState.dragType = 'create';
  splitState.dragStart = { x: mx, y: my }; splitState.dragBoxStart = { ...newBox };
}

function handleOverlayMouseMove(e) {
  if (!splitState.dragging || splitState.splitMode !== 'rect') return;
  const rect = overlayCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const s = splitState.scale;
  const dx = (mx - splitState.dragStart.x) / s, dy = (my - splitState.dragStart.y) / s;
  const box = splitState.boxes[splitState.selectedBox];
  const ob = splitState.dragBoxStart;

  if (splitState.dragType === 'create') {
    box.w = Math.abs(dx); box.h = Math.abs(dy);
    box.x = dx >= 0 ? ob.x : ob.x + dx;
    box.y = dy >= 0 ? ob.y : ob.y + dy;
  } else if (splitState.dragType === 'move') {
    box.x = Math.max(0, ob.x + dx); box.y = Math.max(0, ob.y + dy);
  } else if (splitState.dragType === 'resize') {
    const h = splitState.resizeHandle;
    let nx = ob.x, ny = ob.y, nw = ob.w, nh = ob.h;
    if (h.includes('l')) { nx = ob.x + dx; nw = ob.w - dx; }
    if (h.includes('r')) { nw = ob.w + dx; }
    if (h.includes('t')) { ny = ob.y + dy; nh = ob.h - dy; }
    if (h.includes('b')) { nh = ob.h + dy; }
    if (nw < 4) nw = 4; if (nh < 4) nh = 4;
    nx = Math.max(0, nx); ny = Math.max(0, ny);
    box.x = nx; box.y = ny; box.w = nw; box.h = nh;
  }
  drawOverlay();
}

function handleOverlayMouseUp() {
  if (splitState.dragging && splitState.dragType === 'create') {
    const box = splitState.boxes[splitState.selectedBox];
    if (box.w < 4 || box.h < 4) { splitState.boxes.pop(); splitState.selectedBox = -1; }
  }
  splitState.dragging = false; splitState.dragType = null;
  drawOverlay();
}

function handleColorPick(mx, my, s) {
  const type = splitState.irColorPickMode;
  splitState.irColorPickMode = null;
  overlayCanvas.style.cursor = splitState.splitMode === 'rect' ? 'crosshair' : 'pointer';

  const ox = Math.floor(mx / s), oy = Math.floor(my / s);
  const tmpC = document.createElement('canvas');
  tmpC.width = splitState.originalImage.width; tmpC.height = splitState.originalImage.height;
  tmpC.getContext('2d').drawImage(splitState.originalImage, 0, 0);
  const pd = tmpC.getContext('2d').getImageData(Math.max(0, Math.min(ox, tmpC.width - 1)), Math.max(0, Math.min(oy, tmpC.height - 1)), 1, 1).data;
  const hex = '#' + [pd[0], pd[1], pd[2]].map(v => v.toString(16).padStart(2, '0')).join('');
  const rgb = { r: pd[0], g: pd[1], b: pd[2] };

  if (type === 'split-bg') {
    document.getElementById('split-bg-color').value = hex;
    document.getElementById('split-bg-color-hex').textContent = hex.toUpperCase();
  } else if (type === 'ir-bg') {
    splitState.irBgColor = rgb;
    document.getElementById('ir-bg-color').value = hex;
    document.getElementById('ir-bg-color-hex').textContent = hex.toUpperCase();
  } else if (type === 'ir-outline') {
    splitState.irOutlineColor = rgb;
    document.getElementById('ir-outline-color').value = hex;
    document.getElementById('ir-outline-color-hex').textContent = hex.toUpperCase();
  } else if (type === 'inner-bg') {
    splitState.innerBgColor = rgb;
    document.getElementById('inner-bg-color').value = hex;
    document.getElementById('inner-bg-color-hex').textContent = hex.toUpperCase();
  } else if (type === 'inner-outline') {
    splitState.innerOutlineColor = rgb;
    document.getElementById('inner-outline-color').value = hex;
    document.getElementById('inner-outline-color-hex').textContent = hex.toUpperCase();
  }
  showToast('已取色: ' + hex.toUpperCase(), 'success');
}

function handleIrregularClick(mx, my, s) {
  const ox = Math.floor(mx / s), oy = Math.floor(my / s);
  let found = -1;
  for (let i = splitState.regions.length - 1; i >= 0; i--) {
    const r = splitState.regions[i];
    if (ox >= r.bounds.x && ox < r.bounds.x + r.bounds.w && oy >= r.bounds.y && oy < r.bounds.y + r.bounds.h) {
      if (r.pixelSet && r.pixelSet[oy * splitState.originalImage.width + ox]) { found = i; break; }
    }
  }
  splitState.selectedRegion = found;
  if (found >= 0) {
    if (splitState.innerSelectedRegions.has(found)) splitState.innerSelectedRegions.delete(found);
    else splitState.innerSelectedRegions.add(found);
  }
  updateRegionListUI();
  drawOverlay();
}

function loadSplitImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      splitState.originalImage = img;
      splitState.processedImageData = null;
      splitState.boxes = []; splitState.regions = [];
      splitState.selectedBox = -1; splitState.selectedRegion = -1;
      fitAndDraw();
      document.getElementById('split-empty').style.display = 'none';
      document.getElementById('split-canvas-wrapper').style.display = 'flex';
      document.getElementById('split-info-bar').style.display = 'flex';
      document.getElementById('split-info-size').textContent = img.width + '×' + img.height;
      document.getElementById('split-download-btn').disabled = false;
      showToast('图片加载成功 (' + img.width + '×' + img.height + ')');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export function loadSplitImageFromFile(file) {
  loadSplitImage(file);
}

function fitAndDraw() {
  const img = splitState.originalImage;
  if (!img) return;
  const area = document.getElementById('split-workspace');
  const maxW = area.clientWidth - 40;
  const maxH = area.clientHeight - 60;
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  splitState.scale = scale;
  mainCanvas.width = Math.round(img.width * scale);
  mainCanvas.height = Math.round(img.height * scale);
  overlayCanvas.width = mainCanvas.width;
  overlayCanvas.height = mainCanvas.height;
  document.getElementById('split-info-zoom').textContent = Math.round(scale * 100) + '%';
  drawMain();
  drawOverlay();
}

function drawMain() {
  const img = splitState.originalImage;
  if (!img) return;
  mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  if (splitState.processedImageData) {
    const tmpC = document.createElement('canvas');
    tmpC.width = img.width; tmpC.height = img.height;
    tmpC.getContext('2d').putImageData(splitState.processedImageData, 0, 0);
    mainCtx.drawImage(tmpC, 0, 0, mainCanvas.width, mainCanvas.height);
  } else {
    mainCtx.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);
  }
}

function drawOverlay() {
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (splitState.splitMode === 'rect') drawRectOverlay();
  else drawIrregularOverlay();
  const count = splitState.splitMode === 'rect' ? splitState.boxes.length : splitState.regions.length;
  document.getElementById('split-info-count').textContent = count;
}

function drawRectOverlay() {
  const s = splitState.scale;
  splitState.boxes.forEach((box, i) => {
    const x = box.x * s, y = box.y * s, w = box.w * s, h = box.h * s;
    overlayCtx.fillStyle = i === splitState.selectedBox ? 'rgba(88,166,255,0.2)' : 'rgba(88,166,255,0.08)';
    overlayCtx.fillRect(x, y, w, h);
    overlayCtx.strokeStyle = i === splitState.selectedBox ? '#79c0ff' : '#58a6ff';
    overlayCtx.lineWidth = i === splitState.selectedBox ? 2.5 : 1.5;
    overlayCtx.setLineDash(i === splitState.selectedBox ? [] : [4, 3]);
    overlayCtx.strokeRect(x, y, w, h);
    overlayCtx.setLineDash([]);
    overlayCtx.fillStyle = '#58a6ff';
    overlayCtx.font = 'bold 10px sans-serif';
    overlayCtx.fillText('#' + (i + 1), x + 3, y - 4 > 10 ? y - 4 : y + 12);
    overlayCtx.fillStyle = 'rgba(255,255,255,0.6)';
    overlayCtx.font = '9px sans-serif';
    overlayCtx.fillText(Math.round(box.w) + '×' + Math.round(box.h), x + 3, y + h - 3);
    if (i === splitState.selectedBox) {
      overlayCtx.fillStyle = '#fff';
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy]) => {
        overlayCtx.fillRect(hx - 4, hy - 4, 8, 8);
      });
    }
  });
}

function drawIrregularOverlay() {
  if (splitState.regions.length === 0) return;
  const img = splitState.originalImage;
  if (!img) return;
  const w = img.width, h = img.height;
  const s = splitState.scale;

  const offC = document.createElement('canvas');
  offC.width = w; offC.height = h;
  const offCtx = offC.getContext('2d');
  const imgData = offCtx.createImageData(w, h);
  const d = imgData.data;

  splitState.regions.forEach((region, ri) => {
    const isSelected = ri === splitState.selectedRegion;
    const isInnerChecked = splitState.innerSelectedRegions.has(ri);
    const colorHex = region.color;
    const cr = parseInt(colorHex.slice(1, 3), 16);
    const cg = parseInt(colorHex.slice(3, 5), 16);
    const cb = parseInt(colorHex.slice(5, 7), 16);
    const alpha = isSelected ? 100 : isInnerChecked ? 80 : 40;

    const pixelSet = region.pixelSet || new Uint8Array(w * h);
    region.pixels.forEach(([px, py]) => { pixelSet[py * w + px] = 1; });

    region.pixels.forEach(([px, py]) => {
      const idx = (py * w + px) * 4;
      d[idx] = cr; d[idx + 1] = cg; d[idx + 2] = cb; d[idx + 3] = alpha;
    });

    region.pixels.forEach(([px, py]) => {
      let isEdge = false;
      for (let dy = -1; dy <= 1 && !isEdge; dy++) {
        for (let dx = -1; dx <= 1 && !isEdge; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h || !pixelSet[ny * w + nx]) isEdge = true;
        }
      }
      if (isEdge) {
        const idx = (py * w + px) * 4;
        if (isInnerChecked) { d[idx] = 0; d[idx + 1] = 200; d[idx + 2] = 83; d[idx + 3] = 230; }
        else { d[idx] = isSelected ? 255 : cr; d[idx + 1] = isSelected ? 255 : cg; d[idx + 2] = isSelected ? 255 : cb; d[idx + 3] = isSelected ? 220 : 160; }
      }
    });
  });

  offCtx.putImageData(imgData, 0, 0);
  overlayCtx.imageSmoothingEnabled = false;
  overlayCtx.drawImage(offC, 0, 0, overlayCanvas.width, overlayCanvas.height);

  splitState.regions.forEach((region, ri) => {
    const b = region.bounds;
    const lx = (b.x + 2) * s, ly = (b.y - 2) * s;
    overlayCtx.fillStyle = region.color;
    const label = '#' + (ri + 1) + ' (' + region.area + 'px)';
    overlayCtx.font = (ri === splitState.selectedRegion ? 'bold ' : '') + '10px sans-serif';
    const tw = overlayCtx.measureText(label).width;
    overlayCtx.fillRect(lx - 1, ly - 12, tw + 6, 14);
    overlayCtx.fillStyle = '#fff';
    overlayCtx.fillText(label, lx + 2, ly - 1);
  });
}

function applyBgRemove() {
  if (!splitState.originalImage) return;
  const img = splitState.originalImage;
  const tmpC = document.createElement('canvas');
  tmpC.width = img.width; tmpC.height = img.height;
  const tmpCtx = tmpC.getContext('2d');
  if (splitState.processedImageData) tmpCtx.putImageData(splitState.processedImageData, 0, 0);
  else tmpCtx.drawImage(img, 0, 0);
  const imageData = tmpCtx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;
  const bgHex = document.getElementById('split-bg-color').value;
  const bgR = parseInt(bgHex.slice(1, 3), 16);
  const bgG = parseInt(bgHex.slice(3, 5), 16);
  const bgB = parseInt(bgHex.slice(5, 7), 16);
  const tol = parseInt(document.getElementById('split-bg-tolerance').value);

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bgR, dg = data[i + 1] - bgG, db = data[i + 2] - bgB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= tol * 2.55) data[i + 3] = Math.round(Math.min(255, (dist / (tol * 2.55)) * 255));
  }
  splitState.processedImageData = imageData;
  drawMain();
  showToast('背景已移除');
}

function autoGrid() {
  if (!splitState.originalImage) return;
  const cols = parseInt(document.getElementById('split-grid-cols').value);
  const rows = parseInt(document.getElementById('split-grid-rows').value);
  const iw = splitState.originalImage.width, ih = splitState.originalImage.height;
  const tw = iw / cols, th = ih / rows;
  splitState.boxes = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      splitState.boxes.push({ x: Math.round(c * tw), y: Math.round(r * th), w: Math.round(tw), h: Math.round(th) });
  splitState.selectedBox = -1;
  drawOverlay();
  showToast('已生成 ' + (cols * rows) + ' 个网格选框');
}

function smartDetectIrregular() {
  if (!splitState.originalImage) { showToast('请先上传图片', 'error'); return; }
  if (!splitState.irBgColor) { showToast('请先取背景色', 'error'); return; }

  showToast('正在分析图片...');

  const img = splitState.originalImage;
  const tmpC = document.createElement('canvas');
  tmpC.width = img.width; tmpC.height = img.height;
  const tmpCtx = tmpC.getContext('2d');
  tmpCtx.drawImage(img, 0, 0);
  const imageData = tmpCtx.getImageData(0, 0, img.width, img.height);

  worker.postMessage({
    type: 'irregularDetect',
    data: {
      imageData: { width: imageData.width, height: imageData.height, data: Array.from(imageData.data) },
      bgColor: splitState.irBgColor,
      outlineColor: splitState.irOutlineColor,
      outlineTolerance: parseInt(document.getElementById('split-outline-tolerance').value),
      sensitivity: parseInt(document.getElementById('split-detect-sensitivity').value),
      minArea: parseInt(document.getElementById('split-min-area').value),
      dilatePx: parseInt(document.getElementById('split-dilate-px').value),
    }
  });
}

export function handleIrregularDetectResult(regions) {
  if (regions.length === 0) { showToast('未检测到素材区域，请调高灵敏度', 'warning'); return; }
  splitState.regions = regions.map((r, i) => ({ ...r, color: REGION_COLORS[i % REGION_COLORS.length] }));
  splitState.selectedRegion = -1;
  splitState.innerSelectedRegions.clear();
  drawOverlay();
  updateRegionListUI();
  document.getElementById('ir-inner-bg-section').style.display = 'block';
  showToast('检测到 ' + regions.length + ' 个异形区域');
}

function applyInnerBgRemove() {
  if (!splitState.innerBgColor) { showToast('请先取内部背景色', 'error'); return; }
  if (splitState.innerSelectedRegions.size === 0) { showToast('请先勾选要抠图的区域', 'error'); return; }

  const img = splitState.originalImage;
  const tmpC = document.createElement('canvas');
  tmpC.width = img.width; tmpC.height = img.height;
  const tmpCtx = tmpC.getContext('2d');
  tmpCtx.drawImage(img, 0, 0);
  const imageData = tmpCtx.getImageData(0, 0, img.width, img.height);

  worker.postMessage({
    type: 'innerContourRemove',
    data: {
      imageData: { width: imageData.width, height: imageData.height, data: Array.from(imageData.data) },
      regions: splitState.regions.map(r => ({
        pixels: r.pixels, bounds: r.bounds, area: r.area,
      })),
      selectedIndices: Array.from(splitState.innerSelectedRegions),
      innerBgColor: splitState.innerBgColor,
      innerOutlineColor: splitState.innerOutlineColor,
      innerTolerance: parseInt(document.getElementById('split-inner-tolerance').value),
      innerDilatePx: parseInt(document.getElementById('split-inner-dilate-px').value),
    }
  });
}

export function handleInnerContourRemoveResult(updatedRegions) {
  updatedRegions.forEach((updated, i) => {
    if (splitState.regions[i]) {
      Object.assign(splitState.regions[i], updated);
    }
  });
  splitState.innerSelectedRegions.clear();
  drawOverlay();
  updateRegionListUI();
  showToast('内轮廓抠图完成');
}

function updateRegionListUI() {
  const container = document.getElementById('region-list');
  if (splitState.regions.length === 0) {
    container.innerHTML = '<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px 0">点击上方按钮开始检测</p>';
    return;
  }
  container.innerHTML = '';
  splitState.regions.forEach((r, i) => {
    const isChecked = splitState.innerSelectedRegions.has(i);
    const isSelected = i === splitState.selectedRegion;
    const div = document.createElement('div');
    div.className = 'region-item' + (isSelected ? ' selected' : '') + (isChecked ? ' inner-checked' : '');
    div.innerHTML = `
      <input type="checkbox" class="inner-cb" ${isChecked ? 'checked' : ''}>
      <span class="color-dot" style="background:${r.color}"></span>
      <span class="info">#${i + 1} ${r.bounds.w}×${r.bounds.h} (${r.area}px)</span>
      <button class="del-btn" data-idx="${i}">×</button>
    `;
    const cb = div.querySelector('.inner-cb');
    cb.addEventListener('click', (e) => {
      e.stopPropagation();
      if (cb.checked) splitState.innerSelectedRegions.add(i);
      else splitState.innerSelectedRegions.delete(i);
      div.classList.toggle('inner-checked', cb.checked);
      drawOverlay();
    });
    div.addEventListener('click', () => {
      if (splitState.innerSelectedRegions.has(i)) splitState.innerSelectedRegions.delete(i);
      else splitState.innerSelectedRegions.add(i);
      splitState.selectedRegion = i;
      updateRegionListUI();
      drawOverlay();
    });
    div.querySelector('.del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      splitState.regions.splice(i, 1);
      splitState.selectedRegion = -1;
      updateRegionListUI();
      drawOverlay();
    });
    container.appendChild(div);
  });
}

async function splitAndDownload() {
  const isIrregular = splitState.splitMode === 'irregular';
  const items = isIrregular ? splitState.regions : splitState.boxes;
  if (items.length === 0) { showToast('请先创建选框或检测区域', 'error'); return; }

  const img = splitState.originalImage;
  const format = document.getElementById('split-format').value;
  const trim = document.getElementById('split-trim').checked;
  const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
  const ext = format === 'webp' ? '.webp' : '.png';

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = img.width; srcCanvas.height = img.height;
  const srcCtx = srcCanvas.getContext('2d');
  if (splitState.processedImageData) srcCtx.putImageData(splitState.processedImageData, 0, 0);
  else srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, img.width, img.height);

  const zip = new JSZip();

  if (isIrregular) {
    splitState.regions.forEach((region, i) => {
      const b = region.bounds;
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = b.w; tileCanvas.height = b.h;
      const tileCtx = tileCanvas.getContext('2d');
      const tileData = tileCtx.createImageData(b.w, b.h);
      const td = tileData.data;
      const sd = srcData.data;
      region.pixels.forEach(([px, py]) => {
        const sx = (py * img.width + px) * 4;
        const dx = ((py - b.y) * b.w + (px - b.x)) * 4;
        td[dx] = sd[sx]; td[dx + 1] = sd[sx + 1]; td[dx + 2] = sd[sx + 2]; td[dx + 3] = sd[sx + 3];
      });
      tileCtx.putImageData(tileData, 0, 0);
      let finalCanvas = tileCanvas;
      if (trim) finalCanvas = trimCanvas(tileCanvas);
      const dataUrl = finalCanvas.toDataURL(mimeType, 0.95);
      zip.file('tile_' + String(i + 1).padStart(3, '0') + ext, dataUrl.split(',')[1], { base64: true });
    });
  } else {
    splitState.boxes.forEach((box, i) => {
      let sx = Math.round(box.x), sy = Math.round(box.y);
      let sw = Math.round(box.w), sh = Math.round(box.h);
      sx = Math.max(0, sx); sy = Math.max(0, sy);
      sw = Math.min(img.width - sx, sw); sh = Math.min(img.height - sy, sh);
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = sw; tileCanvas.height = sh;
      tileCanvas.getContext('2d').drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
      let finalCanvas = tileCanvas;
      if (trim) finalCanvas = trimCanvas(tileCanvas);
      const dataUrl = finalCanvas.toDataURL(mimeType, 0.95);
      zip.file('tile_' + String(i + 1).padStart(3, '0') + ext, dataUrl.split(',')[1], { base64: true });
    });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tiles_split.zip';
  a.click();
  URL.revokeObjectURL(url);
  showToast('已下载 ' + items.length + ' 张素材');
}

function trimCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let top = canvas.height, left = canvas.width, right = 0, bottom = 0;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 0) {
        if (y < top) top = y; if (y > bottom) bottom = y;
        if (x < left) left = x; if (x > right) right = x;
      }
    }
  }
  if (top >= bottom || left >= right) return canvas;
  const w = right - left + 1, h = bottom - top + 1;
  const trimmed = document.createElement('canvas');
  trimmed.width = w; trimmed.height = h;
  trimmed.getContext('2d').drawImage(canvas, left, top, w, h, 0, 0, w, h);
  return trimmed;
}

export function handleSplitKey(e, step) {
  if (splitState.splitMode !== 'rect' || splitState.selectedBox < 0) return;
  const box = splitState.boxes[splitState.selectedBox];
  if (e === 'ArrowLeft') box.x = Math.max(0, box.x - step);
  else if (e === 'ArrowRight') box.x = box.x + step;
  else if (e === 'ArrowUp') box.y = Math.max(0, box.y - step);
  else if (e === 'ArrowDown') box.y = box.y + step;
  drawOverlay();
}

export function deleteSelectedSplit() {
  if (splitState.splitMode === 'rect' && splitState.selectedBox >= 0) {
    splitState.boxes.splice(splitState.selectedBox, 1); splitState.selectedBox = -1; drawOverlay();
  } else if (splitState.splitMode === 'irregular' && splitState.selectedRegion >= 0) {
    splitState.regions.splice(splitState.selectedRegion, 1); splitState.selectedRegion = -1; updateRegionListUI(); drawOverlay();
  }
}

export function cancelSplitAction() {
  if (splitState.irColorPickMode) {
    splitState.irColorPickMode = null;
    overlayCanvas.style.cursor = splitState.splitMode === 'rect' ? 'crosshair' : 'pointer';
  }
  splitState.selectedBox = -1;
  splitState.selectedRegion = -1;
  splitState.dragging = false;
  drawOverlay();
  updateRegionListUI();
}

export function resizeSplitView() {
  if (splitState.originalImage) fitAndDraw();
}

function showToast(msg, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'info');
  toast.innerHTML = '<span class="toast-icon">' + ({ success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[type || 'info'] || '') + '</span><span class="toast-message">' + msg + '</span>';
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
}
