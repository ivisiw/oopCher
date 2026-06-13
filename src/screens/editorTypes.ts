import type { Shape } from '../lib/shapes/Shape';

export type EditorMode =
  | 'idle'
  | 'moving'
  | 'resizing'
  | 'rotating'
  | 'editingPoints';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface DragState {
  startX: number;
  startY: number;
  origTx: number;
  origTy: number;
  origRotation: number;
  origScaleX: number;
  origScaleY: number;
  origW?: number;
  origH?: number;
  handle?: ResizeHandle;
  pointIdx?: number;
}

export interface EditorState {
  shapes: Shape[];
  selectedId: number | null;
  mode: EditorMode;
  drag: DragState | null;
}

//преобразование координат
export function canvasPoint(
  e: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  dpr: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * dpr,
    y: (e.clientY - rect.top) * dpr,
  };
}

export const HANDLE_SIZE = 8;
export const ROTATE_OFFSET = 28;

export interface HandleDef {
  id: ResizeHandle;
  nx: number;
  ny: number;
}

//хэндлы
export const RESIZE_HANDLES: HandleDef[] = [
  { id: 'nw', nx: 0, ny: 0 },
  { id: 'n',  nx: 0.5, ny: 0 },
  { id: 'ne', nx: 1, ny: 0 },
  { id: 'e',  nx: 1, ny: 0.5 },
  { id: 'se', nx: 1, ny: 1 },
  { id: 's',  nx: 0.5, ny: 1 },
  { id: 'sw', nx: 0, ny: 1 },
  { id: 'w',  nx: 0, ny: 0.5 },
];

export function handlePos(
  h: HandleDef,
  minX: number, minY: number, maxX: number, maxY: number
) {
  return {
    x: minX + h.nx * (maxX - minX),
    y: minY + h.ny * (maxY - minY),
  };
}

export function hitHandle(
  px: number, py: number,
  minX: number, minY: number, maxX: number, maxY: number
): ResizeHandle | null {
  for (const h of RESIZE_HANDLES) {
    const p = handlePos(h, minX, minY, maxX, maxY);
    if (Math.abs(px - p.x) <= HANDLE_SIZE + 2 && Math.abs(py - p.y) <= HANDLE_SIZE + 2) {
      return h.id;
    }
  }
  return null;
}

//определение клика по хэндлу вращения
export function hitRotateHandle(
  px: number, py: number,
  minX: number, minY: number, maxX: number, _maxY: number
): boolean {
  const rx = (minX + maxX) / 2;
  const ry = minY - ROTATE_OFFSET;
  return Math.hypot(px - rx, py - ry) <= HANDLE_SIZE + 2;
}