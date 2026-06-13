import type { RasterRenderer } from '../raster/RasterRenderer';
import { Shape, type Bounds, type ShapeStyle } from './Shape';
import { hexToRGBA } from './shapeUtils';

const OVAL_SEGMENTS = 64;

export class Oval extends Shape {
  rx: number;
  ry: number;

  constructor(cx: number, cy: number, rx: number, ry: number, style?: Partial<ShapeStyle>) {
    super(style);
    this.transform.x = cx;
    this.transform.y = cy;
    this.rx = rx;
    this.ry = ry;
  }

  protected override _applyAABBSize(w: number, h: number): void {
    this.rx = w / 2;
    this.ry = h / 2;
  }

  private _localPoints(): { x: number; y: number }[] {
    const pts = [];
    for (let i = 0; i < OVAL_SEGMENTS; i++) {
      const theta = (2 * Math.PI * i) / OVAL_SEGMENTS;
      pts.push({ x: this.rx * Math.cos(theta), y: this.ry * Math.sin(theta) });
    }
    return pts;
  }

  private _devicePoints() {
    return this._localPoints().map(p => this.transformPointToDevice(p.x, p.y));
  }

  getLocalBounds(): Bounds {
    return {
      minX: -this.rx,
      minY: -this.ry,
      maxX: this.rx,
      maxY: this.ry,
    };
  }

  getBounds(): Bounds {
    const pts = this._devicePoints();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  drawRaster(r: RasterRenderer): void {
    const pts = this._devicePoints();
    const fill = hexToRGBA(this.fillStyle, Math.round(this.fillOpacity * 255));
    r.fillPolygon(pts, fill);

    if (this.strokeWidth > 0) {
      const stroke = hexToRGBA(this.strokeStyle, Math.round(this.strokeOpacity * 255));
      r.strokePolygon([...pts, pts[0]], stroke, this.strokeWidth);
    }
  }

  hitTest(px: number, py: number): boolean {
    const local = this.transformPointToLocal(px, py);
    const nx = local.x / this.rx;
    const ny = local.y / this.ry;
    return nx * nx + ny * ny <= 1;
  }

  toJSON() {
    return {
      type: 'Oval',
      id: this.id,
      transform: { ...this.transform },
      rx: this.rx,
      ry: this.ry,
      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,
    };
  }

  clone(): Oval {
    const o = new Oval(this.transform.x, this.transform.y, this.rx, this.ry, {
      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,
    });
    o.transform = { ...this.transform };
    return o;
  }
}
