import { useRef, useEffect, useReducer, useCallback } from 'react';
import { RasterRenderer } from '../lib/raster/RasterRenderer';
import { Rect } from '../lib/shapes/Rect';
import { Oval } from '../lib/shapes/Oval';
import { Triangle } from '../lib/shapes/Triangle';
import { Line } from '../lib/shapes/Line';
import { QuadraticBezier } from '../lib/shapes/QuadraticBezier';
import { CubicBezier } from '../lib/shapes/CubicBezier';
import { PathBezier } from '../lib/shapes/PathBezier';
import type { Shape } from '../lib/shapes/Shape';
import {
  canvasPoint, hitHandle, hitRotateHandle,
  HANDLE_SIZE,
  type EditorState, type EditorMode, type DragState, type ResizeHandle,}
  from './editorTypes';
import { drawSelectionOverlay, getControlPoints, hasControlPoints } from './overlayRenderer';

type ShapeType = 'rect' | 'oval' | 'triangle' | 'line' | 'quadratic' | 'cubic' | 'path';

type Action =
  | { type: 'ADD_SHAPE'; shape: Shape }
  | { type: 'DELETE_SELECTED' }
  | { type: 'SELECT'; id: number | null }
  | { type: 'SET_MODE'; mode: EditorMode }
  | { type: 'START_DRAG'; drag: DragState }
  | { type: 'END_DRAG' }
  | { type: 'LAYER_UP'; id: number }
  | { type: 'LAYER_DOWN'; id: number }
  | { type: 'LAYER_TOP'; id: number }
  | { type: 'LAYER_BOTTOM'; id: number };

//обрабатывает все изменения состояния
function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'ADD_SHAPE':
      return { ...state, shapes: [...state.shapes, action.shape], selectedId: action.shape.id };
    //удаление
    case 'DELETE_SELECTED':
      if (state.selectedId === null) return state;
      return { ...state, shapes: state.shapes.filter(s => s.id !== state.selectedId), selectedId: null, mode: 'idle' };
    case 'SELECT':
      return { ...state, selectedId: action.id, mode: 'idle', drag: null };
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'START_DRAG':
      return { ...state, drag: action.drag };
    case 'END_DRAG':
      return { ...state, drag: null };
    //слои
    case 'LAYER_UP': {
      const i = state.shapes.findIndex(s => s.id === action.id);
      if (i < 0 || i >= state.shapes.length - 1) return state;
      const shapes = [...state.shapes];
      [shapes[i], shapes[i + 1]] = [shapes[i + 1], shapes[i]];
      return { ...state, shapes };
    }
    case 'LAYER_DOWN': {
      const i = state.shapes.findIndex(s => s.id === action.id);
      if (i <= 0) return state;
      const shapes = [...state.shapes];
      [shapes[i - 1], shapes[i]] = [shapes[i], shapes[i - 1]];
      return { ...state, shapes };
    }
    case 'LAYER_TOP': {
      const shape = state.shapes.find(s => s.id === action.id);
      if (!shape) return state;
      return { ...state, shapes: [...state.shapes.filter(s => s.id !== action.id), shape] };
    }
    case 'LAYER_BOTTOM': {
      const shape = state.shapes.find(s => s.id === action.id);
      if (!shape) return state;
      return { ...state, shapes: [shape, ...state.shapes.filter(s => s.id !== action.id)] };
    }
    default: return state;
  }
}

//создание фигур
function createShape(type: ShapeType, cx: number, cy: number): Shape {
  const COLORS = ['#e74c3c','#3498db','#48ec8c','#d58cf2','#ea9e5c','#d97eb2'];
  const fill = COLORS[Math.floor(Math.random() * COLORS.length)];
  const base = { fillStyle: fill, fillOpacity: 0.85, strokeStyle: '#1e293b', strokeWidth: 2, strokeOpacity: 1 };
  const stroke = { strokeStyle: '#1e293b', strokeWidth: 3, strokeOpacity: 1 };
  switch (type) {
    case 'rect':      return new Rect(cx, cy, 120, 80, base);
    case 'oval':      return new Oval(cx, cy, 70, 45, base);
    case 'triangle':  return new Triangle(cx - 60, cy + 40, cx + 60, cy + 40, cx, cy - 50, base);
    case 'line':      return new Line(cx - 70, cy, cx + 70, cy, { ...stroke, strokeWidth: 4 });
    case 'quadratic': return new QuadraticBezier(cx - 80, cy + 30, cx, cy - 60, cx + 80, cy + 30, stroke);
    case 'cubic':     return new CubicBezier(cx - 90, cy, cx - 30, cy - 80, cx + 30, cy + 80, cx + 90, cy, stroke);
    case 'path':      return new PathBezier([
      { x: cx - 80, y: cy }, { x: cx - 40, y: cy - 60 },
      { x: cx, y: cy + 40 }, { x: cx + 40, y: cy - 60 }, { x: cx + 80, y: cy },
    ], 'catmull', false, stroke);
  }
}


