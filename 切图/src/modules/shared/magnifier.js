const MAG_SIZE = 140;
const MAG_ZOOM = 8;
const MAG_RADIUS = Math.floor(MAG_SIZE / MAG_ZOOM / 2);

let isActive = false;
let targetCanvas = null;
let onPickCallback = null;
let magEl = null;
let magCanvas = null;
let magCtx = null;
let infoEl = null;
let originalImage = null;

export function enable(canvas, img, onPick) {
  targetCanvas = canvas;
  originalImage = img;
  onPickCallback = onPick;
  isActive = true;

  if (!magEl) {
    magEl = document.getElementById('magnifier');
    magCanvas = document.getElementById('mag-canvas');
    magCtx = magCanvas.getContext('2d');
    infoEl = document.getElementById('mag-info');
  }

  canvas.style.cursor = 'crosshair';
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mouseleave', handleMouseLeave);
}

export function disable() {
  isActive = false;
  if (targetCanvas) {
    targetCanvas.style.cursor = 'default';
    targetCanvas.removeEventListener('mousemove', handleMouseMove);
    targetCanvas.removeEventListener('click', handleClick);
    targetCanvas.removeEventListener('mouseleave', handleMouseLeave);
  }
  if (magEl) magEl.style.display = 'none';
}

function handleMouseMove(e) {
  if (!isActive || !originalImage) return;
  magEl.style.display = 'block';

  const rect = targetCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const s = targetCanvas.width > 0 ? rect.width / targetCanvas.width : 1;
  const ox = Math.floor(mx / s);
  const oy = Math.floor(my / s);

  magCtx.imageSmoothingEnabled = false;
  magCtx.clearRect(0, 0, MAG_SIZE, MAG_SIZE);
  magCtx.fillStyle = '#000';
  magCtx.fillRect(0, 0, MAG_SIZE, MAG_SIZE);

  const srcX = ox - MAG_RADIUS;
  const srcY = oy - MAG_RADIUS;
  const srcW = MAG_RADIUS * 2;
  const srcH = MAG_RADIUS * 2;

  const tmpC = document.createElement('canvas');
  tmpC.width = originalImage.width;
  tmpC.height = originalImage.height;
  const tmpCtx = tmpC.getContext('2d');
  tmpCtx.drawImage(originalImage, 0, 0);

  magCtx.drawImage(tmpC, srcX, srcY, srcW, srcH, 0, 0, MAG_SIZE, MAG_SIZE);

  const cellSize = MAG_ZOOM;
  magCtx.strokeStyle = 'rgba(255,255,255,0.12)';
  magCtx.lineWidth = 0.5;
  for (let i = 0; i <= srcW; i++) {
    magCtx.beginPath();
    magCtx.moveTo(i * cellSize, 0);
    magCtx.lineTo(i * cellSize, MAG_SIZE);
    magCtx.stroke();
  }
  for (let j = 0; j <= srcH; j++) {
    magCtx.beginPath();
    magCtx.moveTo(0, j * cellSize);
    magCtx.lineTo(MAG_SIZE, j * cellSize);
    magCtx.stroke();
  }

  magCtx.strokeStyle = 'rgba(248,81,73,0.9)';
  magCtx.lineWidth = 2;
  magCtx.strokeRect(MAG_RADIUS * cellSize, MAG_RADIUS * cellSize, cellSize, cellSize);

  if (ox >= 0 && ox < originalImage.width && oy >= 0 && oy < originalImage.height) {
    const pd = tmpCtx.getImageData(ox, oy, 1, 1).data;
    if (infoEl) {
      infoEl.textContent = `(${ox}, ${oy})  rgb(${pd[0]}, ${pd[1]}, ${pd[2]})`;
    }
  }

  let left = e.clientX + 20;
  let top = e.clientY - MAG_SIZE - 10;
  if (left + MAG_SIZE > window.innerWidth) left = e.clientX - MAG_SIZE - 20;
  if (top < 0) top = e.clientY + 20;
  magEl.style.left = left + 'px';
  magEl.style.top = top + 'px';
}

function handleClick(e) {
  if (!isActive || !originalImage || !onPickCallback) return;

  const rect = targetCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const s = targetCanvas.width > 0 ? rect.width / targetCanvas.width : 1;
  const ox = Math.floor(mx / s);
  const oy = Math.floor(my / s);

  const tmpC = document.createElement('canvas');
  tmpC.width = originalImage.width;
  tmpC.height = originalImage.height;
  tmpC.getContext('2d').drawImage(originalImage, 0, 0);
  const pd = tmpC.getContext('2d').getImageData(
    Math.max(0, Math.min(ox, originalImage.width - 1)),
    Math.max(0, Math.min(oy, originalImage.height - 1)),
    1, 1
  ).data;

  onPickCallback({ r: pd[0], g: pd[1], b: pd[2] }, ox, oy);
  disable();
}

function handleMouseLeave() {
  if (magEl) magEl.style.display = 'none';
}

export function isEnabled() {
  return isActive;
}
