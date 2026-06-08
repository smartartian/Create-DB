import { useRef, useEffect, useCallback, useState } from 'react';
import { useDesignerStore } from '@/store';
import { Table, Relation } from '@/types';

interface CanvasState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  isPanning: boolean;
  dragTableId: string | null;
  dragStartX: number;
  dragStartY: number;
  lastMouseX: number;
  lastMouseY: number;
}

export default function ERCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<CanvasState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    isPanning: false,
    dragTableId: null,
    dragStartX: 0,
    dragStartY: 0,
    lastMouseX: 0,
    lastMouseY: 0,
  });

  const model = useDesignerStore((s) => s.model);
  const ui = useDesignerStore((s) => s.ui);
  const moveTable = useDesignerStore((s) => s.moveTable);
  const selectTable = useDesignerStore((s) => s.selectTable);
  const selectRelation = useDesignerStore((s) => s.selectRelation);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getMousePos = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const state = stateRef.current;
    return {
      x: (e.clientX - rect.left - state.offsetX) / state.zoom,
      y: (e.clientY - rect.top - state.offsetY) / state.zoom,
    };
  }, []);

  const hitTestTable = useCallback((x: number, y: number): Table | null => {
    for (let i = model.tables.length - 1; i >= 0; i--) {
      const t = model.tables[i];
      if (x >= t.position.x && x <= t.position.x + t.width &&
          y >= t.position.y && y <= t.position.y + t.height) {
        return t;
      }
    }
    return null;
  }, [model.tables]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    const { width, height } = canvasSize;

    ctx.clearRect(0, 0, width, height);

    // Grid
    const gridSize = 20 * state.zoom;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const startX = state.offsetX % gridSize;
    const startY = state.offsetY % gridSize;
    for (let x = startX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = startY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(state.offsetX, state.offsetY);
    ctx.scale(state.zoom, state.zoom);

    // Relations
    for (const rel of model.relations) {
      drawRelation(ctx, rel, model.tables, ui.selectedRelationId === rel.id);
    }

    // Tables
    for (const table of model.tables) {
      const isSelected = ui.selectedTableId === table.id;
      drawTable(ctx, table, isSelected, model.databaseType);
    }

    ctx.restore();
  }, [model, ui, canvasSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const state = stateRef.current;
    const table = hitTestTable(pos.x, pos.y);

    if (table) {
      state.isDragging = true;
      state.dragTableId = table.id;
      state.dragStartX = pos.x - table.position.x;
      state.dragStartY = pos.y - table.position.y;
      selectTable(table.id);
    } else {
      state.isPanning = true;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
      selectTable(null);
      selectRelation(null);
    }
  }, [getMousePos, hitTestTable, selectTable, selectRelation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const state = stateRef.current;
    if (state.isDragging && state.dragTableId) {
      const pos = getMousePos(e);
      const newX = pos.x - state.dragStartX;
      const newY = pos.y - state.dragStartY;
      moveTable(state.dragTableId, newX, newY);
    } else if (state.isPanning) {
      const dx = e.clientX - state.lastMouseX;
      const dy = e.clientY - state.lastMouseY;
      state.offsetX += dx;
      state.offsetY += dy;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
      draw();
    }
  }, [getMousePos, moveTable, draw]);

  const handleMouseUp = useCallback(() => {
    const state = stateRef.current;
    state.isDragging = false;
    state.isPanning = false;
    state.dragTableId = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const state = stateRef.current;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(4, state.zoom * zoomFactor));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      state.offsetX = mouseX - (mouseX - state.offsetX) * (newZoom / state.zoom);
      state.offsetY = mouseY - (mouseY - state.offsetY) * (newZoom / state.zoom);
    }
    state.zoom = newZoom;
    draw();
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-900">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-400 border border-slate-700">
        {Math.round(stateRef.current.zoom * 100)}%
      </div>
    </div>
  );
}

