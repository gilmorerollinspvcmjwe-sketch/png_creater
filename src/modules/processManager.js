import { getState, setState, updateFile, subscribe, notify, getFile } from './stateManager.js';
import { imageToImageData, imageDataToDataURL } from '../utils/helpers.js';

const PRECISION_PRESETS = {
  high: { tolerance: 40, edgeRemoval: 5 },
  medium: { tolerance: 80, edgeRemoval: 15 },
  low: { tolerance: 150, edgeRemoval: 25 },
};

let workerPool = [];
let taskQueue = [];
let isCancelled = false;
let activeWorkers = 0;
let workerUrl = null;

export async function initProcessManager() {
  try {
    const response = await fetch('/src/workers/imageProcessor.js');
    const workerCode = await response.text();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    workerUrl = URL.createObjectURL(blob);
  } catch (e) {
    console.error('Failed to prepare worker:', e);
  }
  setupProcessEventListeners();
}

function getWorker() {
  if (workerPool.length > 0) {
    return workerPool.pop();
  }
  if (!workerUrl) return null;
  return new Worker(workerUrl);
}

function releaseWorker(worker) {
  worker.onmessage = null;
  worker.onerror = null;
  workerPool.push(worker);
}

function setupProcessEventListeners() {
  const startBtn = document.getElementById('start-process-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startBatchProcess);
  }

  const cancelBtn = document.getElementById('cancel-process-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelBatchProcess);
  }

  const modeSelect = document.getElementById('batch-bg-mode');
  if (modeSelect) {
    modeSelect.addEventListener('change', (e) => {
      const state = getState();
      state.processSettings.mode = e.target.value;
    });
  }

  document.querySelectorAll('input[name="precision"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        const state = getState();
        state.processSettings.precision = e.target.value;
      }
    });
  });
}

export async function startBatchProcess() {
  const { files, processSettings } = getState();
  const filesToProcess = files.filter(f => f.status === 'loaded' && f.processResult.status !== 'done');

  if (filesToProcess.length === 0) {
    notify('processError', { message: '没有可处理的图片' });
    return;
  }

  isCancelled = false;
  setState({ isProcessing: true, processedCount: 0, totalToProcess: filesToProcess.length });

  const preset = PRECISION_PRESETS[processSettings.precision] || PRECISION_PRESETS.medium;
  const concurrency = Math.min(navigator.hardwareConcurrency || 4, 4);

  notify('processStart', { total: filesToProcess.length });

  const processPromises = [];
  let nextIndex = 0;

  const processNext = async () => {
    while (nextIndex < filesToProcess.length && !isCancelled) {
      const currentIndex = nextIndex++;
      const fileItem = filesToProcess[currentIndex];
      await processSingleFile(fileItem, processSettings, preset);
      if (!isCancelled) {
        const state = getState();
        setState({ processedCount: state.processedCount + 1 });
        notify('processProgress', {
          current: state.processedCount + 1,
          total: state.totalToProcess,
          fileId: fileItem.id,
        });
      }
    }
  };

  for (let i = 0; i < concurrency; i++) {
    processPromises.push(processNext());
  }

  await Promise.all(processPromises);

  setState({ isProcessing: false });
  notify('processComplete', { cancelled: isCancelled });
}

