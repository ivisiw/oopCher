import type { RasterRenderer } from '../lib/raster/RasterRenderer';
import type { Shape } from '../lib/shapes/Shape';
import {
  HANDLE_SIZE, ROTATE_OFFSET, RESIZE_HANDLES, handlePos,
} from './editorTypes';

const SEL_COLOR = { r: 59, g: 130, b: 246, a: 255 };
const HANDLE_FILL = { r: 255, g: 255, b: 255, a: 255 };
const ROTATE_COLOR = { r: 234, g: 179, b: 8, a: 255 };
const CP_COLOR = { r: 239, g: 68, b: 68, a: 255 };

//рисует всё UI-сопровождение для выделенной фигуры
export function drawSelectionOverlay(r: RasterRenderer, shape: Shape, editingPoints: boolean) {
  const b = shape.getBounds();
  const { minX, minY, maxX, maxY } = b;
  const hs = HANDLE_SIZE;

  r.strokePolygon([
    { x: minX, y: minY }, { x: maxX, y: minY },
    { x: maxX, y: maxY }, { x: minX, y: maxY },
    { x: minX, y: minY },
  ], SEL_COLOR, 1);

  if (!editingPoints) {
    for (const h of RESIZE_HANDLES) {
      const p = handlePos(h, minX, minY, maxX, maxY);
      r.fillPolygon([
        { x: p.x - hs, y: p.y - hs }, { x: p.x + hs, y: p.y - hs },
        { x: p.x + hs, y: p.y + hs }, { x: p.x - hs, y: p.y + hs },
      ], HANDLE_FILL);
      r.strokePolygon([
        { x: p.x - hs, y: p.y - hs }, { x: p.x + hs, y: p.y - hs },
        { x: p.x + hs, y: p.y + hs }, { x: p.x - hs, y: p.y + hs },
        { x: p.x - hs, y: p.y - hs },
      ], SEL_COLOR, 1);
    }

    const rx = (minX + maxX) / 2;
    const ry = minY - ROTATE_OFFSET;
    r.strokeLine((minX + maxX) / 2, minY, rx, ry, SEL_COLOR, 1);
    r.fillCircle(rx, ry, hs + 1, ROTATE_COLOR);
    r.strokePolygon(circlePoints(rx, ry, hs + 2, 12), SEL_COLOR, 1);
  }

  if (editingPoints) {
    const cp = getControlPoints(shape);
    for (const p of cp) {
      r.fillCircle(p.x, p.y, hs, CP_COLOR);
    }
  }
}

//получение контрольных точек фигуры
export function getControlPoints(shape: Shape): { x: number; y: number }[] {
  const s = shape as unknown as Record<string, unknown>;
  if (typeof s.getControlPoints === 'function') {
    const localPts = (s.getControlPoints as () => { x: number; y: number }[])();
    return localPts.map(p => shape.transformPointToDevice(p.x, p.y));
  }
  if (typeof s.flattenDevicePoints === 'function') {
    return (s.flattenDevicePoints as () => { x: number; y: number }[])();
  }
  return [];
}

//проверка наличия контрольных точек
export function hasControlPoints(shape: Shape): boolean {
  const s = shape as unknown as Record<string, unknown>;
  return typeof s.getControlPoints === 'function';
}

//кнопка вращения
function circlePoints(cx: number, cy: number, r: number, n: number) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}