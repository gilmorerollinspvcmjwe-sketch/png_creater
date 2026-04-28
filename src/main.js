import JSZip from 'jszip';
import { getState, setState, setStep, subscribe, notify, selectAllFiles, deselectAllFiles, clearFiles } from './modules/stateManager.js';
import { initUploadManager, handleFiles, renderUploadQueue, deleteFile as deleteBatchFile } from './modules/uploadManager.js';
import { initProcessManager, startBatchProcess, cancelBatchProcess, renderProcessPanel } from './modules/processManager.js';
import { initNamingManager, renderNamingPreview } from './modules/namingManager.js';
import { initDownloadManager, startBatchDownload, renderDownloadPanel } from './modules/downloadManager.js';
import { initSplitMode } from './modules/splitMode/splitController.js';
import { initMergeMode } from './modules/mergeMode/mergeController.js';

let currentMode = 'single';

const singleState = {
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
  pickMode: null, // null | 'bg' | 'outline' | 'innerBg' | 'innerOutline'
  irMode: {
    bgColor: null,
    outlineColor: null,
    regions: [],
    selectedRegions: new Set(),
    innerBgColor: null,
    innerOutlineColor: null,
  },
};

const singleElements = {
  fileInput: null,
  uploadBtn: null,
  replaceBtn: null,
  uploadArea: null,
  originalPreview: null,
  fileName: null,
  fileSize: null,
  fileDimension: null,
  bgMode: null,
  tolerance: null,
  toleranceValue: null,
  edgeRemoval: null,
  edgeRemovalValue: null,
  mergeDistance: null,
  mergeDistanceValue: null,
  minArea: null,
  minAreaValue: null,
  padding: null,
  paddingValue: null,
  processBtn: null,
  colorPickerBtn: null,
  transparentPreview: null,
  previewContainer: null,
  darkBgToggle: null,
  lightBgToggle: null,
  candidateCount: null,
  candidatesGrid: null,
  exportSelectedBtn: null,
  exportAllBtn: null,
  downloadZipBtn: null,
  loadingOverlay: null,
  loadingText: null,
};

let worker = null;
let colorPickerMode = false;
let processTimeout = null;

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

  cacheSingleElements();
  setupSingleEventListeners();
  setupModeSwitch();

  await initProcessManager();
  initUploadManager();
  initNamingManager();
  initDownloadManager();
  setupBatchStepNavigation();
  setupBatchSubscriptions();

  initSplitMode(worker);
  initMergeMode();
}

function cacheSingleElements() {
  singleElements.fileInput = document.getElementById('file-input');
  singleElements.uploadBtn = document.getElementById('upload-btn');
  singleElements.replaceBtn = document.getElementById('replace-btn');
  singleElements.uploadArea = document.getElementById('upload-area');
  singleElements.originalPreview = document.getElementById('original-preview');
  singleElements.clearUploadBtn = document.getElementById('clear-upload-btn');
  singleElements.fileName = document.getElementById('file-name');
  singleElements.fileSize = document.getElementById('file-size');
  singleElements.fileDimension = document.getElementById('file-dimension');
  singleElements.bgMode = document.getElementById('bg-mode');
  singleElements.tolerance = document.getElementById('tolerance');
  singleElements.toleranceValue = document.getElementById('tolerance-value');
  singleElements.edgeRemoval = document.getElementById('edge-removal');
  singleElements.edgeRemovalValue = document.getElementById('edge-removal-value');
  singleElements.mergeDistance = document.getElementById('merge-distance');
  singleElements.mergeDistanceValue = document.getElementById('merge-distance-value');
  singleElements.minArea = document.getElementById('min-area');
  singleElements.minAreaValue = document.getElementById('min-area-value');
  singleElements.padding = document.getElementById('padding');
  singleElements.paddingValue = document.getElementById('padding-value');
  singleElements.processBtn = document.getElementById('process-btn');
  singleElements.colorPickerBtn = document.getElementById('color-picker-btn');
  singleElements.transparentPreview = document.getElementById('transparent-preview');
  singleElements.previewContainer = document.getElementById('preview-container');
  singleElements.darkBgToggle = document.getElementById('dark-bg-toggle');
  singleElements.lightBgToggle = document.getElementById('light-bg-toggle');
  singleElements.candidateCount = document.getElementById('candidate-count');
  singleElements.candidatesGrid = document.getElementById('candidates-grid');
  singleElements.exportSelectedBtn = document.getElementById('export-selected-btn');
  singleElements.exportAllBtn = document.getElementById('export-all-btn');
  singleElements.downloadZipBtn = document.getElementById('download-zip-btn');
  singleElements.loadingOverlay = document.getElementById('loading-overlay');
  singleElements.loadingText = document.getElementById('loading-text');
}

