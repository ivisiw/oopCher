export type RGBA = { r: number; g: number; b: number; a: number };

export function clampByte(v: number): number {
    const rounded = Math.round(v);
    if (rounded < 0) return 0;
    if (rounded > 255) return 255;
    return rounded;
}

export function hexToRGBA(hex: string, alpha = 255): RGBA {
    let r: number, g: number, b: number;
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
    } else {
        throw new Error("Invalid hex color format");
    }
    return { r, g, b, a: clampByte(alpha) };
}

export class RasterRenderer {
    private ctx: CanvasRenderingContext2D;
    private imageData: ImageData | null = null;
    private buf!: Uint8ClampedArray;
    public width = 0;
    public height = 0;
    public dpr = 1;

    private canvas: HTMLCanvasElement;
    private _onWindowResize: () => void;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No 2D context");
        this.ctx = ctx;
        this._onWindowResize = () => this.resize();
        window.addEventListener("resize", this._onWindowResize);
        this.resize();
    }

    dispose(): void {
        window.removeEventListener("resize", this._onWindowResize);
    }

    private idx(x: number, y: number): number {
        return (y * this.width + x) * 4;
    }

    setPixel(x: number, y: number, color: RGBA): void {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        const i = this.idx(x, y);
        this.buf[i] = clampByte(color.r);
        this.buf[i + 1] = clampByte(color.g);
        this.buf[i + 2] = clampByte(color.b);
        this.buf[i + 3] = clampByte(color.a);
    }

    private blendPixel(x: number, y: number, color: RGBA, alphaFactor = 1): void {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        const i = this.idx(x, y);

        const dr = this.buf[i];
        const dg = this.buf[i + 1];
        const db = this.buf[i + 2];
        const da = this.buf[i + 3];

        let sa = (color.a / 255) * alphaFactor;
        if (sa <= 0) return;
        const sr = (color.r / 255) * sa;
        const sg = (color.g / 255) * sa;
        const sb = (color.b / 255) * sa;

        const dstA = da / 255;
        if (dstA === 0) {
            this.buf[i] = clampByte(sr * 255);
            this.buf[i + 1] = clampByte(sg * 255);
            this.buf[i + 2] = clampByte(sb * 255);
            this.buf[i + 3] = clampByte(sa * 255);
            return;
        }

        const outA = sa + dstA * (1 - sa);
        if (outA === 0) return;
        const outR = (sr + dr / 255 * dstA * (1 - sa)) / outA;
        const outG = (sg + dg / 255 * dstA * (1 - sa)) / outA;
        const outB = (sb + db / 255 * dstA * (1 - sa)) / outA;

        this.buf[i] = clampByte(outR * 255);
        this.buf[i + 1] = clampByte(outG * 255);
        this.buf[i + 2] = clampByte(outB * 255);
        this.buf[i + 3] = clampByte(outA * 255);
    }

    resize(): void {
        this.dpr = window.devicePixelRatio || 1;
        const cssWidth = this.canvas.clientWidth;
        const cssHeight = this.canvas.clientHeight;
        const physWidth = Math.max(1, Math.floor(cssWidth * this.dpr));
        const physHeight = Math.max(1, Math.floor(cssHeight * this.dpr));

        this.canvas.width = physWidth;
        this.canvas.height = physHeight;
        this.width = physWidth;
        this.height = physHeight;

        this.imageData = this.ctx.createImageData(physWidth, physHeight);
        this.buf = this.imageData.data;
    }

    beginFrame(clear = true): void {
        if (clear && this.buf) {
            this.buf.fill(0);
        }
    }

    commit(): void {
        if (this.imageData) {
            this.ctx.putImageData(this.imageData, 0, 0);
        }
    }


    private drawHSpan(y: number, x0: number, x1: number, color: RGBA): void {
        let start = Math.min(x0, x1);
        let end = Math.max(x0, x1);
        for (let x = start; x <= end; x++) {
            this.blendPixel(x, y, color, 1);
        }
    }

    fillPolygon(points: { x: number; y: number }[], color: RGBA): void {
        if (points.length < 3) return;
        let minY = Infinity, maxY = -Infinity;
        for (const p of points) {
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }
        minY = Math.max(0, Math.floor(minY));
        maxY = Math.min(this.height - 1, Math.ceil(maxY));

        const n = points.length;
        for (let y = minY; y <= maxY; y++) {
            const intersections: number[] = [];
            for (let i = 0; i < n; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % n];
                if (p1.y === p2.y) continue;
                if ((p1.y > y) !== (p2.y > y)) {
                    const t = (y - p1.y) / (p2.y - p1.y);
                    const x = p1.x + t * (p2.x - p1.x);
                    intersections.push(x);
                }
            }
            intersections.sort((a, b) => a - b);
            for (let i = 0; i < intersections.length - 1; i += 2) {
                const xStart = Math.ceil(intersections[i]);
                const xEnd = Math.floor(intersections[i + 1]);
                if (xStart <= xEnd) this.drawHSpan(y, xStart, xEnd, color);
            }
        }
    }

    fillCircle(cx: number, cy: number, radius: number, color: RGBA): void {
        const r = Math.abs(radius);
        const ymin = Math.max(0, Math.ceil(cy - r));
        const ymax = Math.min(this.height - 1, Math.floor(cy + r));
        for (let y = ymin; y <= ymax; y++) {
            const dy = y - cy;
            const dx = Math.sqrt(r * r - dy * dy);
            const x1 = Math.ceil(cx - dx);
            const x2 = Math.floor(cx + dx);
            if (x1 <= x2) this.drawHSpan(y, x1, x2, color);
        }
    }

    strokeLine(x0: number, y0: number, x1: number, y1: number, color: RGBA, width = 1): void {
        const half = width / 2;
        if (half <= 0) return;
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) {
            this.fillCircle(x0, y0, half, color);
            return;
        }
        const nx = -dy / len;
        const ny = dx / len;
        const pts = [
            { x: x0 + nx * half, y: y0 + ny * half },
            { x: x0 - nx * half, y: y0 - ny * half },
            { x: x1 - nx * half, y: y1 - ny * half },
            { x: x1 + nx * half, y: y1 + ny * half },
        ];
        this.fillPolygon(pts, color);
        this.fillCircle(x0, y0, half, color);
        this.fillCircle(x1, y1, half, color);
    }

    strokePolygon(points: { x: number; y: number }[], color: RGBA, width = 1): void {
        if (points.length < 2) return;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % n];
            this.strokeLine(p1.x, p1.y, p2.x, p2.y, color, width);
        }
        const half = width / 2;
        if (half > 0) {
            for (const p of points) {
                this.fillCircle(p.x, p.y, half, color);
            }
        }
    }
}