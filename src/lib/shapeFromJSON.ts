import { Rect } from './shapes/Rect';
import { Line } from './shapes/Line';
import { Oval } from './shapes/Oval';
import { Triangle } from './shapes/Triangle';
import { QuadraticBezier } from './shapes/QuadraticBezier';
import { CubicBezier } from './shapes/CubicBezier';
import { PathBezier } from './shapes/PathBezier';
import type { Shape } from './shapes/Shape';

export function shapeFromJSON(data: Record<string, any>): Shape | null {
  try {
    const type: string = data.type;
    const tr = data.transform ?? {};
    const style = {
      fillStyle:    data.fillStyle    ?? '#4a9eff',
      fillOpacity:  data.fillOpacity  ?? 1,
      strokeStyle:  data.strokeStyle  ?? '#000000',
      strokeWidth:  data.strokeWidth  ?? 1,
      strokeOpacity:data.strokeOpacity ?? 1,
    };

    let shape: Shape | null = null;

    switch (type) {
      case 'Rect': {
        shape = new Rect(tr.x ?? 0, tr.y ?? 0, data.w ?? 100, data.h ?? 60, style);
        break;
      }
      case 'Line': {
        shape = new Line(data.x0, data.y0, data.x1, data.y1, style);
        break;
      }
      case 'Oval': {
        shape = new Oval(tr.x ?? 0, tr.y ?? 0, data.rx ?? 50, data.ry ?? 30, style);
        break;
      }
      case 'Triangle': {
        shape = new Triangle(data.x1, data.y1, data.x2, data.y2, data.x3, data.y3, style);
        break;
      }
      case 'QuadraticBezier': {
        const p0 = data.p0, p1 = data.p1, p2 = data.p2;
        shape = new QuadraticBezier(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, style);
        break;
      }
      case 'CubicBezier': {
        const p0 = data.p0, p1 = data.p1, p2 = data.p2, p3 = data.p3;
        shape = new CubicBezier(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, style);
        break;
      }
      case 'PathBezier': {
        shape = new PathBezier(
          data.anchors ?? [],
          data.mode ?? 'catmull',
          data.closed ?? false,
          style
        );
        break;
      }
      default:
        return null;
    }

    if (shape && tr) {
      shape.transform.x        = tr.x        ?? shape.transform.x;
      shape.transform.y        = tr.y        ?? shape.transform.y;
      shape.transform.rotation = tr.rotation ?? 0;
      shape.transform.scaleX   = tr.scaleX   ?? 1;
      shape.transform.scaleY   = tr.scaleY   ?? 1;
    }

    return shape;
  } catch {
    return null;
  }
}