function setupSingleEventListeners() {
  const el = singleElements;

  if (el.uploadBtn) el.uploadBtn.addEventListener('click', () => el.fileInput.click());
  if (el.replaceBtn) el.replaceBtn.addEventListener('click', () => el.fileInput.click());
  if (el.fileInput) el.fileInput.addEventListener('change', handleFileSelect);

  if (el.uploadArea) {
    el.uploadArea.addEventListener('dragover', handleDragOver);
    el.uploadArea.addEventListener('dragleave', handleDragLeave);
    el.uploadArea.addEventListener('drop', handleDrop);
    el.uploadArea.addEventListener('click', () => {
      if (!singleState.originalImage) {
        el.fileInput.click();
      }
    });
  }

  if (el.tolerance) el.tolerance.addEventListener('input', (e) => {
    el.toleranceValue.textContent = e.target.value;
  });

  if (el.edgeRemoval) el.edgeRemoval.addEventListener('input', (e) => {
    el.edgeRemovalValue.textContent = e.target.value;
  });

  if (el.mergeDistance) el.mergeDistance.addEventListener('input', (e) => {
    el.mergeDistanceValue.textContent = e.target.value;
  });

  if (el.minArea) el.minArea.addEventListener('input', (e) => {
    el.minAreaValue.textContent = e.target.value;
  });

  if (el.padding) el.padding.addEventListener('input', (e) => {
    el.paddingValue.textContent = e.target.value;
  });

  if (el.processBtn) el.processBtn.addEventListener('click', processImage);

  if (el.colorPickerBtn) el.colorPickerBtn.addEventListener('click', () => {
    if (!singleState.originalImage) {
      alert('请先上传图片');
      return;
    }
    // 如果当前是异形模式，取色按钮不生效
    if (el.bgMode.value === 'irregular') {
      showToast('异形模式下请使用下方专用取色按钮');
      return;
    }
    colorPickerMode = !colorPickerMode;
    el.colorPickerBtn.textContent = colorPickerMode ? '点击原图取背景色' : '点击背景取色';
    if (colorPickerMode) {
      el.originalPreview.style.cursor = 'crosshair';
    } else {
      el.originalPreview.style.cursor = 'default';
    }
  });

  // 异形模式专用取色按钮
  const irBgPickBtn = document.getElementById('ir-bg-pick-btn');
  const irOutlinePickBtn = document.getElementById('ir-outline-pick-btn');
  const innerBgPickBtn = document.getElementById('inner-bg-pick-btn');
  const innerOutlinePickBtn = document.getElementById('inner-outline-pick-btn');

  if (irBgPickBtn) irBgPickBtn.addEventListener('click', () => {
    if (!singleState.originalImage) { alert('请先上传图片'); return; }
    singleState.pickMode = 'bg';
    showToast('请点击原图上的背景区域');
    if (el.originalPreview) el.originalPreview.style.cursor = 'crosshair';
  });

  if (irOutlinePickBtn) irOutlinePickBtn.addEventListener('click', () => {
    if (!singleState.originalImage) { alert('请先上传图片'); return; }
    singleState.pickMode = 'outline';
    showToast('请点击原图上的黑色外轮廓');
    if (el.originalPreview) el.originalPreview.style.cursor = 'crosshair';
  });

  if (innerBgPickBtn) innerBgPickBtn.addEventListener('click', () => {
    if (!singleState.originalImage) { alert('请先上传图片'); return; }
    singleState.pickMode = 'innerBg';
    showToast('请点击素材内部的背景区域');
    if (el.originalPreview) el.originalPreview.style.cursor = 'crosshair';
  });

  if (innerOutlinePickBtn) innerOutlinePickBtn.addEventListener('click', () => {
    if (!singleState.originalImage) { alert('请先上传图片'); return; }
    singleState.pickMode = 'innerOutline';
    showToast('请点击内部轮廓（可选）');
    if (el.originalPreview) el.originalPreview.style.cursor = 'crosshair';
  });

  // 背景模式切换
  if (el.bgMode) el.bgMode.addEventListener('change', (e) => {
    const isIrregular = e.target.value === 'irregular';
    const normalControls = document.getElementById('normal-mode-controls');
    const irregularControls = document.getElementById('irregular-mode-controls');
    if (normalControls) normalControls.style.display = isIrregular ? 'none' : '';
    if (irregularControls) irregularControls.style.display = isIrregular ? '' : 'none';
    if (!isIrregular) {
      resetIrregularState();
    }
  });

  // 应用内轮廓抠图
  const applyInnerBtn = document.getElementById('apply-inner-btn');
  if (applyInnerBtn) applyInnerBtn.addEventListener('click', applyInnerContour);

  if (el.originalPreview) el.originalPreview.addEventListener('click', handleImageClick);

  if (el.darkBgToggle) el.darkBgToggle.addEventListener('change', updatePreviewBackground);
  if (el.lightBgToggle) el.lightBgToggle.addEventListener('change', updatePreviewBackground);

  if (el.exportSelectedBtn) el.exportSelectedBtn.addEventListener('click', exportSelected);
  if (el.exportAllBtn) el.exportAllBtn.addEventListener('click', exportAll);
  if (el.downloadZipBtn) el.downloadZipBtn.addEventListener('click', downloadZip);

  // 清除上传图片按钮
  if (el.clearUploadBtn) {
    el.clearUploadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearUpload();
    });
  }
}