function processSingleFile(fileItem, settings, preset) {
  return new Promise((resolve, reject) => {
    if (isCancelled) { resolve(); return; }

    updateFile(fileItem.id, { processResult: { ...fileItem.processResult, status: 'processing' } });
    notify('fileProcessStart', { fileId: fileItem.id });

    const canvas = document.createElement('canvas');
    canvas.width = fileItem.width;
    canvas.height = fileItem.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(fileItem.originalImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const worker = getWorker();
    if (!worker) {
      updateFile(fileItem.id, { processResult: { ...fileItem.processResult, status: 'error' } });
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      updateFile(fileItem.id, { processResult: { ...fileItem.processResult, status: 'error' } });
      worker.terminate();
      resolve();
    }, 60000);

    // 步骤 1: 去背景
    worker.onmessage = function handleProcessResult(e) {
      clearTimeout(timeout);
      const { type, result, assets, error } = e.data;

      if (type === 'processImageResult' && result) {
        // 去背景完成，继续调用 detectAssets 拆分素材
        const newImageData = new ImageData(
          new Uint8ClampedArray(result.imageData.data),
          result.imageData.width,
          result.imageData.height
        );
        const bgMask = new Uint8Array(result.bgMask);

        worker.onmessage = function handleAssetsResult(e2) {
          const { type: t2, assets: a2, error: e2err } = e2.data;
          if (t2 === 'detectAssetsResult' && a2) {
            // 步骤 2: 素材拆分完成，保存 assets
            const previewDataURL = imageDataToDataURL(newImageData);

            updateFile(fileItem.id, {
              processResult: {
                status: 'done',
                processedImageData: newImageData,
                bgMask,
                previewDataURL,
                assets: a2,
                processTime: Date.now(),
              },
            });
          } else if (t2 === 'error' || e2err) {
            // detectAssets 失败，只保存去背景结果
            const previewDataURL = imageDataToDataURL(newImageData);
            updateFile(fileItem.id, {
              processResult: {
                status: 'done',
                processedImageData: newImageData,
                bgMask,
                previewDataURL,
                assets: [],
                processTime: Date.now(),
              },
            });
          }
          releaseWorker(worker);
          resolve();
        };

        // 发送 detectAssets 请求
        worker.postMessage({
          type: 'detectAssets',
          data: {
            imageData: {
              width: result.imageData.width,
              height: result.imageData.height,
              data: Array.from(result.imageData.data),
            },
            bgMask: Array.from(result.bgMask),
            mergeDistance: 24,
            minArea: 500,
            padding: 12,
          },
        });
      } else if (type === 'error' || error) {
        updateFile(fileItem.id, { processResult: { ...fileItem.processResult, status: 'error' } });
        releaseWorker(worker);
        resolve();
      }
    };

    worker.onerror = function(e) {
      clearTimeout(timeout);
      updateFile(fileItem.id, { processResult: { ...fileItem.processResult, status: 'error' } });
      releaseWorker(worker);
      resolve();
    };

    worker.postMessage({
      type: 'processImage',
      data: {
        imageData: {
          width: imageData.width,
          height: imageData.height,
          data: Array.from(imageData.data),
        },
        bgMode: settings.mode,
        tolerance: preset.tolerance,
        edgeRemoval: preset.edgeRemoval,
        selectedColor: null,
      },
    });
  });
}

export function cancelBatchProcess() {
  isCancelled = true;
  setState({ isProcessing: false });
  notify('processCancelled', {});
}

export async function reprocessSingle(id) {
  const fileItem = getFile(id);
  if (!fileItem || !fileItem.originalImage) return;

  const { processSettings } = getState();
  const preset = PRECISION_PRESETS[processSettings.precision] || PRECISION_PRESETS.medium;

  updateFile(id, { processResult: { ...fileItem.processResult, status: 'processing' } });
  notify('fileProcessStart', { fileId: id });

  await processSingleFile(fileItem, processSettings, preset);
  notify('fileProcessComplete', { fileId: id });
}

export function renderProcessPanel() {
  const { files, isProcessing, processedCount, totalToProcess } = getState();
  const total = files.length;
  const doneCount = files.filter(f => f.processResult.status === 'done').length;
  const processingCount = files.filter(f => f.processResult.status === 'processing').length;
  const errorCount = files.filter(f => f.processResult.status === 'error').length;

  const progressEl = document.getElementById('process-progress-bar');
  if (progressEl) {
    const percent = total > 0 ? Math.round((doneCount + errorCount) / total * 100) : 0;
    progressEl.style.width = percent + '%';
    const progressText = document.getElementById('process-progress-text');
    if (progressText) {
      progressText.textContent = isProcessing
        ? `处理中... ${processedCount}/${totalToProcess} (${percent}%)`
        : `已完成 ${doneCount}/${total}${errorCount > 0 ? `，${errorCount} 个失败` : ''}`;
    }
  }

  const startBtn = document.getElementById('start-process-btn');
  if (startBtn) {
    startBtn.disabled = isProcessing;
    startBtn.style.display = isProcessing ? 'none' : '';
  }

  const cancelBtn = document.getElementById('cancel-process-btn');
  if (cancelBtn) {
    cancelBtn.style.display = isProcessing ? '' : 'none';
  }

  renderProcessGrid();
}

function renderProcessGrid() {
  const container = document.getElementById('process-result-grid');
  if (!container) return;

  const { files, selectedIds } = getState();

  if (files.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>请先上传图片</p></div>';
    return;
  }

  container.innerHTML = '';

  for (const file of files) {
    const card = document.createElement('div');
    card.className = 'process-card';
    if (selectedIds.has(file.id)) card.classList.add('selected');
    card.dataset.id = file.id;

    const statusIcon = {
      pending: '⏳',
      processing: '⚙️',
      done: '✅',
      error: '❌',
    }[file.processResult.status] || '';

    const previewSrc = file.processResult.previewDataURL || file.thumbnail || '';

    card.innerHTML = `
      <div class="process-card-preview">
        ${previewSrc ? `<img src="${previewSrc}" alt="${file.name}">` : '<div class="thumb-placeholder">...</div>'}
        <div class="process-card-status">${statusIcon}</div>
      </div>
      <div class="process-card-info">
        <div class="process-card-name" title="${file.name}">${file.name}</div>
        <div class="process-card-meta">${file.width}x${file.height}</div>
      </div>
    `;

    container.appendChild(card);
  }
}
