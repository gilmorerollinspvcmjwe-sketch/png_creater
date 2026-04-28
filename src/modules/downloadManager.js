import JSZip from 'jszip';
import { getState, subscribe, notify } from './stateManager.js';
import { getNamingResults } from './namingManager.js';
import { imageDataToCanvas, canvasToBlob, formatFileSize, generateTexturePackerJson, generateTexturePackerJsonArray, generateCssSprite } from '../utils/helpers.js';

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
      if (file.processResult.assets && file.processResult.assets.length > 0) {
        // 有拆分素材：从整图中按坐标提取像素
        const sourceData = file.processResult.processedImageData;
        const srcW = sourceData.width;

        for (let j = 0; j < file.processResult.assets.length; j++) {
          const asset = file.processResult.assets[j];
          const assetCanvas = document.createElement('canvas');
          assetCanvas.width = asset.w;
          assetCanvas.height = asset.h;
          const assetCtx = assetCanvas.getContext('2d');
          const assetImageData = assetCtx.createImageData(asset.w, asset.h);

          // 从整图提取像素
          for (let ay = 0; ay < asset.h; ay++) {
            for (let ax = 0; ax < asset.w; ax++) {
              const srcX = asset.x + ax;
              const srcY = asset.y + ay;
              if (srcX >= 0 && srcX < srcW && srcY >= 0 && srcY < sourceData.height) {
                const srcIdx = (srcY * srcW + srcX) * 4;
                const dstIdx = (ay * asset.w + ax) * 4;
                // 检查是否为透明像素
                if (sourceData.data[srcIdx + 3] > 0) {
                  assetImageData.data[dstIdx] = sourceData.data[srcIdx];
                  assetImageData.data[dstIdx + 1] = sourceData.data[srcIdx + 1];
                  assetImageData.data[dstIdx + 2] = sourceData.data[srcIdx + 2];
                  assetImageData.data[dstIdx + 3] = sourceData.data[srcIdx + 3];
                } else {
                  assetImageData.data[dstIdx + 3] = 0;
                }
              }
            }
          }

          assetCtx.putImageData(assetImageData, 0, 0);
          const blob = await canvasToBlob(assetCanvas);
          const assetFileName = `${baseName}_${String(j + 1).padStart(3, '0')}.png`;
          imagesFolder.file(assetFileName, blob);

          manifest.push({
            name: `${baseName}_${String(j + 1).padStart(3, '0')}`,
            file: assetFileName,
            x: asset.x,
            y: asset.y,
            w: asset.w,
            h: asset.h,
            originalName: file.name,
          });
        }
      } else {
        // 没有拆分素材，下载整张图
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

  // 生成 JSON 数据文件
  if (manifest.length > 0) {
    const sourceName = files.length > 0 ? files[0].name.replace(/\.[^.]+$/, '') : 'batch-export';
    const totalWidth = manifest.reduce((max, a) => Math.max(max, (a.x || 0) + (a.w || 0)), 0);
    const totalHeight = manifest.reduce((max, a) => Math.max(max, (a.y || 0) + (a.h || 0)), 0);

    const jsonHash = generateTexturePackerJson(manifest, sourceName, totalWidth, totalHeight);
    zip.file('spritesheet.json', JSON.stringify(jsonHash, null, 2));

    const jsonArray = generateTexturePackerJsonArray(manifest, sourceName, totalWidth, totalHeight);
    zip.file('spritesheet-array.json', JSON.stringify(jsonArray, null, 2));

    const css = generateCssSprite(manifest, sourceName);
    zip.file('sprites.css', css);
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
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📦</div>
        <p>还没有处理完成的文件</p>
        <p class="hint">请先上传图片并完成抠图</p>
      </div>`;
    return;
  }

  container.innerHTML = '';

  for (const file of processedFiles) {
    const newName = namingResults.get(file.id) || file.name.replace(/\.[^.]+$/, '');
    const isSelected = selectedIds.has(file.id);
    const hasAssets = file.processResult.assets && file.processResult.assets.length > 0;
    const assets = file.processResult.assets || [];

    const row = document.createElement('div');
    row.className = 'download-row' + (isSelected ? ' selected' : '');

    // 缩略图：优先显示第一个素材的缩略图
    let thumbHTML = '';
    if (hasAssets && assets.length > 0 && assets[0].thumbDataURL) {
      thumbHTML = `<img src="${assets[0].thumbDataURL}" alt="${file.name}">`;
    } else if (file.processResult.previewDataURL) {
      thumbHTML = `<img src="${file.processResult.previewDataURL}" alt="${file.name}">`;
    }

    row.innerHTML = `
      <label class="download-checkbox">
        <input type="checkbox" ${isSelected ? 'checked' : ''} data-id="${file.id}">
      </label>
      <div class="download-thumb">${thumbHTML}</div>
      <div class="download-info">
        <div class="download-name">${newName}</div>
        <div class="download-meta">
          ${hasAssets
            ? `<span class="badge">${assets.length} 个素材</span> ${assets[0]?.w}×${assets[0]?.h} …`
            : `${file.processResult.processedImageData.width}×${file.processResult.processedImageData.height}`
          }
        </div>
      </div>
      <div class="download-status">${hasAssets ? '已拆分' : '整图'}</div>
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
