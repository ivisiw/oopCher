import type { RasterRenderer } from '../raster/RasterRenderer';
import { Shape, type Bounds, type ShapeStyle } from './Shape';
import { hexToRGBA } from './shapeUtils';

export class Triangle extends Shape {
  private lA: { x: number; y: number };
  private lB: { x: number; y: number };
  private lC: { x: number; y: number };

  constructor(
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    style?: Partial<ShapeStyle>
  ) {
    super(style);
    const cx = (x1 + x2 + x3) / 3;
    const cy = (y1 + y2 + y3) / 3;
    this.transform.x = cx;
    this.transform.y = cy;
    this.lA = { x: x1 - cx, y: y1 - cy };
    this.lB = { x: x2 - cx, y: y2 - cy };
    this.lC = { x: x3 - cx, y: y3 - cy };
  }

  getControlPoints() {
    return [{ ...this.lA }, { ...this.lB }, { ...this.lC }];
  }

  setControlPoint(idx: number, pt: { x: number; y: number }) {
    if (idx === 0) this.lA = { ...pt };
    else if (idx === 1) this.lB = { ...pt };
    else if (idx === 2) this.lC = { ...pt };
  }

  private deviceVertices() {
    return [
      this.transformPointToDevice(this.lA.x, this.lA.y),
      this.transformPointToDevice(this.lB.x, this.lB.y),
      this.transformPointToDevice(this.lC.x, this.lC.y),
    ];
  }

  drawRaster(r: RasterRenderer): void {
    const verts = this.deviceVertices();
    const fill = hexToRGBA(this.fillStyle, Math.round(this.fillOpacity * 255));
    r.fillPolygon(verts, fill);
    if (this.strokeWidth > 0) {
      const stroke = hexToRGBA(this.strokeStyle, Math.round(this.strokeOpacity * 255));
      r.strokePolygon([...verts, verts[0]], stroke, this.strokeWidth);
    }
  }

  hitTest(px: number, py: number): boolean {
    const local = this.transformPointToLocal(px, py);
    return pointInTriangle(local, this.lA, this.lB, this.lC);
  }

  getBounds(): Bounds {
    const verts = this.deviceVertices();
    return boundsFromPoints(verts);
  }

  getLocalBounds(): Bounds {
    return boundsFromPoints([this.lA, this.lB, this.lC]);
  }

  toJSON() {
    const { x, y } = this.transform;
    return {
      type: 'Triangle',
      id: this.id,
      transform: { ...this.transform },
      x1: x + this.lA.x, y1: y + this.lA.y,
      x2: x + this.lB.x, y2: y + this.lB.y,
      x3: x + this.lC.x, y3: y + this.lC.y,
      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,
    };
  }

  clone(): Triangle {
    const { x, y } = this.transform;
    const t = new Triangle(
      x + this.lA.x, y + this.lA.y,
      x + this.lB.x, y + this.lB.y,
      x + this.lC.x, y + this.lC.y,
      {
        fillStyle: this.fillStyle, fillOpacity: this.fillOpacity,
        strokeStyle: this.strokeStyle, strokeWidth: this.strokeWidth,
        strokeOpacity: this.strokeOpacity,
      }
    );
    t.transform = { ...this.transform };
    return t;
  }
}

function sign(p: {x:number;y:number}, a: {x:number;y:number}, b: {x:number;y:number}) {
  return (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
}

function pointInTriangle(
  p: {x:number;y:number},
  a: {x:number;y:number},
  b: {x:number;y:number},
  c: {x:number;y:number}
): boolean {
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function boundsFromPoints(pts: {x:number;y:number}[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}