function drawTable(ctx: CanvasRenderingContext2D, table: Table, isSelected: boolean, dbType: string) {
  const x = table.position.x;
  const y = table.position.y;
  const w = table.width;
  const h = table.height;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Body
  ctx.fillStyle = isSelected ? '#1e3a5f' : '#1e293b';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Border
  ctx.strokeStyle = isSelected ? '#0ea5e9' : '#334155';
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.stroke();

  // Header
  ctx.fillStyle = isSelected ? '#0c4a6e' : '#0f172a';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 32, [6, 6, 0, 0]);
  ctx.fill();

  // Header border
  ctx.strokeStyle = isSelected ? '#0ea5e9' : '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 32);
  ctx.lineTo(x + w, y + 32);
  ctx.stroke();

  // Table name
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(table.name, x + 10, y + 16);

  // PK icon
  const pkCols = table.columns.filter((c) => c.isPrimaryKey);
  if (pkCols.length > 0) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('PK', x + w - 28, y + 16);
  }

  // Columns
  let cy = y + 44;
  ctx.font = '12px "JetBrains Mono", monospace';
  for (const col of table.columns.sort((a, b) => a.ordinal - b.ordinal)) {
    if (cy > y + h - 8) break;

    if (col.isPrimaryKey) {
      ctx.fillStyle = '#f59e0b';
    } else if (!col.nullable) {
      ctx.fillStyle = '#94a3b8';
    } else {
      ctx.fillStyle = '#cbd5e1';
    }

    let typeStr = col.dataType;
    const typeInfo = getTypeInfo(col.dataType, dbType);
    if (typeInfo?.hasLength && col.length !== undefined) {
      typeStr += `(${col.length})`;
    }

    const colText = `${col.name}: ${typeStr}`;
    const maxWidth = w - 20;
    let displayText = colText;
    if (ctx.measureText(colText).width > maxWidth) {
      let len = colText.length;
      while (len > 0 && ctx.measureText(colText.slice(0, len) + '...').width > maxWidth) {
        len--;
      }
      displayText = colText.slice(0, len) + '...';
    }

    ctx.fillText(displayText, x + 10, cy);
    cy += 18;
  }

  // Show count if truncated
  const remaining = table.columns.length - Math.floor((h - 44) / 18);
  if (remaining > 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`... and ${remaining} more`, x + 10, y + h - 10);
  }
}

function drawRelation(ctx: CanvasRenderingContext2D, rel: Relation, tables: Table[], isSelected: boolean) {
  const fromTable = tables.find((t) => t.id === rel.fromTableId);
  const toTable = tables.find((t) => t.id === rel.toTableId);
  if (!fromTable || !toTable) return;

  const fromX = fromTable.position.x + fromTable.width / 2;
  const fromY = fromTable.position.y + fromTable.height / 2;
  const toX = toTable.position.x + toTable.width / 2;
  const toY = toTable.position.y + toTable.height / 2;

  ctx.strokeStyle = isSelected ? '#0ea5e9' : '#475569';
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.setLineDash([]);

  // Bezier curve
  const cp1x = fromX + (toX - fromX) * 0.5;
  const cp1y = fromY;
  const cp2x = fromX + (toX - fromX) * 0.5;
  const cp2y = toY;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
  ctx.stroke();

  // Arrow at end
  const angle = Math.atan2(toY - cp2y, toX - cp2x);
  const arrowLen = 10;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - arrowLen * Math.cos(angle - Math.PI / 6), toY - arrowLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - arrowLen * Math.cos(angle + Math.PI / 6), toY - arrowLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = isSelected ? '#0ea5e9' : '#475569';
  ctx.fill();

  // Relation label
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  ctx.fillStyle = isSelected ? '#0ea5e9' : '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(rel.type, midX, midY - 4);
}

function getTypeInfo(dataType: string, dbType: string): { hasLength: boolean; hasPrecision: boolean } | null {
  const types: Record<string, { hasLength: boolean; hasPrecision: boolean }> = {
    TINYINT: { hasLength: true, hasPrecision: false },
    SMALLINT: { hasLength: true, hasPrecision: false },
    MEDIUMINT: { hasLength: true, hasPrecision: false },
    INT: { hasLength: true, hasPrecision: false },
    BIGINT: { hasLength: true, hasPrecision: false },
    FLOAT: { hasLength: true, hasPrecision: true },
    DOUBLE: { hasLength: true, hasPrecision: true },
    DECIMAL: { hasLength: true, hasPrecision: true },
    NUMERIC: { hasLength: true, hasPrecision: true },
    NUMBER: { hasLength: true, hasPrecision: true },
    CHAR: { hasLength: true, hasPrecision: false },
    CHARACTER: { hasLength: true, hasPrecision: false },
    VARCHAR: { hasLength: true, hasPrecision: false },
    VARCHAR2: { hasLength: true, hasPrecision: false },
    BINARY: { hasLength: true, hasPrecision: false },
    VARBINARY: { hasLength: true, hasPrecision: false },
    BIT: { hasLength: true, hasPrecision: false },
    VARBIT: { hasLength: true, hasPrecision: false },
  };
  return types[dataType] || null;
}
