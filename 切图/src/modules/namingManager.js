import { getState, updateFile, subscribe, notify } from './stateManager.js';
import { formatFileSize, sanitizeFileName } from '../utils/helpers.js';

export function initNamingManager() {
  setupNamingEvents();
}

function setupNamingEvents() {
  const templateInput = document.getElementById('naming-template');
  if (templateInput) {
    templateInput.addEventListener('input', (e) => {
      const state = getState();
      state.namingTemplate = e.target.value;
      renderNamingPreview();
    });
  }

  const startIndexInput = document.getElementById('naming-start-index');
  if (startIndexInput) {
    startIndexInput.addEventListener('input', (e) => {
      const state = getState();
      state.namingConfig.startIndex = Math.max(1, parseInt(e.target.value) || 1);
      renderNamingPreview();
    });
  }

  const digitCountInput = document.getElementById('naming-digit-count');
  if (digitCountInput) {
    digitCountInput.addEventListener('input', (e) => {
      const state = getState();
      state.namingConfig.digitCount = Math.max(1, Math.min(6, parseInt(e.target.value) || 3));
      renderNamingPreview();
    });
  }

  document.querySelectorAll('.var-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const variable = e.currentTarget.dataset.var;
      const templateInput = document.getElementById('naming-template');
      if (templateInput && variable) {
        const start = templateInput.selectionStart;
        const end = templateInput.selectionEnd;
        const text = templateInput.value;
        templateInput.value = text.substring(0, start) + variable + text.substring(end);
        templateInput.selectionStart = templateInput.selectionEnd = start + variable.length;
        templateInput.focus();
        const state = getState();
        state.namingTemplate = templateInput.value;
        renderNamingPreview();
      }
    });
  });
}

export function applyNamingTemplate(template, fileItem, globalIndex, config) {
  const { startIndex, digitCount } = config;
  const index = startIndex + globalIndex;
  const now = new Date();
  const nameWithoutExt = fileItem.name.replace(/\.[^.]+$/, '');

  let result = template
    .replace(/{name}/g, nameWithoutExt)
    .replace(/{index}/g, String(index).padStart(digitCount, '0'))
    .replace(/{date}/g, now.toISOString().slice(0, 10))
    .replace(/{time}/g, now.toTimeString().slice(0, 8).replace(/:/g, '-'))
    .replace(/{timestamp}/g, String(Date.now()))
    .replace(/{width}/g, String(fileItem.width || 0))
    .replace(/{height}/g, String(fileItem.height || 0))
    .replace(/{size}/g, formatFileSize(fileItem.size));

  result = sanitizeFileName(result);

  return result;
}

export function getNamingResults() {
  const { files, namingTemplate, namingConfig, selectedIds } = getState();
  const results = new Map();
  const nameCount = new Map();

  const processedFiles = files.filter(f =>
    f.processResult.status === 'done' && selectedIds.has(f.id)
  );

  for (let i = 0; i < processedFiles.length; i++) {
    const file = processedFiles[i];
    let name = file.customName || applyNamingTemplate(namingTemplate, file, i, namingConfig);

    const count = nameCount.get(name) || 0;
    nameCount.set(name, count + 1);
    if (count > 0) {
      name = name + '_' + (count + 1);
    }

    results.set(file.id, name);
  }

  return results;
}

export function setCustomName(fileId, customName) {
  updateFile(fileId, { customName: customName || null });
  renderNamingPreview();
}

export function renderNamingPreview() {
  const container = document.getElementById('naming-preview-list');
  if (!container) return;

  const { files, selectedIds } = getState();
  const namingResults = getNamingResults();

  const processedFiles = files.filter(f =>
    f.processResult.status === 'done' && selectedIds.has(f.id)
  );

  if (processedFiles.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>请先完成抠图处理</p></div>';
    return;
  }

  container.innerHTML = '';

  for (const file of processedFiles) {
    const newName = namingResults.get(file.id) || file.name;
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');

    const row = document.createElement('div');
    row.className = 'naming-row';
    row.dataset.id = file.id;

    row.innerHTML = `
      <div class="naming-original" title="${file.name}">${nameWithoutExt}</div>
      <div class="naming-arrow">→</div>
      <div class="naming-new">
        <input type="text" class="naming-input" value="${newName}" data-id="${file.id}" placeholder="${newName}">
      </div>
      <span class="naming-ext">.png</span>
    `;

    container.appendChild(row);
  }

  container.querySelectorAll('.naming-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const value = e.target.value.trim();
      setCustomName(id, value || null);
    });
  });
}
