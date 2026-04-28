export function dilate(mask, w, h, radius) {
  const result = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 0) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            result[ny * w + nx] = 1;
          }
        }
      }
    }
  }
  return result;
}

export function erode(mask, w, h, radius) {
  const result = new Uint8Array(mask.length);
  result.set(mask);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 0) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h || mask[ny * w + nx] === 0) {
            result[y * w + x] = 0;
            break;
          }
        }
        if (result[y * w + x] === 0) break;
      }
    }
  }
  return result;
}

export function close(mask, w, h, radius) {
  return erode(dilate(mask, w, h, radius), w, h, radius);
}

export function open(mask, w, h, radius) {
  return dilate(erode(mask, w, h, radius), w, h, radius);
}

export function dilateByN(mask, w, h, n) {
  let result = mask;
  for (let i = 0; i < n; i++) {
    const d = new Uint8Array(w * h);
    d.set(result);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (result[y * w + x] === 1) continue;
        if ((x > 0 && result[y * w + x - 1] === 1) ||
            (x < w - 1 && result[y * w + x + 1] === 1) ||
            (y > 0 && result[(y - 1) * w + x] === 1) ||
            (y < h - 1 && result[(y + 1) * w + x] === 1)) {
          d[y * w + x] = 1;
        }
      }
    }
    result = d;
  }
  return result;
}

export function erodeByN(mask, w, h, n) {
  let result = mask;
  for (let i = 0; i < n; i++) {
    const e = new Uint8Array(w * h);
    e.set(result);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (result[y * w + x] === 0) continue;
        if ((x === 0 || result[y * w + x - 1] === 0) ||
            (x === w - 1 || result[y * w + x + 1] === 0) ||
            (y === 0 || result[(y - 1) * w + x] === 0) ||
            (y === h - 1 || result[(y + 1) * w + x] === 0)) {
          e[y * w + x] = 0;
        }
      }
    }
    result = e;
  }
  return result;
}
