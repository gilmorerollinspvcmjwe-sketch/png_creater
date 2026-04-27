export function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
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