const INITIAL: EditorState = { shapes: [], selectedId: null, mode: 'idle', drag: null };

export default function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RasterRenderer | null>(null);
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!canvasRef.current) return;
    const r = new RasterRenderer(canvasRef.current);
    rendererRef.current = r;
    const ro = new ResizeObserver(() => r.resize());
    const container = canvasRef.current.parentElement;
    if (container) ro.observe(container);
    return () => { ro.disconnect(); r.dispose(); };
  }, []);

  //цикл отрисовки
  useEffect(() => {
    let frameId: number;
    const loop = () => {
      const r = rendererRef.current;
      const s = stateRef.current;
      if (r) {
        r.beginFrame(true);
        for (const shape of s.shapes) shape.drawRaster(r);
        if (s.selectedId !== null) {
          const sel = s.shapes.find(sh => sh.id === s.selectedId);
          if (sel) drawSelectionOverlay(r, sel, s.mode === 'editingPoints');
        }
        r.commit();
      }
      frameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') dispatch({ type: 'DELETE_SELECTED' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  //обработка нажатий мыши
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const r = rendererRef.current;
    if (!canvas || !r) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const { x, y } = canvasPoint(e, canvas, r.dpr);
    const s = stateRef.current;

    if (s.selectedId !== null) {
      const sel = s.shapes.find(sh => sh.id === s.selectedId);
      if (sel) {
        const b = sel.getBounds();

        //поворот
        if (s.mode !== 'editingPoints' && hitRotateHandle(x, y, b.minX, b.minY, b.maxX, b.maxY)) {
          dispatch({ type: 'SET_MODE', mode: 'rotating' });
          dispatch({ type: 'START_DRAG', drag: { startX: x, startY: y, origTx: sel.transform.x, origTy: sel.transform.y, origRotation: sel.transform.rotation, origScaleX: sel.transform.scaleX, origScaleY: sel.transform.scaleY } });
          return;
        }

        //размер
        if (s.mode !== 'editingPoints') {
          const handle = hitHandle(x, y, b.minX, b.minY, b.maxX, b.maxY);
          if (handle) {
            dispatch({ type: 'SET_MODE', mode: 'resizing' });
            dispatch({ type: 'START_DRAG', drag: { startX: x, startY: y, origTx: sel.transform.x, origTy: sel.transform.y, origRotation: sel.transform.rotation, origScaleX: sel.transform.scaleX, origScaleY: sel.transform.scaleY, handle, origW: b.maxX - b.minX, origH: b.maxY - b.minY } });
            return;
          }
        }

        if (s.mode === 'editingPoints') {
          const cps = getControlPoints(sel);
          for (let i = 0; i < cps.length; i++) {
            if (Math.hypot(x - cps[i].x, y - cps[i].y) <= HANDLE_SIZE + 4) {
              dispatch({ type: 'START_DRAG', drag: { startX: x, startY: y, origTx: sel.transform.x, origTy: sel.transform.y, origRotation: sel.transform.rotation, origScaleX: sel.transform.scaleX, origScaleY: sel.transform.scaleY, pointIdx: i } });
              return;
            }
          }
        }

        if (sel.hitTest(x, y)) {
          dispatch({ type: 'SET_MODE', mode: 'moving' });
          dispatch({ type: 'START_DRAG', drag: { startX: x, startY: y, origTx: sel.transform.x, origTy: sel.transform.y, origRotation: sel.transform.rotation, origScaleX: sel.transform.scaleX, origScaleY: sel.transform.scaleY } });
          return;
        }
      }
    }

    for (let i = s.shapes.length - 1; i >= 0; i--) {
      if (s.shapes[i].hitTest(x, y)) {
        dispatch({ type: 'SELECT', id: s.shapes[i].id });
        dispatch({ type: 'SET_MODE', mode: 'moving' });
        dispatch({ type: 'START_DRAG', drag: { startX: x, startY: y, origTx: s.shapes[i].transform.x, origTy: s.shapes[i].transform.y, origRotation: s.shapes[i].transform.rotation, origScaleX: s.shapes[i].transform.scaleX, origScaleY: s.shapes[i].transform.scaleY } });
        return;
      }
    }

    dispatch({ type: 'SELECT', id: null });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const r = rendererRef.current;
    if (!canvas || !r) return;
    const { x, y } = canvasPoint(e, canvas, r.dpr);
    const s = stateRef.current;
    if (!s.drag || s.selectedId === null) return;

    const dx = x - s.drag.startX;
    const dy = y - s.drag.startY;
    const sel = s.shapes.find(sh => sh.id === s.selectedId);
    if (!sel) return;

    //перемещаем фигуру
    if (s.mode === 'moving') {
      sel.transform.x = s.drag.origTx + dx;
      sel.transform.y = s.drag.origTy + dy;
    }

    //перемещаем фигуру
    if (s.mode === 'resizing' && s.drag.handle && s.drag.origW && s.drag.origH) {
      const h = s.drag.handle;
      let dsx = 0, dsy = 0;
      if (h.includes('e')) dsx = dx;
      if (h.includes('w')) dsx = -dx;
      if (h.includes('s')) dsy = dy;
      if (h.includes('n')) dsy = -dy;
      const MIN_PX = 20;
      const newW = Math.max(MIN_PX, s.drag.origW + dsx);
      const newH = Math.max(MIN_PX, s.drag.origH + dsy);
      const baseW = s.drag.origW / s.drag.origScaleX;
      const baseH = s.drag.origH / s.drag.origScaleY;
      sel.transform.scaleX = newW / Math.max(1, baseW);
      sel.transform.scaleY = newH / Math.max(1, baseH);
    }

    //вычисляем угол поворота
    if (s.mode === 'rotating') {
      const cx = sel.transform.x;
      const cy = sel.transform.y;
      const angle = Math.atan2(y - cy, x - cx) - Math.atan2(s.drag.startY - cy, s.drag.startX - cx);
      sel.transform.rotation = s.drag.origRotation + angle;
    }

    //двигаем контрольную точку
    if (s.mode === 'editingPoints' && s.drag.pointIdx !== undefined) {
      const local = sel.transformPointToLocal(x, y);
      const ss = sel as unknown as { setControlPoint: (i: number, p: { x: number; y: number }) => void };
      if (typeof ss.setControlPoint === 'function') {
        ss.setControlPoint(s.drag.pointIdx, local);
      }
    }
  }, []);

  //завершение перетаскивания
  const onPointerUp = useCallback(() => {
    if (stateRef.current.drag) dispatch({ type: 'END_DRAG' });
  }, []);

  //текущая выбранная фигура
  const selectedShape = state.shapes.find(s => s.id === state.selectedId);
  //можно ли редактировать контрольные точки
  const canEditPts = selectedShape ? hasControlPoints(selectedShape) : false;

  //создание фигуры в центре холста
  const addShape = (type: ShapeType) => {
    const canvas = canvasRef.current;
    const r = rendererRef.current;
    if (!canvas || !r) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    dispatch({ type: 'ADD_SHAPE', shape: createShape(type, cx, cy) });
  };

  const BTNS: { type: ShapeType; label: string }[] = [
    { type: 'rect',      label: 'Rect' },
    { type: 'oval',      label: 'Oval' },
    { type: 'triangle',  label: 'Triangle' },
    { type: 'line',      label: 'Line' },
    { type: 'quadratic', label: 'Quad Bezier' },
    { type: 'cubic',     label: 'Cubic Bezier' },
    { type: 'path',      label: 'Path' },
  ];

  const btn = (label: string, onClick: () => void, active = false, danger = false) => (
    <button onClick={onClick} style={{
      padding: '6px 0', width: '100%', border: 'none', borderRadius: 6,
      cursor: 'pointer', fontSize: 12, textAlign: 'center' as const,
      background: danger ? '#7f1d1d' : active ? '#3b82f6' : '#334155',
      color: danger ? '#fca5a5' : '#e2e8f0',
    }}
    onMouseEnter={e => { if (!active && !danger) (e.currentTarget as HTMLButtonElement).style.background = '#475569'; }}
    onMouseLeave={e => { if (!active && !danger) (e.currentTarget as HTMLButtonElement).style.background = '#334155'; }}
    >{label}</button>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui,sans-serif', overflow: 'hidden' }}>
      <div style={{ width: 144, background: '#1e293b', display: 'flex', flexDirection: 'column', gap: 6, padding: 12, borderRight: '1px solid #334155', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Добавить</div>
        {BTNS.map(({ type, label }) => (
          <button key={type} onClick={() => addShape(type)} style={{
            padding: '7px 0', background: '#334155', color: '#e2e8f0', border: 'none',
            borderRadius: 6, cursor: 'pointer', fontSize: 12,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#3b82f6')}
          onMouseLeave={e => (e.currentTarget.style.background = '#334155')}
          >{label}</button>
        ))}
      </div>

      <div style={{ flex: 1, position: 'relative', background: '#f8fafc', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ width: '100%', height: '100%', display: 'block', cursor: state.mode === 'moving' ? 'grabbing' : state.mode === 'rotating' ? 'crosshair' : 'default' }}
        />
        {state.shapes.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#94a3b8', fontSize: 15 }}>
            Выберите фигуру слева чтобы добавить на холст
          </div>
        )}
      </div>

      <div style={{ width: 196, background: '#1e293b', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #334155', flexShrink: 0, overflow: 'hidden' }}>

        <div style={{ padding: 12, borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Свойства</div>
          {selectedShape ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              <div style={{ color: '#94a3b8', marginBottom: 2 }}>{selectedShape.constructor.name} #{selectedShape.id}</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {btn('Переместить', () => dispatch({ type: 'SET_MODE', mode: 'moving' }), state.mode === 'moving')}
                {canEditPts && btn('Точки', () => dispatch({ type: 'SET_MODE', mode: state.mode === 'editingPoints' ? 'idle' : 'editingPoints' }), state.mode === 'editingPoints')}
              </div>
              {btn('Удалить', () => dispatch({ type: 'DELETE_SELECTED' }), false, true)}
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3, color: '#94a3b8' }}>
                {[
                  ['X', selectedShape.transform.x.toFixed(0)],
                  ['Y', selectedShape.transform.y.toFixed(0)],
                  ['Угол', (selectedShape.transform.rotation * 180 / Math.PI).toFixed(1) + '°'],
                  ['ScaleX', selectedShape.transform.scaleX.toFixed(2)],
                  ['ScaleY', selectedShape.transform.scaleY.toFixed(2)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>{k}</span><span>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#475569', fontSize: 12 }}>Ничего не выбрано</div>
          )}
        </div>

        <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Слои</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...state.shapes].reverse().map(shape => {
              const isSel = shape.id === state.selectedId;
              return (
                <div key={shape.id} onClick={() => dispatch({ type: 'SELECT', id: shape.id })}
                  style={{ padding: '5px 7px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                    background: isSel ? '#1e40af' : '#0f172a', color: isSel ? '#bfdbfe' : '#64748b',
                    border: `1px solid ${isSel ? '#3b82f6' : 'transparent'}`,
                  }}>
                  <div style={{ marginBottom: isSel ? 4 : 0 }}>{shape.constructor.name} #{shape.id}</div>
                  {isSel && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[
                        ['⇈', 'LAYER_TOP'],['↑','LAYER_UP'],['↓','LAYER_DOWN'],['⇊','LAYER_BOTTOM']
                      ].map(([icon, actionType]) => (
                        <button key={actionType} onClick={e => { e.stopPropagation(); dispatch({ type: actionType as Action['type'], id: shape.id } as Action); }}
                          style={{ flex: 1, border: 'none', borderRadius: 3, background: '#334155', color: '#e2e8f0', cursor: 'pointer', fontSize: 11, padding: '1px 0' }}>
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {state.shapes.length === 0 && <div style={{ color: '#334155', fontSize: 12 }}>Пусто</div>}
          </div>
        </div>

        <div style={{ padding: 10, borderTop: '1px solid #334155', fontSize: 10, color: '#334155', lineHeight: 1.7 }}>
          Клик — выбор<br/>
          Тащи — переместить<br/>
          □ ручки — resize<br/>
          ● жёлтый — поворот<br/>
          Delete — удалить
        </div>
      </div>
    </div>
  );
}