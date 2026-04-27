import JSZip from 'jszip';

const state = {
  originalImage: null,
  originalImageData: null,
  processedImageData: null,
  bgMask: null,
  candidates: [],
  selectedCandidates: new Set(),
  fileName: '',
  fileWidth: 0,
  fileHeight: 0,
  selectedBgColor: null,
};

const elements = {
  fileInput: document.getElementById('file-input'),
  uploadBtn: document.getElementById('upload-btn'),
  replaceBtn: document.getElementById('replace-btn'),
  uploadArea: document.getElementById('upload-area'),
  originalPreview: document.getElementById('original-preview'),
  fileName: document.getElementById('file-name'),
  fileSize: document.getElementById('file-size'),
  fileDimension: document.getElementById('file-dimension'),
  bgMode: document.getElementById('bg-mode'),
  tolerance: document.getElementById('tolerance'),
  toleranceValue: document.getElementById('tolerance-value'),
  edgeRemoval: document.getElementById('edge-removal'),
  edgeRemovalValue: document.getElementById('edge-removal-value'),
  mergeDistance: document.getElementById('merge-distance'),
  mergeDistanceValue: document.getElementById('merge-distance-value'),
  minArea: document.getElementById('min-area'),
  minAreaValue: document.getElementById('min-area-value'),
  padding: document.getElementById('padding'),
  paddingValue: document.getElementById('padding-value'),
  processBtn: document.getElementById('process-btn'),
  colorPickerBtn: document.getElementById('color-picker-btn'),
  transparentPreview: document.getElementById('transparent-preview'),
  previewContainer: document.getElementById('preview-container'),
  darkBgToggle: document.getElementById('dark-bg-toggle'),
  lightBgToggle: document.getElementById('light-bg-toggle'),
  candidateCount: document.getElementById('candidate-count'),
  candidatesGrid: document.getElementById('candidates-grid'),
  exportSelectedBtn: document.getElementById('export-selected-btn'),
  exportAllBtn: document.getElementById('export-all-btn'),
  downloadZipBtn: document.getElementById('download-zip-btn'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingText: document.getElementById('loading-text'),
};

let worker = null;
let colorPickerMode = false;

async function init() {
  try {
    const response = await fetch('/src/workers/imageProcessor.js');
    const workerCode = await response.text();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    worker = new Worker(workerUrl);
  } catch (e) {
    console.error('Failed to create worker:', e);
    alert('无法创建图像处理 Worker，请刷新页面重试');
    return;
  }
  
  worker.onmessage = function(e) {
    const { type, result, assets, error } = e.data;
    
    switch (type) {
      case 'processImageResult':
        handleProcessedImage(result);
        break;
      case 'detectAssetsResult':
        handleDetectedAssets(assets);
        break;
      case 'error':
        console.error('Worker 错误:', error);
        clearTimeout(processTimeout);
        hideLoading();
        alert('处理出错: ' + error);
        break;
    }
  };
  
  worker.onerror = function(e) {
    console.error('Worker error:', e);
    hideLoading();
    alert('处理图片时出错: ' + e.message);
  };
  
  setupEventListeners();
}

function setupEventListeners() {
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
  elements.replaceBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', handleFileSelect);
  
  elements.uploadArea.addEventListener('dragover', handleDragOver);
  elements.uploadArea.addEventListener('dragleave', handleDragLeave);
  elements.uploadArea.addEventListener('drop', handleDrop);
  elements.uploadArea.addEventListener('click', (e) => {
    if (!state.originalImage) {
      elements.fileInput.click();
    }
  });
  
  elements.tolerance.addEventListener('input', (e) => {
    elements.toleranceValue.textContent = e.target.value;
  });
  elements.toleranceValue.textContent = elements.tolerance.value;
  
  elements.edgeRemoval.addEventListener('input', (e) => {
    elements.edgeRemovalValue.textContent = e.target.value;
  });
  
  elements.mergeDistance.addEventListener('input', (e) => {
    elements.mergeDistanceValue.textContent = e.target.value;
  });
  
  elements.minArea.addEventListener('input', (e) => {
    elements.minAreaValue.textContent = e.target.value;
  });
  
  elements.padding.addEventListener('input', (e) => {
    elements.paddingValue.textContent = e.target.value;
  });
  
  elements.processBtn.addEventListener('click', processImage);
  
  elements.colorPickerBtn.addEventListener('click', () => {
    if (!state.originalImage) {
      alert('请先上传图片');
      return;
    }
    colorPickerMode = !colorPickerMode;
    elements.colorPickerBtn.textContent = colorPickerMode ? '点击原图取背景色' : '点击背景取色';
    if (colorPickerMode) {
      elements.originalPreview.style.cursor = 'crosshair';
    } else {
      elements.originalPreview.style.cursor = 'default';
    }
  });
  
  elements.originalPreview.addEventListener('click', handleImageClick);
  
  elements.darkBgToggle.addEventListener('change', updatePreviewBackground);
  elements.lightBgToggle.addEventListener('change', updatePreviewBackground);
  
  elements.exportSelectedBtn.addEventListener('click', exportSelected);
  elements.exportAllBtn.addEventListener('click', exportAll);
  elements.downloadZipBtn.addEventListener('click', downloadZip);
  
  // 取色按钮始终可用
  // elements.bgMode.addEventListener('change', (e) => {
  //   if (e.target.value === 'solid') {
  //     elements.colorPickerBtn.hidden = false;
  //   } else {
  //     elements.colorPickerBtn.hidden = true;
  //     colorPickerMode = false;
  //   }
  // });
}

function handleDragOver(e) {
  e.preventDefault();
  elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  elements.uploadArea.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFile(file) {
  if (!file.type.match(/image\/(png|jpeg|webp)/)) {
    alert('请上传 PNG、JPG 或 WEBP 格式的图片');
    return;
  }
  
  if (file.size > 25 * 1024 * 1024) {
    alert('图片大小不能超过 25MB');
    return;
  }
  
  state.fileName = file.name;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.originalImage = img;
      state.fileWidth = img.width;
      state.fileHeight = img.height;
      
      elements.originalPreview.src = e.target.result;
      elements.originalPreview.hidden = false;
      elements.uploadArea.querySelector('.upload-placeholder').style.display = 'none';
      
      elements.fileName.textContent = file.name;
      elements.fileSize.textContent = formatFileSize(file.size);
      elements.fileDimension.textContent = `${img.width} x ${img.height}`;
      
      elements.replaceBtn.disabled = false;
      elements.processBtn.disabled = false;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleImageClick(e) {
  if (!colorPickerMode || !state.originalImageData) return;
  
  const rect = elements.originalPreview.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / rect.width * state.fileWidth);
  const y = Math.floor((e.clientY - rect.top) / rect.height * state.fileHeight);
  
  const idx = (y * state.fileWidth + x) * 4;
  const r = state.originalImageData.data[idx];
  const g = state.originalImageData.data[idx + 1];
  const b = state.originalImageData.data[idx + 2];
  
  state.selectedBgColor = [r, g, b];
  colorPickerMode = false;
  elements.originalPreview.style.cursor = 'default';
  elements.colorPickerBtn.textContent = `已选颜色: rgb(${r}, ${g}, ${b})`;
  
  // 自动切换到纯色模式并处理
  elements.bgMode.value = 'solid';
  console.log('取色完成，颜色:', [r, g, b], '自动切换到纯色模式');
  
  // 自动开始处理
  setTimeout(() => {
    processImage();
  }, 100);
}

function showLoading(text) {
  elements.loadingText.textContent = text;
  elements.loadingOverlay.hidden = false;
}

function hideLoading() {
  elements.loadingOverlay.hidden = true;
}

let processTimeout = null;

function processImage() {
  if (!state.originalImage) return;
  
  showLoading('正在处理图片...');
  console.log('开始处理图片:', state.fileWidth, 'x', state.fileHeight);
  
  const canvas = document.createElement('canvas');
  canvas.width = state.fileWidth;
  canvas.height = state.fileHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(state.originalImage, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  state.originalImageData = imageData;
  
  console.log('图片数据已获取，发送给 Worker');
  
  worker.postMessage({
    type: 'processImage',
    data: {
      imageData: {
        width: imageData.width,
        height: imageData.height,
        data: Array.from(imageData.data)
      },
      bgMode: elements.bgMode.value,
      tolerance: parseInt(elements.tolerance.value),
      edgeRemoval: parseInt(elements.edgeRemoval.value),
      selectedColor: state.selectedBgColor
    }
  });
  
  processTimeout = setTimeout(() => {
    console.error('处理超时');
    hideLoading();
    alert('处理超时，请尝试使用更小的图片或刷新页面');
  }, 30000);
}

function handleProcessedImage(result) {
  console.log('收到处理结果');
  clearTimeout(processTimeout);
  
  const { imageData, bgMask } = result;
  
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  
  const newImageData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  ctx.putImageData(newImageData, 0, 0);
  
  state.processedImageData = newImageData;
  state.bgMask = new Uint8Array(bgMask);
  
  elements.transparentPreview.src = canvas.toDataURL();
  elements.transparentPreview.hidden = false;
  
  detectAssets();
}

function detectAssets() {
  showLoading('正在识别候选素材...');
  console.log('开始识别素材');
  
  worker.postMessage({
    type: 'detectAssets',
    data: {
      imageData: {
        width: state.processedImageData.width,
        height: state.processedImageData.height,
        data: Array.from(state.processedImageData.data)
      },
      bgMask: Array.from(state.bgMask),
      mergeDistance: parseInt(elements.mergeDistance.value),
      minArea: parseInt(elements.minArea.value),
      padding: parseInt(elements.padding.value)
    }
  });
  
  processTimeout = setTimeout(() => {
    console.error('识别素材超时');
    hideLoading();
    alert('识别素材超时，请尝试调整参数或刷新页面');
  }, 30000);
}

function handleDetectedAssets(assets) {
  console.log('收到素材识别结果:', assets.length, '个素材');
  clearTimeout(processTimeout);
  
  state.candidates = assets;
  state.selectedCandidates = new Set(assets.map(a => a.id));
  
  elements.candidateCount.textContent = assets.length;
  
  renderCandidates();
  
  elements.exportSelectedBtn.disabled = assets.length === 0;
  elements.exportAllBtn.disabled = assets.length === 0;
  elements.downloadZipBtn.disabled = assets.length === 0;
  
  hideLoading();
}

function renderCandidates() {
  elements.candidatesGrid.innerHTML = '';
  
  if (state.candidates.length === 0) {
    elements.candidatesGrid.innerHTML = '<div class="empty-state"><p>未识别到候选素材</p></div>';
    return;
  }
  
  for (const candidate of state.candidates) {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.dataset.id = candidate.id;
    
    if (state.selectedCandidates.has(candidate.id)) {
      card.classList.add('selected');
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = candidate.w;
    canvas.height = candidate.h;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(
      new Uint8ClampedArray(candidate.imageData.data),
      candidate.w,
      candidate.h
    );
    ctx.putImageData(imageData, 0, 0);
    
    card.innerHTML = `
      <div class="candidate-preview">
        <img src="${canvas.toDataURL()}" alt="${candidate.name}">
      </div>
      <div class="candidate-info">
        <input type="text" value="${candidate.name}" data-id="${candidate.id}" class="candidate-name-input">
        <div class="candidate-meta">${candidate.w} x ${candidate.h} | (${candidate.x}, ${candidate.y})</div>
        <div class="candidate-actions">
          <button class="btn btn-danger btn-delete" data-id="${candidate.id}">删除</button>
          <button class="btn btn-secondary btn-download" data-id="${candidate.id}">下载</button>
        </div>
      </div>
    `;
    
    elements.candidatesGrid.appendChild(card);
  }
  
  document.querySelectorAll('.candidate-name-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id);
      const candidate = state.candidates.find(c => c.id === id);
      if (candidate) {
        candidate.name = sanitizeFileName(e.target.value);
      }
    });
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      deleteCandidate(id);
    });
  });
  
  document.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      downloadSingleCandidate(id);
    });
  });
  
  document.querySelectorAll('.candidate-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      
      const id = parseInt(card.dataset.id);
      toggleCandidateSelection(id);
    });
  });
}