function setupModeSwitch() {
  const modeTabs = document.querySelectorAll('.mode-tab');
  const panels = document.querySelectorAll('.mode-panel');

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      currentMode = mode;

      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      panels.forEach(panel => {
        if (panel.id === `${mode}-mode-panel`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });
}

function handleDragOver(e) {
  e.preventDefault();
  singleElements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  singleElements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  singleElements.uploadArea.classList.remove('dragover');
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

  singleState.fileName = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      singleState.originalImage = img;
      singleState.fileWidth = img.width;
      singleState.fileHeight = img.height;

      if (singleElements.originalPreview) {
        singleElements.originalPreview.src = e.target.result;
        singleElements.originalPreview.hidden = false;
      }
      if (singleElements.uploadArea) {
        const placeholder = singleElements.uploadArea.querySelector('.upload-placeholder');
        if (placeholder) placeholder.style.display = 'none';
      }

      if (singleElements.fileName) singleElements.fileName.textContent = file.name;
      if (singleElements.fileSize) singleElements.fileSize.textContent = formatFileSize(file.size);
      if (singleElements.fileDimension) singleElements.fileDimension.textContent = `${img.width} x ${img.height}`;

      if (singleElements.replaceBtn) singleElements.replaceBtn.disabled = false;
      if (singleElements.processBtn) singleElements.processBtn.disabled = false;
      if (singleElements.clearUploadBtn) singleElements.clearUploadBtn.hidden = false;

      // 立即获取像素数据，供取色使用
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      singleState.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      showToast('图片上传成功，请点击取色');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleImageClick(e) {
  // 异形模式取色
  if (singleState.pickMode) {
    if (!singleState.originalImageData) {
      showToast('像素数据未准备好，请重新上传图片');
      return;
    }
    if (!singleElements.originalPreview) return;

    const rect = singleElements.originalPreview.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * singleState.fileWidth);
    const y = Math.floor((e.clientY - rect.top) / rect.height * singleState.fileHeight);

    const idx = (y * singleState.fileWidth + x) * 4;
    const r = singleState.originalImageData.data[idx];
    const g = singleState.originalImageData.data[idx + 1];
    const b = singleState.originalImageData.data[idx + 2];

    if (singleState.pickMode === 'bg') {
      singleState.irMode.bgColor = {r, g, b};
      const hex = rgbToHex(r, g, b);
      const picker = document.getElementById('ir-bg-color-picker');
      const status = document.getElementById('ir-bg-color-status');
      if (picker) picker.value = hex;
      if (status) status.textContent = `RGB(${r},${g},${b})`;
      showToast('背景色已选取');
    } else if (singleState.pickMode === 'outline') {
      singleState.irMode.outlineColor = {r, g, b};
      const hex = rgbToHex(r, g, b);
      const picker = document.getElementById('ir-outline-color-picker');
      const status = document.getElementById('ir-outline-color-status');
      if (picker) picker.value = hex;
      if (status) status.textContent = `RGB(${r},${g},${b})`;
      showToast('轮廓色已选取');
    } else if (singleState.pickMode === 'innerBg') {
      singleState.irMode.innerBgColor = {r, g, b};
      const hex = rgbToHex(r, g, b);
      const picker = document.getElementById('inner-bg-color-picker');
      const status = document.getElementById('inner-bg-color-status');
      if (picker) picker.value = hex;
      if (status) status.textContent = `RGB(${r},${g},${b})`;
      showToast('内部背景色已选取');
    } else if (singleState.pickMode === 'innerOutline') {
      singleState.irMode.innerOutlineColor = {r, g, b};
      const hex = rgbToHex(r, g, b);
      const picker = document.getElementById('inner-outline-color-picker');
      const status = document.getElementById('inner-outline-color-status');
      if (picker) picker.value = hex;
      if (status) status.textContent = `RGB(${r},${g},${b})`;
      showToast('内部轮廓色已选取');
    }

    singleState.pickMode = null;
    if (singleElements.originalPreview) singleElements.originalPreview.style.cursor = 'default';
    return;
  }

  // 原有普通模式取色
  if (!colorPickerMode || !singleState.originalImageData) return;

  const rect = singleElements.originalPreview.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / rect.width * singleState.fileWidth);
  const y = Math.floor((e.clientY - rect.top) / rect.height * singleState.fileHeight);

  const idx = (y * singleState.fileWidth + x) * 4;
  const r = singleState.originalImageData.data[idx];
  const g = singleState.originalImageData.data[idx + 1];
  const b = singleState.originalImageData.data[idx + 2];

  singleState.selectedBgColor = [r, g, b];
  colorPickerMode = false;
  singleElements.originalPreview.style.cursor = 'default';
  singleElements.colorPickerBtn.textContent = `已选颜色: rgb(${r}, ${g}, ${b})`;

  singleElements.bgMode.value = 'solid';

  setTimeout(() => {
    processImage();
  }, 100);
}

