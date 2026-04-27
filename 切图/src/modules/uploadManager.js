import { getState, addFile, removeFile, clearFiles, updateFile, subscribe, notify, selectAllFiles } from './stateManager.js';
import { validateImageFile, loadImageFromFile, generateThumbnail, generateId, formatFileSize } from '../utils/helpers.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function initUploadManager() {
  setupDropZone();
  setupFileInput();
}

function setupDropZone() {
  const dropZone = document.getElementById('upload-drop-zone');
  if (!dropZone) return;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  dropZone.addEventListener('click', () => {
    const fileInput = document.getElementById('batch-file-input');
    if (fileInput) fileInput.click();
  });
}

function setupFileInput() {
  const fileInput = document.getElementById('batch-file-input');
  if (!fileInput) return;
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  });

  const addMoreBtn = document.getElementById('add-more-btn');
  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => fileInput.click());
  }

  const selectAllBtn = document.getElementById('upload-select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      selectAllFiles();
      renderUploadQueue();
    });
  }

  const clearAllBtn = document.getElementById('upload-clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      clearFiles();
    });
  }
}

export async function handleFiles(fileList) {
  const files = Array.from(fileList);
  let addedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const validation = validateImageFile(file, MAX_FILE_SIZE);
    if (!validation.valid) {
      errorCount++;
      notify('uploadError', { file: file.name, error: validation.error });
      continue;
    }

    const fileItem = {
      id: generateId(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
      thumbnail: null,
      originalImage: null,
      width: 0,
      height: 0,
      imageData: null,
      error: null,
      processResult: {
        status: 'pending',
        processedImageData: null,
        bgMask: null,
        previewDataURL: null,
        processTime: 0,
      },
      customName: null,
    };

    addFile(fileItem);
    addedCount++;

    loadFileData(fileItem);
  }

  notify('uploadBatchComplete', { addedCount, errorCount });
}

async function loadFileData(fileItem) {
  try {
    updateFile(fileItem.id, { status: 'loading', progress: 30 });

    const img = await loadImageFromFile(fileItem.file);
    const thumbnail = generateThumbnail(img);

    updateFile(fileItem.id, {
      status: 'loaded',
      progress: 100,
      originalImage: img,
      thumbnail,
      width: img.width,
      height: img.height,
    });
  } catch (error) {
    updateFile(fileItem.id, {
      status: 'error',
      error: error.message,
    });
  }
}

export function deleteFile(id) {
  removeFile(id);
}

export function clearAllFiles() {
  clearFiles();
}

export function renderUploadQueue() {
  const container = document.getElementById('file-queue-list');
  if (!container) return;

  const { files, selectedIds } = getState();

  if (files.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>暂无上传文件</p></div>';
    updateUploadStats();
    return;
  }

  container.innerHTML = '';

  for (const file of files) {
    const item = document.createElement('div');
    item.className = 'queue-item' + (selectedIds.has(file.id) ? ' selected' : '');
    item.dataset.id = file.id;

    const statusText = {
      pending: '等待中',
      loading: '加载中...',
      loaded: '已就绪',
      error: '出错',
    }[file.status] || file.status;

    const statusClass = {
      pending: 'status-pending',
      loading: 'status-loading',
      loaded: 'status-loaded',
      error: 'status-error',
    }[file.status] || '';

    item.innerHTML = `
      <label class="queue-checkbox">
        <input type="checkbox" ${selectedIds.has(file.id) ? 'checked' : ''} data-id="${file.id}">
      </label>
      <div class="queue-thumb">
        ${file.thumbnail ? `<img src="${file.thumbnail}" alt="${file.name}">` : '<div class="thumb-placeholder">...</div>'}
      </div>
      <div class="queue-info">
        <div class="queue-name" title="${file.name}">${file.name}</div>
        <div class="queue-meta">${file.width && file.height ? `${file.width}x${file.height}` : ''} · ${formatFileSize(file.size)}</div>
      </div>
      <div class="queue-status ${statusClass}">${statusText}</div>
      <button class="btn btn-icon btn-delete-file" data-id="${file.id}" title="删除">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    container.appendChild(item);
  }

  container.querySelectorAll('.queue-checkbox input').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      import('./stateManager.js').then(m => m.toggleFileSelection(id));
    });
  });

  container.querySelectorAll('.btn-delete-file').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      deleteFile(id);
    });
  });

  updateUploadStats();
}

function updateUploadStats() {
  const { files } = getState();
  const statsEl = document.getElementById('upload-stats');
  if (!statsEl) return;

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const loadedCount = files.filter(f => f.status === 'loaded').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  statsEl.textContent = `${files.length} 个文件，共 ${formatFileSize(totalSize)}${errorCount > 0 ? `，${errorCount} 个失败` : ''}，${loadedCount} 个就绪`;
}
