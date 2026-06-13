import type { RasterRenderer } from '../raster/RasterRenderer';
import { Shape, type Bounds, type ShapeStyle } from './Shape';
import { hexToRGBA } from './shapeUtils';
import { boundsFromPoints, distPointToPolyline } from './bezierUtils';

const SEGMENTS = 32;

//куб-я кривая
export class CubicBezier extends Shape {
  private pts: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
  ];

  constructor(
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    style?: Partial<ShapeStyle>
  ) {
    super(style);
    const cx = (x0 + x3) / 2;
    const cy = (y0 + y3) / 2;
    this.transform.x = cx;
    this.transform.y = cy;
    this.pts = [
      { x: x0 - cx, y: y0 - cy },
      { x: x1 - cx, y: y1 - cy },
      { x: x2 - cx, y: y2 - cy },
      { x: x3 - cx, y: y3 - cy },
    ];
  }

  getControlPoints() {
    return this.pts.map(p => ({ ...p }));
  }

  setControlPoint(idx: number, pt: { x: number; y: number }) {
    if (idx >= 0 && idx < 4) this.pts[idx] = { ...pt };
  }

  evalLocal(t: number): { x: number; y: number } {
    const [p0, p1, p2, p3] = this.pts;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    };
  }

  flattenDevicePoints(segments = SEGMENTS): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= segments; i++) {
      const local = this.evalLocal(i / segments);
      pts.push(this.transformPointToDevice(local.x, local.y));
    }
    return pts;
  }

  drawRaster(r: RasterRenderer): void {
    const pts = this.flattenDevicePoints();
    const stroke = hexToRGBA(this.strokeStyle, Math.round(this.strokeOpacity * 255));
    r.strokePolygon(pts, stroke, this.strokeWidth);
  }

  hitTest(px: number, py: number): boolean {
    const pts = this.flattenDevicePoints();
    const threshold = Math.max(this.strokeWidth / 2 + 3, 5);
    return distPointToPolyline({ x: px, y: py }, pts) <= threshold;
  }

  getBounds(): Bounds {
    return boundsFromPoints(this.flattenDevicePoints());
  }

  getLocalBounds(): Bounds {
    const localPts: { x: number; y: number }[] = [];
    for (let i = 0; i <= SEGMENTS; i++) localPts.push(this.evalLocal(i / SEGMENTS));
    return boundsFromPoints(localPts);
  }

  toJSON() {
    const { x, y } = this.transform;
    return {
      type: 'CubicBezier',
      id: this.id,
      transform: { ...this.transform },
      p0: { x: x + this.pts[0].x, y: y + this.pts[0].y },
      p1: { x: x + this.pts[1].x, y: y + this.pts[1].y },
      p2: { x: x + this.pts[2].x, y: y + this.pts[2].y },
      p3: { x: x + this.pts[3].x, y: y + this.pts[3].y },
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,
    };
  }

  clone(): CubicBezier {
    const { x, y } = this.transform;
    const c = new CubicBezier(
      x + this.pts[0].x, y + this.pts[0].y,
      x + this.pts[1].x, y + this.pts[1].y,
      x + this.pts[2].x, y + this.pts[2].y,
      x + this.pts[3].x, y + this.pts[3].y,
      { strokeStyle: this.strokeStyle, strokeWidth: this.strokeWidth, strokeOpacity: this.strokeOpacity }
    );
    c.transform = { ...this.transform };
    return c;
  }
}