function showLoading(text) {
  singleElements.loadingText.textContent = text;
  singleElements.loadingOverlay.hidden = false;
}

function hideLoading() {
  singleElements.loadingOverlay.hidden = true;
}

function processImage() {
  if (!singleState.originalImage) return;

  const bgMode = singleElements.bgMode.value;

  if (bgMode === 'irregular') {
    processIrregular();
  } else {
    processNormal();
  }
}

function processNormal() {
  showLoading('正在处理图片...');

  const canvas = document.createElement('canvas');
  canvas.width = singleState.fileWidth;
  canvas.height = singleState.fileHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(singleState.originalImage, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  singleState.originalImageData = imageData;

  worker.postMessage({
    type: 'processImage',
    data: {
      imageData: {
        width: imageData.width,
        height: imageData.height,
        data: Array.from(imageData.data)
      },
      bgMode: singleElements.bgMode.value,
      tolerance: parseInt(singleElements.tolerance.value),
      edgeRemoval: parseInt(singleElements.edgeRemoval.value),
      selectedColor: singleState.selectedBgColor
    }
  });

  processTimeout = setTimeout(() => {
    hideLoading();
    alert('处理超时，请尝试使用更小的图片或刷新页面');
  }, 30000);
}

function processIrregular() {
  if (!singleState.irMode.bgColor) {
    alert('请先选取背景色');
    return;
  }

  showLoading('正在检测异形素材...');

  const canvas = document.createElement('canvas');
  canvas.width = singleState.fileWidth;
  canvas.height = singleState.fileHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(singleState.originalImage, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  singleState.originalImageData = imageData;

  worker.postMessage({
    type: 'irregularDetect',
    data: {
      imageData: {
        width: imageData.width,
        height: imageData.height,
        data: Array.from(imageData.data)
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

function handleProcessedImage(result) {
  clearTimeout(processTimeout);

  const { imageData, bgMask } = result;
  const newImageData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);

  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(newImageData, 0, 0);

  singleState.processedImageData = newImageData;
  singleState.bgMask = new Uint8Array(bgMask);

  singleElements.transparentPreview.src = canvas.toDataURL();
  singleElements.transparentPreview.hidden = false;

  detectAssets();
}

function detectAssets() {
  showLoading('正在识别候选素材...');

  worker.postMessage({
    type: 'detectAssets',
    data: {
      imageData: {
        width: singleState.processedImageData.width,
        height: singleState.processedImageData.height,
        data: Array.from(singleState.processedImageData.data)
      },
      bgMask: Array.from(singleState.bgMask),
      mergeDistance: parseInt(singleElements.mergeDistance.value),
      minArea: parseInt(singleElements.minArea.value),
      padding: parseInt(singleElements.padding.value)
    }
  });

  processTimeout = setTimeout(() => {
    hideLoading();
    alert('识别素材超时，请尝试调整参数或刷新页面');
  }, 30000);
}

function handleDetectedAssets(assets) {
  clearTimeout(processTimeout);

  singleState.candidates = assets;
  singleState.selectedCandidates = new Set(assets.map(a => a.id));

  singleElements.candidateCount.textContent = assets.length;

  renderCandidates();

  singleElements.exportSelectedBtn.disabled = assets.length === 0;
  singleElements.exportAllBtn.disabled = assets.length === 0;
  singleElements.downloadZipBtn.disabled = assets.length === 0;

  hideLoading();
}

function renderCandidates() {
  singleElements.candidatesGrid.innerHTML = '';

  if (singleState.candidates.length === 0) {
    singleElements.candidatesGrid.innerHTML = '<div class="empty-state"><p>未识别到候选素材</p></div>';
    return;
  }

  for (const candidate of singleState.candidates) {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.dataset.id = candidate.id;

    if (singleState.selectedCandidates.has(candidate.id)) {
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

    singleElements.candidatesGrid.appendChild(card);
  }

  document.querySelectorAll('.candidate-name-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id);
      const candidate = singleState.candidates.find(c => c.id === id);
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
  singleState.candidates = singleState.candidates.filter(c => c.id !== id);
  singleState.selectedCandidates.delete(id);
  singleElements.candidateCount.textContent = singleState.candidates.length;
  renderCandidates();
  updateExportButtons();
}

function toggleCandidateSelection(id) {
  if (singleState.selectedCandidates.has(id)) {
    singleState.selectedCandidates.delete(id);
  } else {
    singleState.selectedCandidates.add(id);
  }
  renderCandidates();
  updateExportButtons();
}

function updateExportButtons() {
  const hasSelected = singleState.selectedCandidates.size > 0;
  singleElements.exportSelectedBtn.disabled = !hasSelected;
  singleElements.exportAllBtn.disabled = singleState.candidates.length === 0;
  singleElements.downloadZipBtn.disabled = singleState.candidates.length === 0;
}

function downloadSingleCandidate(id) {
  const candidate = singleState.candidates.find(c => c.id === id);
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
    pixels: r.pixels,
    pixelSet: r.pixelSet,
    color: r.color,
    area: r.area,
  }));
  singleState.selectedCandidates = new Set(singleState.candidates.map(c => c.id));

  singleElements.candidateCount.textContent = regions.length;
  renderIrregularCandidates();
  renderIrregularPreview();

  // 显示内轮廓抠图区域
  const innerSection = document.getElementById('inner-contour-section');
  if (innerSection) innerSection.style.display = '';

  singleElements.exportSelectedBtn.disabled = regions.length === 0;
  singleElements.exportAllBtn.disabled = regions.length === 0;
  singleElements.downloadZipBtn.disabled = regions.length === 0;

  hideLoading();
}

function renderIrregularCandidates() {
  singleElements.candidatesGrid.innerHTML = '';

  if (singleState.candidates.length === 0) {
    singleElements.candidatesGrid.innerHTML = '<div class="empty-state"><p>未识别到候选素材</p></div>';
    return;
  }

  for (const candidate of singleState.candidates) {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.dataset.id = candidate.id;

    if (singleState.selectedCandidates.has(candidate.id)) {
      card.classList.add('selected');
    }

    // 创建精确像素的预览
    const canvas = document.createElement('canvas');
    canvas.width = candidate.w;
    canvas.height = candidate.h;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(candidate.w, candidate.h);

    if (candidate.pixels && singleState.originalImageData) {
      for (const p of candidate.pixels) {
        const px = Array.isArray(p) ? p[0] : p.x;
        const py = Array.isArray(p) ? p[1] : p.y;
        const localX = px - candidate.x;
        const localY = py - candidate.y;
        if (localX >= 0 && localX < candidate.w && localY >= 0 && localY < candidate.h) {
          const srcIdx = (py * singleState.fileWidth + px) * 4;
          const dstIdx = (localY * candidate.w + localX) * 4;
          imageData.data[dstIdx] = singleState.originalImageData.data[srcIdx];
          imageData.data[dstIdx + 1] = singleState.originalImageData.data[srcIdx + 1];
          imageData.data[dstIdx + 2] = singleState.originalImageData.data[srcIdx + 2];
          imageData.data[dstIdx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    card.innerHTML = `
      <div class="candidate-preview">
        <img src="${canvas.toDataURL()}" alt="${candidate.name}">
      </div>
      <div class="candidate-info">
        <input type="text" value="${candidate.name}" data-id="${candidate.id}" class="candidate-name-input">
        <div class="candidate-meta">${candidate.w} x ${candidate.h} | 面积: ${candidate.area}</div>
        <div class="candidate-actions">
          <button class="btn btn-danger btn-delete" data-id="${candidate.id}">删除</button>
          <button class="btn btn-secondary btn-download" data-id="${candidate.id}">下载</button>
        </div>
      </div>
    `;

    singleElements.candidatesGrid.appendChild(card);
  }

  // 绑定事件
  document.querySelectorAll('.candidate-name-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id);
      const candidate = singleState.candidates.find(c => c.id === id);
      if (candidate) candidate.name = sanitizeFileName(e.target.value);
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

function renderIrregularPreview() {
  if (!singleState.originalImageData || singleState.candidates.length === 0) return;

  const canvas = document.createElement('canvas');
  canvas.width = singleState.fileWidth;
  canvas.height = singleState.fileHeight;
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(
    new Uint8ClampedArray(singleState.originalImageData.data),
    singleState.fileWidth,
    singleState.fileHeight
  );

  // 非选中区域的像素变透明
  const selectedSet = new Set();
  for (const c of singleState.candidates) {
    if (singleState.selectedCandidates.has(c.id) && c.pixels) {
      for (const p of c.pixels) {
        const px = Array.isArray(p) ? p[0] : p.x;
        const py = Array.isArray(p) ? p[1] : p.y;
        selectedSet.add(py * singleState.fileWidth + px);
      }
    }
  }

  for (let i = 0; i < imageData.data.length; i += 4) {
    const idx = i / 4;
    if (!selectedSet.has(idx)) {
      imageData.data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  singleElements.transparentPreview.src = canvas.toDataURL();
  singleElements.transparentPreview.hidden = false;
}

function applyInnerContour() {
  const selectedIds = Array.from(singleState.selectedCandidates);
  if (selectedIds.length === 0) {
    alert('请先勾选要处理的素材');
    return;
  }
  if (!singleState.irMode.innerBgColor) {
    alert('请先选取内部背景色');
    return;
  }

  showLoading('正在去除内部背景...');

  const selectedIndices = selectedIds.map(id => id - 1);

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

  processTimeout = setTimeout(() => {
    hideLoading();
    alert('处理超时');
  }, 30000);
}

function handleInnerContourRemoveResult(regions) {
  clearTimeout(processTimeout);

  singleState.irMode.regions = regions;
  singleState.candidates = regions.map((r, i) => ({
    id: i + 1,
    name: singleState.candidates[i]?.name || `candidate-${String(i + 1).padStart(3, '0')}`,
    x: r.bounds.x,
    y: r.bounds.y,
    w: r.bounds.w,
    h: r.bounds.h,
    pixels: r.pixels,
    pixelSet: r.pixelSet,
    color: r.color,
    area: r.area,
  }));

  singleElements.candidateCount.textContent = regions.length;
  renderIrregularCandidates();
  renderIrregularPreview();
  hideLoading();
  showToast('内部背景已去除');
}

function resetIrregularState() {
  singleState.irMode = {
    bgColor: null,
    outlineColor: null,
    regions: [],
    selectedRegions: new Set(),
    innerBgColor: null,
    innerOutlineColor: null,
  };
  singleState.pickMode = null;

  // 重置 UI
  const bgStatus = document.getElementById('ir-bg-color-status');
  const outlineStatus = document.getElementById('ir-outline-color-status');
  const innerStatus = document.getElementById('inner-bg-color-status');
  const innerOutlineStatus = document.getElementById('inner-outline-color-status');
  const innerSection = document.getElementById('inner-contour-section');

  if (bgStatus) bgStatus.textContent = '未取色';
  if (outlineStatus) outlineStatus.textContent = '未取色';
  if (innerStatus) innerStatus.textContent = '未取色';
  if (innerOutlineStatus) innerOutlineStatus.textContent = '未取色';
  if (innerSection) innerSection.style.display = 'none';
}

function clearUpload() {
  // 重置状态
  singleState.originalImage = null;
  singleState.originalImageData = null;
  singleState.processedImageData = null;
  singleState.bgMask = null;
  singleState.candidates = [];
  singleState.selectedCandidates = new Set();
  singleState.fileName = '';
  singleState.fileWidth = 0;
  singleState.fileHeight = 0;
  singleState.selectedBgColor = null;
  resetIrregularState();

  // 重置 UI
  if (singleElements.originalPreview) {
    singleElements.originalPreview.src = '';
    singleElements.originalPreview.hidden = true;
  }
  if (singleElements.uploadArea) {
    const placeholder = singleElements.uploadArea.querySelector('.upload-placeholder');
    if (placeholder) placeholder.style.display = '';
  }
  if (singleElements.clearUploadBtn) {
    singleElements.clearUploadBtn.hidden = true;
  }
  if (singleElements.fileName) singleElements.fileName.textContent = '';
  if (singleElements.fileSize) singleElements.fileSize.textContent = '';
  if (singleElements.fileDimension) singleElements.fileDimension.textContent = '';
  if (singleElements.processBtn) singleElements.processBtn.disabled = true;
  if (singleElements.transparentPreview) {
    singleElements.transparentPreview.src = '';
    singleElements.transparentPreview.hidden = true;
  }

  // 清空候选素材
  singleElements.candidateCount.textContent = '0';
  singleElements.candidatesGrid.innerHTML = `
    <div class="empty-state">
      <div class="icon">🖼️</div>
      <p>上传并处理图片后将显示候选素材</p>
    </div>
  `;

  // 禁用导出按钮
  if (singleElements.exportSelectedBtn) singleElements.exportSelectedBtn.disabled = true;
  if (singleElements.exportAllBtn) singleElements.exportAllBtn.disabled = true;
  if (singleElements.downloadZipBtn) singleElements.downloadZipBtn.disabled = true;

  showToast('图片已清除');
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function updatePreviewBackground() {
  singleElements.previewContainer.classList.remove('dark-bg', 'light-bg');
  if (singleElements.darkBgToggle.checked) {
    singleElements.previewContainer.classList.add('dark-bg');
  } else if (singleElements.lightBgToggle.checked) {
    singleElements.previewContainer.classList.add('light-bg');
  }
}

async function exportSelected() {
  const selected = singleState.candidates.filter(c => singleState.selectedCandidates.has(c.id));
  await exportCandidates(selected);
}

async function exportAll() {
  await exportCandidates(singleState.candidates);
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
  zip.file('preview.html', generatePreviewHtml(manifest));

  const content = await zip.generateAsync({ type: 'blob' });

  const link = document.createElement('a');
  link.download = 'asset-cutout-export.zip';
  link.href = URL.createObjectURL(content);
  link.click();

  hideLoading();
}

function generatePreviewHtml(manifest) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>素材预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; background: #1a1a2e; color: #e6e6e6; }
    h1 { text-align: center; margin-bottom: 32px; font-size: 28px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px; }
    .card { background: #16213e; border-radius: 8px; overflow: hidden; border: 1px solid #2a2a4a; }
    .preview { height: 200px; display: flex; align-items: center; justify-content: center; background: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; background-color: #cccccc; }
    .preview img { max-width: 90%; max-height: 90%; object-fit: contain; }
    .info { padding: 12px; }
    .info h3 { font-size: 16px; margin-bottom: 8px; }
    .info p { font-size: 12px; color: #b0b0b0; }
  </style>
</head>
<body>
  <h1>素材预览</h1>
  <div class="grid">
    ${manifest.map(item => `<div class="card"><div class="preview"><img src="images/${item.file}" alt="${item.name}"></div><div class="info"><h3>${item.name}</h3><p>尺寸: ${item.width} x ${item.height}</p><p>坐标: (${item.sourceX}, ${item.sourceY})</p></div></div>`).join('')}
  </div>
</body>
</html>`;
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

function setupBatchStepNavigation() {
  document.querySelectorAll('.batch-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseInt(btn.dataset.step);
      if (step >= 1 && step <= 4) {
        switchBatchStep(step);
      }
    });
  });

  document.getElementById('to-step-2-btn')?.addEventListener('click', () => switchBatchStep(2));
  document.getElementById('to-step-3-btn')?.addEventListener('click', () => switchBatchStep(3));
  document.getElementById('to-step-4-btn')?.addEventListener('click', () => switchBatchStep(4));
  document.getElementById('back-to-step-1-btn')?.addEventListener('click', () => switchBatchStep(1));
  document.getElementById('back-to-step-2-btn')?.addEventListener('click', () => switchBatchStep(2));
  document.getElementById('back-to-step-3-btn')?.addEventListener('click', () => switchBatchStep(3));

  document.getElementById('upload-select-all-btn')?.addEventListener('click', () => {
    selectAllFiles();
    renderUploadQueue();
  });

  document.getElementById('upload-clear-all-btn')?.addEventListener('click', () => {
    clearFiles();
    renderUploadQueue();
  });
}

function switchBatchStep(step) {
  const { files, isProcessing } = getState();

  if (step === 2 && files.filter(f => f.status === 'loaded').length === 0) {
    showToast('请先上传图片', 'warning');
    return;
  }

  if (step === 3 && files.filter(f => f.processResult.status === 'done').length === 0) {
    showToast('请先完成抠图处理', 'warning');
    return;
  }

  if (step === 4 && files.filter(f => f.processResult.status === 'done').length === 0) {
    showToast('请先完成抠图处理', 'warning');
    return;
  }

  if (isProcessing && step !== 2) {
    showToast('正在处理中，请等待完成', 'warning');
    return;
  }

  setStep(step);

  document.querySelectorAll('.batch-step-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const targetPanel = document.getElementById(`batch-step-${step}`);
  if (targetPanel) targetPanel.classList.add('active');

  document.querySelectorAll('.batch-step-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.step) === step);
  });

  if (step === 1) renderUploadQueue();
  if (step === 2) renderProcessPanel();
  if (step === 3) renderNamingPreview();
  if (step === 4) renderDownloadPanel();
}

function setupBatchSubscriptions() {
  subscribe('filesChanged', () => {
    renderUploadQueue();
  });

  subscribe('fileUpdated', () => {
    const { currentStep } = getState();
    if (currentStep === 1) renderUploadQueue();
  });

  subscribe('selectionChanged', () => {
    const { currentStep } = getState();
    if (currentStep === 1) renderUploadQueue();
    if (currentStep === 4) renderDownloadPanel();
  });

  subscribe('processProgress', () => {
    const { currentStep } = getState();
    if (currentStep === 2) renderProcessPanel();
  });

  subscribe('processComplete', () => {
    renderProcessPanel();
    showToast('批量抠图处理完成！', 'success');
  });

  subscribe('processCancelled', () => {
    renderProcessPanel();
    showToast('已取消处理', 'info');
  });

  subscribe('uploadBatchComplete', (data) => {
    if (data.errorCount > 0) {
      showToast(`已添加 ${data.addedCount} 个文件，${data.errorCount} 个失败`, 'warning');
    } else if (data.addedCount > 0) {
      showToast(`已添加 ${data.addedCount} 个文件`, 'success');
    }
  });

  subscribe('uploadError', (data) => {
    showToast(`${data.file}: ${data.error}`, 'error');
  });

  subscribe('downloadStart', () => {
    const progressSection = document.getElementById('download-progress-section');
    if (progressSection) progressSection.style.display = '';
  });

  subscribe('downloadProgress', (data) => {
    const progressBar = document.getElementById('download-progress-bar');
    const progressText = document.getElementById('download-progress-text');
    if (progressBar) progressBar.style.width = data.percent + '%';
    if (progressText) {
      const phaseText = { packing: '打包中', compressing: '压缩中', downloading: '下载中' }[data.phase] || '处理中';
      progressText.textContent = `${phaseText}... ${data.percent}%`;
    }
  });

  subscribe('downloadComplete', (data) => {
    const progressSection = document.getElementById('download-progress-section');
    if (progressSection) progressSection.style.display = 'none';
    showToast(`下载完成！共 ${data.total} 个文件`, 'success');
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[type] || '';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

await init();
