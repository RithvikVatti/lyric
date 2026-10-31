import { ColorPalette, PalettePreset } from '../types';

export const PRESET_PALETTES: Record<PalettePreset, ColorPalette> = {
  'album-art': {
    dominant: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    dark: '#0f172a',
    light: '#e2e8f0',
    glow: 'rgba(59, 130, 246, 0.75)'
  },
  neon: {
    dominant: '#ff007f',
    secondary: '#00f0ff',
    accent: '#ffe600',
    dark: '#0c051f',
    light: '#ffffff',
    glow: 'rgba(255, 0, 127, 0.85)'
  },
  sunset: {
    dominant: '#f43f5e',
    secondary: '#f97316',
    accent: '#fbbf24',
    dark: '#1c0a15',
    light: '#fff1f2',
    glow: 'rgba(244, 63, 94, 0.8)'
  },
  indigo: {
    dominant: '#6366f1',
    secondary: '#a855f7',
    accent: '#38bdf8',
    dark: '#0f0c24',
    light: '#f5f3ff',
    glow: 'rgba(99, 102, 241, 0.8)'
  },
  emerald: {
    dominant: '#10b981',
    secondary: '#06b6d4',
    accent: '#34d399',
    dark: '#021e17',
    light: '#ecfdf5',
    glow: 'rgba(16, 185, 129, 0.8)'
  },
  amber: {
    dominant: '#f59e0b',
    secondary: '#d97706',
    accent: '#fef08a',
    dark: '#1e1302',
    light: '#fefce8',
    glow: 'rgba(245, 158, 11, 0.8)'
  },
  monochrome: {
    dominant: '#94a3b8',
    secondary: '#cbd5e1',
    accent: '#ffffff',
    dark: '#020617',
    light: '#ffffff',
    glow: 'rgba(255, 255, 255, 0.7)'
  }
};

const colorCache = new Map<string, ColorPalette>();

/**
 * Extracts a harmonious dynamic color palette from an image URL using Canvas
 */
export async function extractPaletteFromImage(imageUrl: string): Promise<ColorPalette> {
  if (!imageUrl) return PRESET_PALETTES['album-art'];
  if (colorCache.has(imageUrl)) return colorCache.get(imageUrl)!;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Timeout fallback after 2s
    const timeout = setTimeout(() => {
      resolve(PRESET_PALETTES['album-art']);
    }, 2000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(PRESET_PALETTES['album-art']);
          return;
        }

        // Downscale for fast sampling
        const width = 64;
        const height = 64;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;

        const colorBuckets: { r: number; g: number; b: number; count: number; sat: number }[] = [];

        // Sample every 4th pixel
        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue; // skip transparent

          // Calculate HSV saturation and lightness
          const max = Math.max(r, g, b) / 255;
          const min = Math.min(r, g, b) / 255;
          const delta = max - min;
          const sat = max === 0 ? 0 : delta / max;
          const light = (max + min) / 2;

          // Skip near-black or near-white for dominant palette accents
          if (light < 0.1 || light > 0.95) continue;

          // Simple color quantization bucket (round to 32)
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;

          const existing = colorBuckets.find(
            b => Math.abs(b.r - qr) < 24 && Math.abs(b.g - qg) < 24 && Math.abs(b.b - qb) < 24
          );

          if (existing) {
            existing.count++;
          } else {
            colorBuckets.push({ r: qr, g: qg, b: qb, count: 1, sat });
          }
        }

        if (colorBuckets.length === 0) {
          resolve(PRESET_PALETTES['album-art']);
          return;
        }

        // Sort by popularity and saturation
        colorBuckets.sort((a, b) => (b.count * (1 + b.sat * 2)) - (a.count * (1 + a.sat * 2)));

        const c1 = colorBuckets[0] || { r: 59, g: 130, b: 246 };
        // Find second distinct color
        const c2 = colorBuckets.find(b => colorDist(b, c1) > 80) || colorBuckets[1] || c1;
        // Find highest saturation accent color
        const vibrant = [...colorBuckets].sort((a, b) => b.sat - a.sat)[0] || c1;

        const dominant = `rgb(${c1.r}, ${c1.g}, ${c1.b})`;
        const secondary = `rgb(${c2.r}, ${c2.g}, ${c2.b})`;
        const accent = `rgb(${vibrant.r}, ${vibrant.g}, ${vibrant.b})`;
        const dark = `rgb(${Math.max(10, Math.floor(c1.r * 0.15))}, ${Math.max(10, Math.floor(c1.g * 0.15))}, ${Math.max(18, Math.floor(c1.b * 0.2))})`;
        const light = `rgb(${Math.min(255, Math.floor(c1.r * 0.4 + 180))}, ${Math.min(255, Math.floor(c1.g * 0.4 + 180))}, ${Math.min(255, Math.floor(c1.b * 0.4 + 180))})`;
        const glow = `rgba(${vibrant.r}, ${vibrant.g}, ${vibrant.b}, 0.8)`;

        const palette: ColorPalette = {
          dominant,
          secondary,
          accent,
          dark,
          light,
          glow
        };

        colorCache.set(imageUrl, palette);
        resolve(palette);
      } catch (err) {
        console.warn('Canvas palette extraction error (CORS?), using fallback:', err);
        resolve(PRESET_PALETTES['album-art']);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(PRESET_PALETTES['album-art']);
    };

    img.src = imageUrl;
  });
}

function colorDist(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
  );
}