function deleteCandidate(id) {
  state.candidates = state.candidates.filter(c => c.id !== id);
  state.selectedCandidates.delete(id);
  
  elements.candidateCount.textContent = state.candidates.length;
  renderCandidates();
  
  updateExportButtons();
}

function toggleCandidateSelection(id) {
  if (state.selectedCandidates.has(id)) {
    state.selectedCandidates.delete(id);
  } else {
    state.selectedCandidates.add(id);
  }
  
  renderCandidates();
  updateExportButtons();
}

function updateExportButtons() {
  const hasSelected = state.selectedCandidates.size > 0;
  elements.exportSelectedBtn.disabled = !hasSelected;
  elements.exportAllBtn.disabled = state.candidates.length === 0;
  elements.downloadZipBtn.disabled = state.candidates.length === 0;
}

function downloadSingleCandidate(id) {
  const candidate = state.candidates.find(c => c.id === id);
  if (!candidate) return;
  
  const canvas = document.createElement('canvas');
  canvas.width = candidate.w;
  canvas.height = candidate.h;
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(
    new Uint8ClampedArray(candidate.imageData.data),
    candidate.w,
    candidate.h
  );
  ctx.putImageData(imageData, 0, 0);
  
  const link = document.createElement('a');
  link.download = `${candidate.name}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function updatePreviewBackground() {
  elements.previewContainer.classList.remove('dark-bg', 'light-bg');
  
  if (elements.darkBgToggle.checked) {
    elements.previewContainer.classList.add('dark-bg');
  } else if (elements.lightBgToggle.checked) {
    elements.previewContainer.classList.add('light-bg');
  }
}

async function exportSelected() {
  const selected = state.candidates.filter(c => state.selectedCandidates.has(c.id));
  await exportCandidates(selected);
}

async function exportAll() {
  await exportCandidates(state.candidates);
}

async function exportCandidates(candidates) {
  if (candidates.length === 0) {
    alert('没有可导出的素材');
    return;
  }
  
  showLoading('正在导出素材...');
  
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');
  const manifest = [];
  
  for (const candidate of candidates) {
    const canvas = document.createElement('canvas');
    canvas.width = candidate.w;
    canvas.height = candidate.h;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(
      new Uint8ClampedArray(candidate.imageData.data),
      candidate.w,
      candidate.h
    );
    ctx.putImageData(imageData, 0, 0);
    
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const fileName = `${candidate.name}.png`;
    
    imagesFolder.file(fileName, blob);
    
    manifest.push({
      name: candidate.name,
      file: fileName,
      width: candidate.w,
      height: candidate.h,
      sourceX: candidate.x,
      sourceY: candidate.y,
      sourceWidth: candidate.w,
      sourceHeight: candidate.h
    });
  }
  
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  
  const previewHtml = generatePreviewHtml(manifest);
  zip.file('preview.html', previewHtml);
  
  const content = await zip.generateAsync({ type: 'blob' });
  
  const link = document.createElement('a');
  link.download = 'asset-cutout-export.zip';
  link.href = URL.createObjectURL(content);
  link.click();
  
  hideLoading();
}

function generatePreviewHtml(manifest) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>素材预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 24px;
      background: #1a1a2e;
      color: #e6e6e6;
    }
    h1 {
      text-align: center;
      margin-bottom: 32px;
      font-size: 28px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 24px;
    }
    .card {
      background: #16213e;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #2a2a4a;
    }
    .preview {
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: 
        linear-gradient(45deg, #808080 25%, transparent 25%),
        linear-gradient(-45deg, #808080 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #808080 75%),
        linear-gradient(-45deg, transparent 75%, #808080 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
      background-color: #cccccc;
    }
    .preview img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }
    .preview-dark {
      background: #1a1a1a;
    }
    .info {
      padding: 12px;
    }
    .info h3 {
      font-size: 16px;
      margin-bottom: 8px;
    }
    .info p {
      font-size: 12px;
      color: #b0b0b0;
    }
    .section-title {
      grid-column: 1 / -1;
      font-size: 20px;
      margin: 32px 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #2a2a4a;
    }
  </style>
</head>
<body>
  <h1>素材预览</h1>
  
  <h2 class="section-title">浅色背景预览</h2>
  <div class="grid">
    ${manifest.map(item => `
      <div class="card">
        <div class="preview">
          <img src="images/${item.file}" alt="${item.name}">
        </div>
        <div class="info">
          <h3>${item.name}</h3>
          <p>尺寸: ${item.width} x ${item.height}</p>
          <p>坐标: (${item.sourceX}, ${item.sourceY})</p>
        </div>
      </div>
    `).join('')}
  </div>
  
  <h2 class="section-title">深色背景预览</h2>
  <div class="grid">
    ${manifest.map(item => `
      <div class="card">
        <div class="preview preview-dark">
          <img src="images/${item.file}" alt="${item.name}">
        </div>
        <div class="info">
          <h3>${item.name}</h3>
          <p>尺寸: ${item.width} x ${item.height}</p>
          <p>坐标: (${item.sourceX}, ${item.sourceY})</p>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
}

async function downloadZip() {
  await exportAll();
}

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unnamed';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

await init();
