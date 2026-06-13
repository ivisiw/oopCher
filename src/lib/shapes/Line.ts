import type { RasterRenderer } from '../raster/RasterRenderer';
import { Shape, type Bounds, type ShapeStyle } from './Shape';
import { hexToRGBA } from './shapeUtils';

export class Line extends Shape {
  private hx: number;
  private hy: number;

  constructor(x0: number, y0: number, x1: number, y1: number, style?: Partial<ShapeStyle>) {
    super(style);
    this.transform.x = (x0 + x1) / 2;
    this.transform.y = (y0 + y1) / 2;
    this.hx = (x1 - x0) / 2;
    this.hy = (y1 - y0) / 2;
  }

  private get localA() { return { x: -this.hx, y: -this.hy }; }
  private get localB() { return { x: this.hx, y: this.hy }; }

  getLocalBounds(): Bounds {
    const { hx, hy } = this;
    return {
      minX: -Math.abs(hx),
      minY: -Math.abs(hy),
      maxX: Math.abs(hx),
      maxY: Math.abs(hy),
    };
  }

  getBounds(): Bounds {
    const a = this.transformPointToDevice(this.localA.x, this.localA.y);
    const b = this.transformPointToDevice(this.localB.x, this.localB.y);
    return {
      minX: Math.min(a.x, b.x),
      minY: Math.min(a.y, b.y),
      maxX: Math.max(a.x, b.x),
      maxY: Math.max(a.y, b.y),
    };
  }

  drawRaster(r: RasterRenderer): void {
    const a = this.transformPointToDevice(this.localA.x, this.localA.y);
    const b = this.transformPointToDevice(this.localB.x, this.localB.y);
    const color = hexToRGBA(this.strokeStyle, Math.round(this.strokeOpacity * 255));

      r.strokeLine(a.x, a.y, b.x, b.y, color, this.strokeWidth);
  }

  hitTest(px: number, py: number): boolean {
    const local = this.transformPointToLocal(px, py);
    const threshold = Math.max(this.strokeWidth / 2 + 3, 5);
    return distPointToSegment(local, this.localA, this.localB) <= threshold;
  }

  toJSON() {
    const a = this.localA, b = this.localB;
    const { x, y } = this.transform;
    return {
      type: 'Line',
      id: this.id,
      x0: x + a.x, y0: y + a.y,
      x1: x + b.x, y1: y + b.y,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,
    };
  }

  clone(): Line {
    const a = this.localA, b = this.localB;
    const { x, y } = this.transform;
    const l = new Line(x + a.x, y + a.y, x + b.x, y + b.y, {
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,
    });
    l.transform = { ...this.transform };
    return l;
  }
}

function distPointToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const abx = b.x - a.x, aby = b.y - a.y;
  const apx = p.x - a.x, apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return Math.hypot(apx, apy);
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  return Math.hypot(p.x - cx, p.y - cy);
}
