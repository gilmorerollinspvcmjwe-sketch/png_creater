import JSZip from 'jszip';

const REGION_COLORS = [
  '#e94560', '#3fb950', '#58a6ff', '#d29922', '#bc8cff',
  '#00bcd4', '#ff6d00', '#64dd17', '#d500f9', '#304ffe',
];

const mergeState = {
  images: [],
};

export function initMergeMode() {
  setupMergeEvents();
}

function setupMergeEvents() {
  const fileInput = document.getElementById('merge-files-input');
  const uploadZone = document.getElementById('merge-upload-zone');

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleMergeFiles(e.target.files));

  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault(); uploadZone.classList.remove('dragover');
    handleMergeFiles(e.dataTransfer.files);
  });

  ['merge-cols', 'merge-pad-x', 'merge-pad-y', 'merge-padding'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      document.getElementById(id + '-val').textContent = el.value;
      updateMergePreview();
    });
  });

  document.getElementById('merge-uniform')?.addEventListener('change', updateMergePreview);
  document.getElementById('merge-bg-transparent')?.addEventListener('change', (e) => {
    document.getElementById('merge-bg-color-group').style.display = e.target.checked ? 'none' : 'block';
  });
  document.getElementById('merge-bg-color')?.addEventListener('change', updateMergePreview);

  document.getElementById('merge-sort-name-btn')?.addEventListener('click', () => {
    mergeState.images.sort((a, b) => a.name.localeCompare(b.name));
    updateMergePreview();
  });
  document.getElementById('merge-sort-size-btn')?.addEventListener('click', () => {
    mergeState.images.sort((a, b) => (b.img.width * b.img.height) - (a.img.width * a.img.height));
    updateMergePreview();
  });
  document.getElementById('merge-clear-btn')?.addEventListener('click', () => { mergeState.images = []; updateMergePreview(); });
  document.getElementById('merge-add-btn')?.addEventListener('click', () => fileInput.click());
  document.getElementById('merge-download-btn')?.addEventListener('click', mergeAndDownload);
}

export function handleMergeFiles(files) {
  const promises = Array.from(files).map(file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve({ name: file.name, img, dataUrl: e.target.result });
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  }));

  Promise.all(promises).then(results => {
    const valid = results.filter(Boolean);
    mergeState.images.push(...valid);
    updateMergePreview();
    if (valid.length > 0) showToast('已添加 ' + valid.length + ' 张图片');
  });
}

function updateMergePreview() {
  const imgs = mergeState.images;
  if (imgs.length === 0) {
    document.getElementById('merge-empty').style.display = '';
    document.getElementById('merge-preview-container').style.display = 'none';
    document.getElementById('merge-download-btn').disabled = true;
    document.getElementById('merge-count').textContent = '';
    return;
  }
  document.getElementById('merge-empty').style.display = 'none';
  document.getElementById('merge-preview-container').style.display = 'block';
  document.getElementById('merge-download-btn').disabled = false;
  document.getElementById('merge-count').textContent = '共 ' + imgs.length + ' 张素材';

  const cols = parseInt(document.getElementById('merge-cols').value);
  const grid = document.getElementById('merge-grid');
  grid.style.gridTemplateColumns = 'repeat(' + Math.min(cols, imgs.length) + ', 80px)';
  grid.innerHTML = '';
  imgs.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'merge-item'; div.style.height = '80px';
    div.innerHTML = '<span class="idx">' + (i + 1) + '</span><img src="' + item.dataUrl + '" title="' + item.name + '"><button class="del-btn" data-idx="' + i + '">×</button>';
    div.querySelector('.del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      mergeState.images.splice(i, 1);
      updateMergePreview();
    });
    grid.appendChild(div);
  });
}

async function mergeAndDownload() {
  if (mergeState.images.length === 0) return;

  const cols = parseInt(document.getElementById('merge-cols').value);
  const padX = parseInt(document.getElementById('merge-pad-x').value);
  const padY = parseInt(document.getElementById('merge-pad-y').value);
  const padding = parseInt(document.getElementById('merge-padding').value);
  const uniform = document.getElementById('merge-uniform').checked;
  const transparent = document.getElementById('merge-bg-transparent').checked;
  const bgColor = document.getElementById('merge-bg-color').value;
  const format = document.getElementById('merge-format').value;
  const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
  const ext = format === 'webp' ? '.webp' : '.png';
  const imgs = mergeState.images;

  let cellW = 0, cellH = 0;
  if (uniform) imgs.forEach(item => { cellW = Math.max(cellW, item.img.width); cellH = Math.max(cellH, item.img.height); });

  let maxRowW = 0, totalH = 0, rowH = 0, rowW = 0, rowCount = 0;
  imgs.forEach((item, i) => {
    const iw = uniform ? cellW : item.img.width;
    const ih = uniform ? cellH : item.img.height;
    rowW += iw; rowH = Math.max(rowH, ih); rowCount++;
    if (rowCount === cols || i === imgs.length - 1) {
      maxRowW = Math.max(maxRowW, rowW + (rowCount - 1) * padX);
      totalH += rowH;
      if (i < imgs.length - 1) totalH += padY;
      rowW = 0; rowH = 0; rowCount = 0;
    }
  });

  const canvasW = maxRowW + padding * 2;
  const canvasH = totalH + padding * 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvasW; canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!transparent) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvasW, canvasH); }

  let cx = padding, cy = padding, curRowH = 0, colIdx = 0;
  imgs.forEach((item) => {
    const iw = uniform ? cellW : item.img.width;
    const ih = uniform ? cellH : item.img.height;
    const ox = uniform ? cx + (cellW - item.img.width) / 2 : cx;
    const oy = uniform ? cy + (cellH - item.img.height) / 2 : cy;
    ctx.drawImage(item.img, ox, oy);
    curRowH = Math.max(curRowH, ih); cx += iw + padX; colIdx++;
    if (colIdx === cols) { cy += curRowH + padY; cx = padding; curRowH = 0; colIdx = 0; }
  });

  const resultCanvas = document.getElementById('merge-result-canvas');
  resultCanvas.width = canvasW; resultCanvas.height = canvasH;
  resultCanvas.getContext('2d').drawImage(canvas, 0, 0);
  document.getElementById('merge-result-container').style.display = 'block';

  const dataUrl = canvas.toDataURL(mimeType, 0.95);
  const a = document.createElement('a');
  a.href = dataUrl; a.download = 'tilemap_merged' + ext; a.click();
  showToast('合并完成! (' + canvasW + '×' + canvasH + ')');
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
