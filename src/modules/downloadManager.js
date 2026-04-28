import JSZip from 'jszip';
import { getState, subscribe, notify } from './stateManager.js';
import { getNamingResults } from './namingManager.js';
import { imageDataToCanvas, canvasToBlob, formatFileSize } from '../utils/helpers.js';

export function initDownloadManager() {
  setupDownloadEvents();
}

function setupDownloadEvents() {
  const downloadBtn = document.getElementById('batch-download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', startBatchDownload);
  }

  const selectAllBtn = document.getElementById('download-select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      import('./stateManager.js').then(m => m.selectAllFiles());
    });
  }

  const deselectAllBtn = document.getElementById('download-deselect-all-btn');
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      import('./stateManager.js').then(m => m.deselectAllFiles());
    });
  }
}

export async function startBatchDownload() {
  const { files, selectedIds } = getState();
  const namingResults = getNamingResults();

  const downloadFormat = document.querySelector('input[name="download-format"]:checked');
  const format = downloadFormat ? downloadFormat.value : 'zip';

  const filesToDownload = files.filter(f =>
    f.processResult.status === 'done' && selectedIds.has(f.id)
  );

  if (filesToDownload.length === 0) {
    notify('downloadError', { message: '没有可下载的文件' });
    return;
  }

  if (format === 'zip') {
    await downloadAsZip(filesToDownload, namingResults);
  } else {
    await downloadIndividually(filesToDownload, namingResults);
  }
}

async function downloadAsZip(files, namingResults) {
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');
  const manifest = [];
  const total = files.length;

  notify('downloadStart', { total, format: 'zip' });

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const baseName = namingResults.get(file.id) || file.name.replace(/\.[^.]+$/, '');

    try {
      // 如果有 assets（批量拆分后的素材），下载拆分素材
      if (file.processResult.assets && file.processResult.assets.length > 0) {
        for (let j = 0; j < file.processResult.assets.length; j++) {
          const asset = file.processResult.assets[j];
          const assetCanvas = document.createElement('canvas');
          assetCanvas.width = asset.bounds.w;
          assetCanvas.height = asset.bounds.h;
          const assetCtx = assetCanvas.getContext('2d');
          const assetImageData = assetCtx.createImageData(asset.bounds.w, asset.bounds.h);

          // 填充像素
          for (const p of asset.pixels) {
            const px = Array.isArray(p) ? p[0] : p.x;
            const py = Array.isArray(p) ? p[1] : p.y;
            const localX = px - asset.bounds.x;
            const localY = py - asset.bounds.y;
            if (localX >= 0 && localX < asset.bounds.w && localY >= 0 && localY < asset.bounds.h) {
              const srcIdx = (py * file.processResult.processedImageData.width + px) * 4;
              const dstIdx = (localY * asset.bounds.w + localX) * 4;
              assetImageData.data[dstIdx] = file.processResult.processedImageData.data[srcIdx];
              assetImageData.data[dstIdx + 1] = file.processResult.processedImageData.data[srcIdx + 1];
              assetImageData.data[dstIdx + 2] = file.processResult.processedImageData.data[srcIdx + 2];
              assetImageData.data[dstIdx + 3] = 255;
            }
          }

          assetCtx.putImageData(assetImageData, 0, 0);
          const blob = await canvasToBlob(assetCanvas);
          const assetFileName = `${baseName}_${String(j + 1).padStart(3, '0')}.png`;
          imagesFolder.file(assetFileName, blob);

          manifest.push({
            name: `${baseName}_${String(j + 1).padStart(3, '0')}`,
            file: assetFileName,
            width: asset.bounds.w,
            height: asset.bounds.h,
            originalName: file.name,
            sourceX: asset.bounds.x,
            sourceY: asset.bounds.y,
          });
        }
      } else {
        // 没有 assets，下载整张去背景后的图
        const canvas = imageDataToCanvas(file.processResult.processedImageData);
        const blob = await canvasToBlob(canvas);
        const fileName = baseName + '.png';
        imagesFolder.file(fileName, blob);

        manifest.push({
          name: baseName,
          file: fileName,
          width: file.processResult.processedImageData.width,
          height: file.processResult.processedImageData.height,
          originalName: file.name,
        });
      }

      notify('downloadProgress', {
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 80),
        phase: 'packing',
      });
    } catch (e) {
      console.error('Failed to pack file:', file.name, e);
    }
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const content = await zip.generateAsync(
    { type: 'blob' },
    (metadata) => {
      notify('downloadProgress', {
        percent: 80 + Math.round(metadata.percent * 0.2),
        phase: 'compressing',
      });
    }
  );

  const link = document.createElement('a');
  link.download = 'batch-cutout-export.zip';
  link.href = URL.createObjectURL(content);
  link.click();
  URL.revokeObjectURL(link.href);

  notify('downloadComplete', { total });
}

async function downloadIndividually(files, namingResults) {
  const total = files.length;
  notify('downloadStart', { total, format: 'individual' });

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const fileName = (namingResults.get(file.id) || file.name.replace(/\.[^.]+$/, '')) + '.png';

    try {
      const canvas = imageDataToCanvas(file.processResult.processedImageData);
      const dataURL = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataURL;
      link.click();

      notify('downloadProgress', {
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        phase: 'downloading',
      });

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (e) {
      console.error('Failed to download file:', file.name, e);
    }
  }

  notify('downloadComplete', { total });
}

export function renderDownloadPanel() {
  const { files, selectedIds } = getState();
  const namingResults = getNamingResults();

  const container = document.getElementById('download-file-list');
  if (!container) return;

  const processedFiles = files.filter(f => f.processResult.status === 'done');

  if (processedFiles.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>请先完成抠图处理</p></div>';
    return;
  }

  container.innerHTML = '';

  for (const file of processedFiles) {
    const newName = namingResults.get(file.id) || file.name.replace(/\.[^.]+$/, '');
    const isSelected = selectedIds.has(file.id);
    const hasAssets = file.processResult.assets && file.processResult.assets.length > 0;
    const assetCount = hasAssets ? file.processResult.assets.length : 1;

    const row = document.createElement('div');
    row.className = 'download-row' + (isSelected ? ' selected' : '');

    row.innerHTML = `
      <label class="download-checkbox">
        <input type="checkbox" ${isSelected ? 'checked' : ''} data-id="${file.id}">
      </label>
      <div class="download-thumb">
        ${file.processResult.previewDataURL
          ? `<img src="${file.processResult.previewDataURL}" alt="${file.name}">`
          : ''}
      </div>
      <div class="download-info">
        <div class="download-name">${newName}</div>
        <div class="download-meta">${hasAssets
          ? `${assetCount} 个素材 · ${file.processResult.assets[0].bounds.w}x${file.processResult.assets[0].bounds.h} ...`
          : `${file.processResult.processedImageData.width}x${file.processResult.processedImageData.height}`
        }</div>
      </div>
      <div class="download-status status-ready">${hasAssets ? `${assetCount}个素材` : '单图'}</div>
    `;

    container.appendChild(row);
  }

  container.querySelectorAll('.download-checkbox input').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      import('./stateManager.js').then(m => m.toggleFileSelection(id));
    });
  });

  const statsEl = document.getElementById('download-stats');
  if (statsEl) {
    const totalAssets = processedFiles.reduce((sum, f) => {
      return sum + (f.processResult.assets ? f.processResult.assets.length : 1);
    }, 0);
    const selectedCount = processedFiles.filter(f => selectedIds.has(f.id)).length;
    statsEl.textContent = `共 ${totalAssets} 个素材，已选 ${selectedCount} 个文件`;
  }
}
