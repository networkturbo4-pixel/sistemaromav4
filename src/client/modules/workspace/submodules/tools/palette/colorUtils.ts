// Utilidades profesionales de Color para el Generador de Paletas Roma

export interface ColorShade {
  shade: number; // 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
  hex: string;
  isLight: boolean;
}

export interface ColorPalette {
  id: string;
  name: string;
  primaryShade: number;
  shades: ColorShade[];
}

// Convertir HEX a RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 59, g: 73, b: 237 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Convertir RGB a HEX
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Convertir RGB a HSL
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Convertir HSL a RGB
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = (h % 360) / 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return { r, g, b };
}

// Convertir RGB a CMYK
export function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const rPrime = r / 255;
  const gPrime = g / 255;
  const bPrime = b / 255;
  const k = 1 - Math.max(rPrime, gPrime, bPrime);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = Math.round(((1 - rPrime - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gPrime - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bPrime - k) / (1 - k)) * 100);
  return { c, m, y, k: Math.round(k * 100) };
}

// Luminancia Relativa (WCAG)
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const sRGB = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

// Contraste WCAG entre dos colores (HEX)
export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

// Generar rampa de 11 tonalidades estilo Tailwind (50 -> 950) a partir de un color base
export function generateTailwindRamp(baseHex: string): ColorShade[] {
  const baseRgb = hexToRgb(baseHex);
  const { h, s } = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);

  // Escala balanceada de luminosidad y saturación para emular Tailwind CSS
  const shadeSpecs: { shade: number; l: number; satFactor: number }[] = [
    { shade: 50, l: 96, satFactor: 0.55 },
    { shade: 100, l: 92, satFactor: 0.65 },
    { shade: 200, l: 84, satFactor: 0.75 },
    { shade: 300, l: 73, satFactor: 0.85 },
    { shade: 400, l: 60, satFactor: 0.95 },
    { shade: 500, l: 49, satFactor: 1.0 },
    { shade: 600, l: 40, satFactor: 1.0 },
    { shade: 700, l: 32, satFactor: 0.95 },
    { shade: 800, l: 24, satFactor: 0.9 },
    { shade: 900, l: 18, satFactor: 0.85 },
    { shade: 950, l: 11, satFactor: 0.8 },
  ];

  return shadeSpecs.map((spec) => {
    const adjSat = Math.min(100, Math.round(s * spec.satFactor));
    const rgb = hslToRgb(h, adjSat, spec.l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const lum = getRelativeLuminance(rgb.r, rgb.g, rgb.b);
    return {
      shade: spec.shade,
      hex,
      isLight: lum > 0.4,
    };
  });
}

// Detector de nombres de color aproximados
export function getColorName(hex: string): string {
  const rgb = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  if (s < 12) {
    if (l > 85) return 'Blanco Puro / Nieve';
    if (l > 60) return 'Gris Platino';
    if (l > 35) return 'Gris Pizarra';
    return 'Negro Obsidiana';
  }

  if (h >= 345 || h < 12) {
    return l < 40 ? 'Rojo Carmesí' : 'Rojo Escarlata';
  }
  if (h >= 12 && h < 38) {
    return l < 40 ? 'Terracota' : 'Naranja Atardecer';
  }
  if (h >= 38 && h < 65) {
    return l < 45 ? 'Ámbar Dorado' : 'Amarillo Sol';
  }
  if (h >= 65 && h < 165) {
    if (h < 100) return 'Verde Lima';
    return l < 35 ? 'Verde Bosque' : 'Verde Esmeralda';
  }
  if (h >= 165 && h < 195) {
    return 'Cian Turquesa';
  }
  if (h >= 195 && h < 250) {
    if (h >= 220 && h <= 240) return 'Persian Blue';
    return l < 35 ? 'Azul Marino Real' : 'Azul Eléctrico';
  }
  if (h >= 250 && h < 290) {
    return l < 35 ? 'Índigo Profundo' : 'Violeta Real';
  }
  if (h >= 290 && h < 330) {
    return 'Magenta Púrpura';
  }
  return 'Rosa Coral';
}

// Paletas de muestra predefinidas inspiradas en agencias y productos de alto impacto
export const PRESET_PALETTES: { name: string; baseHex: string; primaryShade: number }[] = [
  { name: 'Persian Blue', baseHex: '#3E49ED', primaryShade: 700 },
  { name: 'Roma Imperial Indigo', baseHex: '#4F46E5', primaryShade: 600 },
  { name: 'Emerald Horizon', baseHex: '#059669', primaryShade: 600 },
  { name: 'Sunset Terracotta', baseHex: '#EA580C', primaryShade: 500 },
  { name: 'Royal Violet', baseHex: '#7C3AED', primaryShade: 600 },
  { name: 'Rose Crimson', baseHex: '#E11D48', primaryShade: 500 },
  { name: 'Ocean Cyan', baseHex: '#0284C7', primaryShade: 600 },
  { name: 'Obsidian Slate', baseHex: '#475569', primaryShade: 700 },
];
