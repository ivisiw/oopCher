import type { RasterRenderer } from '../raster/RasterRenderer';
import { Shape, type Bounds, type ShapeStyle } from './Shape';
import { hexToRGBA } from './shapeUtils';
import { boundsFromPoints, distPointToPolyline } from './bezierUtils';

export type PathMode = 'polyline' | 'bezier' | 'catmull';

const SEGMENTS_PER_CURVE = 24;

export class PathBezier extends Shape {
  private anchors: { x: number; y: number }[];
  mode: PathMode;
  closed: boolean;

  constructor(
    points: { x: number; y: number }[],
    mode: PathMode = 'catmull',
    closed = false,
    style?: Partial<ShapeStyle>
  ) {
    super(style);
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    this.transform.x = cx;
    this.transform.y = cy;
    this.anchors = points.map(p => ({ x: p.x - cx, y: p.y - cy }));
    this.mode = mode;
    this.closed = closed;
  }

  getControlPoints() {
    return this.anchors.map(p => ({ ...p }));
  }

  setControlPoint(idx: number, pt: { x: number; y: number }) {
    if (idx >= 0 && idx < this.anchors.length) this.anchors[idx] = { ...pt };
  }

  addPointLocal(pt: { x: number; y: number }, insertAt?: number) {
    if (insertAt === undefined) {
      this.anchors.push({ ...pt });
    } else {
      this.anchors.splice(insertAt, 0, { ...pt });
    }
  }

  removePoint(index: number) {
    if (this.anchors.length > 2) this.anchors.splice(index, 1);
  }

  catmullToBeziers(pts: { x: number; y: number }[], closed: boolean): {
    p0: { x: number; y: number };
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    p3: { x: number; y: number };
  }[] {
    const n = pts.length;
    if (n < 2) return [];
    const segments = [];

    const getPoint = (i: number) => {
      if (closed) return pts[((i % n) + n) % n];
      return pts[Math.max(0, Math.min(n - 1, i))];
    };

    const end = closed ? n : n - 1;
    for (let i = 0; i < end; i++) {
      const p0 = getPoint(i - 1);
      const p1 = getPoint(i);
      const p2 = getPoint(i + 1);
      const p3 = getPoint(i + 2);

      const cp1 = {
        x: p1.x + (p2.x - p0.x) / 6,
        y: p1.y + (p2.y - p0.y) / 6,
      };
      const cp2 = {
        x: p2.x - (p3.x - p1.x) / 6,
        y: p2.y - (p3.y - p1.y) / 6,
      };
      segments.push({ p0: p1, p1: cp1, p2: cp2, p3: p2 });
    }
    return segments;
  }

    flattenDevicePoints(): { x: number; y: number }[] {
    const toDevice = (p: { x: number; y: number }) =>
      this.transformPointToDevice(p.x, p.y);

    if (this.mode === 'polyline') {
      const pts = this.anchors.map(toDevice);
      if (this.closed && pts.length > 2) pts.push({ ...pts[0] });
      return pts;
    }

    if (this.mode === 'bezier') {
      const result: { x: number; y: number }[] = [];
      const n = this.anchors.length;
      for (let i = 0; i + 3 < n; i += 3) {
        const [p0, p1, p2, p3] = [
          this.anchors[i], this.anchors[i + 1],
          this.anchors[i + 2], this.anchors[i + 3],
        ];
        for (let s = 0; s <= SEGMENTS_PER_CURVE; s++) {
          const t = s / SEGMENTS_PER_CURVE;
          const mt = 1 - t;
          const local = {
            x: mt**3*p0.x + 3*mt**2*t*p1.x + 3*mt*t**2*p2.x + t**3*p3.x,
            y: mt**3*p0.y + 3*mt**2*t*p1.y + 3*mt*t**2*p2.y + t**3*p3.y,
          };
          if (s === 0 && result.length > 0) continue;
          result.push(toDevice(local));
        }
      }
      return result;
    }

    const segs = this.catmullToBeziers(this.anchors, this.closed);
    const result: { x: number; y: number }[] = [];
    for (const seg of segs) {
      for (let s = 0; s <= SEGMENTS_PER_CURVE; s++) {
        const t = s / SEGMENTS_PER_CURVE;
        const mt = 1 - t;
        const local = {
          x: mt**3*seg.p0.x + 3*mt**2*t*seg.p1.x + 3*mt*t**2*seg.p2.x + t**3*seg.p3.x,
          y: mt**3*seg.p0.y + 3*mt**2*t*seg.p1.y + 3*mt*t**2*seg.p2.y + t**3*seg.p3.y,
        };
        if (s === 0 && result.length > 0) continue;
        result.push(toDevice(local));
      }
    }
    return result;
  }

  drawRaster(r: RasterRenderer): void {
    const pts = this.flattenDevicePoints();
    if (pts.length < 2) return;
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
    return boundsFromPoints(this.anchors);
  }

  toJSON() {
    const { x, y } = this.transform;
    return {
      type: 'PathBezier',
      id: this.id,
      transform: { ...this.transform },
      mode: this.mode,
      closed: this.closed,
      anchors: this.anchors.map(p => ({ x: x + p.x, y: y + p.y })),
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,
    };
  }

  clone(): PathBezier {
    const { x, y } = this.transform;
    const pb = new PathBezier(
      this.anchors.map(p => ({ x: x + p.x, y: y + p.y })),
      this.mode,
      this.closed,
      { strokeStyle: this.strokeStyle, strokeWidth: this.strokeWidth, strokeOpacity: this.strokeOpacity }
    );
    pb.transform = { ...this.transform };
    return pb;
  }
}