import type { RGBA } from '../raster/RasterRenderer';

export function hexToRGBA(hex: string, alpha = 255): RGBA {
  hex = hex.replace(/^#/, '');
  let r: number, g: number, b: number;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  }
  return { r, g, b, a: Math.max(0, Math.min(255, Math.round(alpha))) };
}