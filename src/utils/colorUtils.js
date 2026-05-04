// 色彩工具模块：Lab 色彩空间转换和颜色距离计算

function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return [
    0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb,
    0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb,
    0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb
  ];
}

function xyzToLab(x, y, z) {
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  const fx = x / Xn > 0.008856 ? Math.cbrt(x / Xn) : (7.787 * (x / Xn)) + 16 / 116;
  const fy = y / Yn > 0.008856 ? Math.cbrt(y / Yn) : (7.787 * (y / Yn)) + 16 / 116;
  const fz = z / Zn > 0.008856 ? Math.cbrt(z / Zn) : (7.787 * (z / Zn)) + 16 / 116;
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function colorDistance(r1, g1, b1, r2, g2, b2) {
  const [x1, y1, z1] = rgbToXyz(r1, g1, b1);
  const [x2, y2, z2] = rgbToXyz(r2, g2, b2);
  const [L1, a1, b1L] = xyzToLab(x1, y1, z1);
  const [L2, a2, b2L] = xyzToLab(x2, y2, z2);
  const dL = L1 - L2, da = a1 - a2, db = b1L - b2L;
  return Math.sqrt(dL * dL + da * da + db * db);
}

export function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function isColorClose(r, g, b, targetR, targetG, targetB, tolerance) {
  return colorDistance(r, g, b, targetR, targetG, targetB) <= tolerance;
}

const REGION_COLORS = [
  '#e94560', '#3fb950', '#58a6ff', '#d29922', '#bc8cff',
  '#00bcd4', '#ff6d00', '#64dd17', '#d500f9', '#304ffe',
  '#ff1744', '#00e676', '#2979ff', '#ffc400', '#d500f9',
  '#18ffff', '#ff9100', '#76ff03', '#ea80fc', '#448aff',
];

export function getRegionColor(index) {
  return REGION_COLORS[index % REGION_COLORS.length];
}
