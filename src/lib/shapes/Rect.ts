import type { RasterRenderer, RGBA } from '../raster/RasterRenderer';
import { Shape, type Bounds, type ShapeStyle } from './Shape';
import { hexToRGBA } from './shapeUtils';

export class Rect extends Shape {
  w: number;
  h: number;

  constructor(x: number, y: number, w: number, h: number, style?: Partial<ShapeStyle>) {
    super(style);
    this.transform.x = x;
    this.transform.y = y;
    this.w = w;
    this.h = h;
  }

  protected override _applyAABBSize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  getLocalBounds(): Bounds {
    return {
      minX: -this.w / 2,
      minY: -this.h / 2,
      maxX: this.w / 2,
      maxY: this.h / 2,
    };
  }

  getBounds(): Bounds {
    const corners = this._deviceCorners();
    return boundsFromPoints(corners);
  }

  private _localCorners() {
    const hw = this.w / 2, hh = this.h / 2;
    return [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
  }

  private _deviceCorners() {
    return this._localCorners().map(p => this.transformPointToDevice(p.x, p.y));
  }

  drawRaster(r: RasterRenderer): void {
    const corners = this._deviceCorners();
    const fill = hexToRGBA(this.fillStyle, Math.round(this.fillOpacity * 255));
    r.fillPolygon(corners, fill);

    if (this.strokeWidth > 0) {
      const stroke = hexToRGBA(this.strokeStyle, Math.round(this.strokeOpacity * 255));
      r.strokePolygon([...corners, corners[0]], stroke, this.strokeWidth);
    }
  }

  hitTest(px: number, py: number): boolean {
    const local = this.transformPointToLocal(px, py);
    return (
      local.x >= -this.w / 2 &&
      local.x <= this.w / 2 &&
      local.y >= -this.h / 2 &&
      local.y <= this.h / 2
    );
  }

  toJSON() {
    return {
      type: 'Rect',
      id: this.id,
      transform: { ...this.transform },
      w: this.w,
      h: this.h,
      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,
    };
  }

  clone(): Rect {
    const r = new Rect(this.transform.x, this.transform.y, this.w, this.h, {
      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,
    });
    r.transform = { ...this.transform };
    return r;
  }
}

function boundsFromPoints(pts: { x: number; y: number }[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}
