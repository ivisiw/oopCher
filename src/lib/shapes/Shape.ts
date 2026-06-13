import { mat3, type Mat3, type Point2D } from '../math/mat3';
import type { RasterRenderer } from '../raster/RasterRenderer';

//позиция, поворот, масштаб
export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

//прямоугольная область
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

//цвета заливки/контура, прозрачность
export interface ShapeStyle {
  fillStyle: string;
  fillOpacity: number;
  strokeStyle: string;
  strokeWidth: number;
  strokeOpacity: number;
}

let _idCounter = 0;

export abstract class Shape {
  readonly id: number;
  transform: Transform;
  fillStyle: string;
  fillOpacity: number;
  strokeStyle: string;
  strokeWidth: number;
  strokeOpacity: number;

  constructor(style?: Partial<ShapeStyle>) {
    this.id = ++_idCounter;
    this.transform = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    this.fillStyle = style?.fillStyle ?? '#4a9eff';
    this.fillOpacity = style?.fillOpacity ?? 1;
    this.strokeStyle = style?.strokeStyle ?? '#000000';
    this.strokeWidth = style?.strokeWidth ?? 1;
    this.strokeOpacity = style?.strokeOpacity ?? 1;
  }

  
  getLocalToDeviceMatrix(): Mat3 {
    const { x, y, rotation, scaleX, scaleY } = this.transform;
    return mat3.fromTransform(x, y, rotation, scaleX, scaleY);
  }

  getDeviceToLocalMatrix(): Mat3 | null {
    return mat3.invert(this.getLocalToDeviceMatrix());
  }

  transformPointToDevice(px: number, py: number): Point2D {
    return mat3.transformPoint(this.getLocalToDeviceMatrix(), px, py);
  }

  transformPointToLocal(px: number, py: number): Point2D {
    const inv = this.getDeviceToLocalMatrix();
    if (!inv) return { x: px, y: py };
    return mat3.transformPoint(inv, px, py);
  }

  getCenter(): Point2D {
    const b = this.getBounds();
    return {
      x: (b.minX + b.maxX) / 2,
      y: (b.minY + b.maxY) / 2,
    };
  }

  resizeFromDeviceAABB(minX: number, minY: number, maxX: number, maxY: number): void {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = maxX - minX;
    const h = maxY - minY;
    this.transform.x = cx;
    this.transform.y = cy;
    this._applyAABBSize(w, h);
  }

  setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.resizeFromDeviceAABB(minX, minY, maxX, maxY);
  }

  protected _applyAABBSize(_w: number, _h: number): void {}

  
  abstract drawRaster(r: RasterRenderer): void;
  abstract hitTest(px: number, py: number): boolean;
  abstract getBounds(): Bounds;
  abstract getLocalBounds(): Bounds;
  abstract toJSON(): object;
  abstract clone(): Shape;
}
