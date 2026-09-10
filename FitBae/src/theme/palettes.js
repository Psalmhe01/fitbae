export const palettes = {
  green: { label: 'Original', hue: 76, saturation: 68, accent: '#b8df27' },
  blue: { label: 'Coast', hue: 213, saturation: 74, accent: '#8bbcff' },
  pink: { label: 'Rose', hue: 337, saturation: 65, accent: '#f5a1c3' },
  purple: { label: 'Iris', hue: 268, saturation: 62, accent: '#c4a4ef' },
  brown: { label: 'Cocoa', hue: 26, saturation: 32, accent: '#d7ad8d' },
};

export function paletteTokens(id, mode) {
  const { hue: h, saturation: s } = palettes[id] || palettes.green;
  const dark = mode === 'dark';
  const c = (saturation, lightness) => `hsl(${h} ${saturation}% ${lightness}%)`;
  return {
    '--brand': c(s, dark ? 78 : 72), '--brand-strong': c(s, dark ? 82 : 29),
    '--brand-soft': c(s / 2, dark ? 19 : 93), '--brand-ink': c(30, 12),
    '--canvas': c(18, dark ? 7 : 96), '--surface': c(18, dark ? 10 : 98),
    '--surface-raised': c(16, dark ? 13 : 100), '--surface-muted': c(16, dark ? 17 : 92),
    '--ink': c(15, dark ? 95 : 10), '--ink-soft': c(10, dark ? 70 : 38),
    '--line': c(13, dark ? 23 : 84), '--line-strong': c(12, dark ? 34 : 70),
  };
}

export function readPreference(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
export function writePreference(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Session-only when storage is blocked. */ }
}
