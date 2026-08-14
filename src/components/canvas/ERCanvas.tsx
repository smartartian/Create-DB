import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useDesignerStore, collectTableIdsForFolder } from '@/store';
import { Table, Relation } from '@/types';

interface CanvasState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  isPanning: boolean;
  isResizing: boolean;
  dragTableId: string | null;
  resizeTableId: string | null;
  dragStartX: number;
  dragStartY: number;
  resizeStartX: number;
  resizeStartY: number;
  resizeStartW: number;
  resizeStartH: number;
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
    isResizing: false,
    dragTableId: null,
    resizeTableId: null,
    dragStartX: 0,
    dragStartY: 0,
    resizeStartX: 0,
    resizeStartY: 0,
    resizeStartW: 0,
    resizeStartH: 0,
    lastMouseX: 0,
    lastMouseY: 0,
  });

  const model = useDesignerStore((s) => s.model);
  const ui = useDesignerStore((s) => s.ui);
  const moveTable = useDesignerStore((s) => s.moveTable);
  const resizeTable = useDesignerStore((s) => s.resizeTable);
  const duplicateTable = useDesignerStore((s) => s.duplicateTable);
  const selectTable = useDesignerStore((s) => s.selectTable);
  const selectRelation = useDesignerStore((s) => s.selectRelation);

  // 画布筛选：只绘制筛选文件夹（含子文件夹）内的表及其关系
  const visibleTables = useMemo(() => {
    let tables = model.tables;
    if (ui.filterFolderId) {
      const ids = collectTableIdsForFolder(model, ui.filterFolderId);
      tables = tables.filter((t) => ids.has(t.id));
    }
    // 按层级排序：zIndex 大的绘制在上层（排序稳定，同层级保持原顺序）
    return [...tables].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  }, [model, ui.filterFolderId]);

  const visibleRelations = useMemo(() => {
    const ids = new Set(visibleTables.map((t) => t.id));
    return model.relations.filter((r) => ids.has(r.fromTableId) && ids.has(r.toTableId));
  }, [model.relations, visibleTables]);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const applyCanvasSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      // 按 devicePixelRatio 放大绘图缓冲区，避免高分屏(Retina)上模糊
      const dpr = window.devicePixelRatio || 1;
      setCanvasSize({ width, height });
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    applyCanvasSize();
    // 用 ResizeObserver 监听容器尺寸变化（底部面板开关/窗口缩放都会触发），
    // 保证画布缓冲区始终与可视区域一致
    const observer = new ResizeObserver(() => applyCanvasSize());
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', applyCanvasSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', applyCanvasSize);
    };
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
    for (let i = visibleTables.length - 1; i >= 0; i--) {
      const t = visibleTables[i];
      const h = getTableDisplayHeight(t);
      if (x >= t.position.x && x <= t.position.x + t.width &&
          y >= t.position.y && y <= t.position.y + h) {
        return t;
      }
    }
    return null;
  }, [visibleTables]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    const { width, height } = canvasSize;

    // 以物理像素映射绘图坐标系（配合 dpr 缓冲区）
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Grid
    const gridSize = 20 * state.zoom;
    ctx.strokeStyle = '#e5e7eb';
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
    for (const rel of visibleRelations) {
      drawRelation(ctx, rel, visibleTables, ui.selectedRelationId === rel.id);
    }

    // Tables
    for (const table of visibleTables) {
      const isSelected = ui.selectedTableId === table.id;
      drawTable(ctx, table, isSelected, model.databaseType);
    }

    ctx.restore();
  }, [model, ui, canvasSize, visibleTables, visibleRelations]);

  useEffect(() => {
    draw();
  }, [draw]);

  // 复制/粘贴表：Cmd/Ctrl+C 记录选中表，Cmd/Ctrl+V 复制出新表
  const copiedTableRef = useRef<string | null>(null);
  const pasteCountRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'c') {
        if (ui.selectedTableId) {
          copiedTableRef.current = ui.selectedTableId;
          pasteCountRef.current = 0;
        }
      } else if (key === 'v') {
        if (copiedTableRef.current) {
          pasteCountRef.current += 1;
          const off = 40 * pasteCountRef.current;
          duplicateTable(copiedTableRef.current, off, off);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ui.selectedTableId, duplicateTable]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const state = stateRef.current;

    // 优先：选中表右下角的大小调整手柄
    if (ui.selectedTableId) {
      const sel = visibleTables.find((t) => t.id === ui.selectedTableId);
      if (sel) {
        const h = getTableDisplayHeight(sel);
        const RESIZE = 14;
        if (pos.x >= sel.position.x + sel.width - RESIZE &&
            pos.y >= sel.position.y + h - RESIZE) {
          state.isResizing = true;
          state.resizeTableId = sel.id;
          state.resizeStartX = pos.x;
          state.resizeStartY = pos.y;
          state.resizeStartW = sel.width;
          state.resizeStartH = sel.height;
          return;
        }
      }
    }

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
  }, [getMousePos, hitTestTable, selectTable, selectRelation, ui.selectedTableId, visibleTables]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const state = stateRef.current;
    if (state.isResizing && state.resizeTableId) {
      const pos = getMousePos(e);
      const dw = pos.x - state.resizeStartX;
      const dh = pos.y - state.resizeStartY;
      const w = Math.max(160, Math.min(600, state.resizeStartW + dw));
      const h = Math.max(60, Math.min(600, state.resizeStartH + dh));
      resizeTable(state.resizeTableId, w, h);
    } else if (state.isDragging && state.dragTableId) {
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
  }, [getMousePos, moveTable, resizeTable, draw]);

  const handleMouseUp = useCallback(() => {
    const state = stateRef.current;
    state.isDragging = false;
    state.isPanning = false;
    state.isResizing = false;
    state.dragTableId = null;
    state.resizeTableId = null;
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
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-gov-bg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div className="absolute bottom-4 right-4 bg-white rounded px-3 py-1.5 text-xs text-gov-textMuted border border-gov-border">
        {Math.round(stateRef.current.zoom * 100)}%
      </div>
    </div>
  );
}

// 卡片显示高度：字段全部展示所需高度与手动设定高度取较大值
function getTableDisplayHeight(table: Table): number {
  const headerH = table.comment ? 44 : 32;
  return Math.max(headerH + 12 + table.columns.length * 18 + 10, table.height ?? 0);
}

function drawTable(ctx: CanvasRenderingContext2D, table: Table, isSelected: boolean, dbType: string) {
  const x = table.position.x;
  const y = table.position.y;
  const w = table.width;
  // 高度按字段数量动态计算，字段全部展示
  const h = getTableDisplayHeight(table);

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Body
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Border
  ctx.strokeStyle = isSelected ? '#c41e3a' : '#d8dce2';
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.stroke();

  // Header（有表注释时加高显示注释行，背景色可配置）
  const hasComment = !!table.comment;
  const headerH = hasComment ? 44 : 32;
  ctx.fillStyle = table.headerColor ?? (isSelected ? '#1a3a5c' : '#244a70');
  ctx.beginPath();
  ctx.roundRect(x, y, w, headerH, [4, 4, 0, 0]);
  ctx.fill();

  // Header border
  ctx.strokeStyle = isSelected ? '#c41e3a' : '#d8dce2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + headerH);
  ctx.lineTo(x + w, y + headerH);
  ctx.stroke();

  // Table name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(table.name, x + 10, y + (hasComment ? 15 : 16));

  // PK icon
  const pkCols = table.columns.filter((c) => c.isPrimaryKey);
  if (pkCols.length > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('PK', x + w - 28, y + (hasComment ? 15 : 16));
  }

  // Table comment（表注释展示，截断防溢出）
  if (hasComment) {
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    let commentText = table.comment;
    const maxW = w - 20;
    if (ctx.measureText(commentText).width > maxW) {
      let len = commentText.length;
      while (len > 0 && ctx.measureText(commentText.slice(0, len) + '...').width > maxW) {
        len--;
      }
      commentText = commentText.slice(0, len) + '...';
    }
    ctx.fillText(commentText, x + 10, y + 33);
  }

  // Columns（全部展示，不做数量省略；字段注释显示在最左侧）
  let cy = y + headerH + 12;
  ctx.font = '12px "JetBrains Mono", monospace';
  for (const col of table.columns.sort((a, b) => a.ordinal - b.ordinal)) {
    if (col.isPrimaryKey) {
      ctx.fillStyle = '#c41e3a';
    } else if (!col.nullable) {
      ctx.fillStyle = '#444444';
    } else {
      ctx.fillStyle = '#666666';
    }

    let typeStr = col.dataType;
    const typeInfo = getTypeInfo(col.dataType, dbType);
    if (typeInfo?.hasLength && col.length !== undefined) {
      typeStr += `(${col.length})`;
    }

    const colText = `${col.name}: ${typeStr}`;
    const maxWidth = w - 20;

    // 字段注释：最左侧绿色小字
    let cmtWidth = 0;
    if (col.comment) {
      ctx.fillStyle = '#5a8a3c';
      const cmtMaxW = Math.min(maxWidth * 0.42, 90);
      let cmtText = col.comment;
      if (ctx.measureText(cmtText).width > cmtMaxW) {
        let len = cmtText.length;
        while (len > 0 && ctx.measureText(cmtText.slice(0, len) + '…').width > cmtMaxW) {
          len--;
        }
        cmtText = cmtText.slice(0, len) + '…';
      }
      cmtWidth = ctx.measureText(cmtText).width;
      ctx.fillText(cmtText, x + 10, cy);
    }

    // 字段名:类型：右对齐（两端对齐布局），剩余空间截断
    ctx.fillStyle = col.isPrimaryKey ? '#c41e3a' : !col.nullable ? '#444444' : '#666666';
    const rightX = x + w - 10;
    const fieldMaxW = maxWidth - (cmtWidth > 0 ? cmtWidth + 8 : 0);
    let displayText = colText;
    if (ctx.measureText(colText).width > fieldMaxW) {
      let len = colText.length;
      while (len > 0 && ctx.measureText(colText.slice(0, len) + '...').width > fieldMaxW) {
        len--;
      }
      displayText = colText.slice(0, len) + '...';
    }
    ctx.fillText(displayText, rightX - ctx.measureText(displayText).width, cy);
    cy += 18;
  }

  // 选中时绘制右下角调整大小手柄
  if (isSelected) {
    ctx.fillStyle = '#c41e3a';
    ctx.beginPath();
    ctx.moveTo(x + w - 11, y + h - 1);
    ctx.lineTo(x + w - 1, y + h - 11);
    ctx.lineTo(x + w - 1, y + h - 1);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRelation(ctx: CanvasRenderingContext2D, rel: Relation, tables: Table[], isSelected: boolean) {
  const fromTable = tables.find((t) => t.id === rel.fromTableId);
  const toTable = tables.find((t) => t.id === rel.toTableId);
  if (!fromTable || !toTable) return;

  const fromX = fromTable.position.x + fromTable.width / 2;
  const fromY = fromTable.position.y + getTableDisplayHeight(fromTable) / 2;
  const toX = toTable.position.x + toTable.width / 2;
  const toY = toTable.position.y + getTableDisplayHeight(toTable) / 2;

  const color = isSelected ? '#c41e3a' : '#7d8ea3';
  const lineWidth = isSelected ? 2 : 1.5;

  // 贝塞尔曲线（两端切线水平的 S 形，横向更平滑）
  const dx = toX - fromX;
  const cpOffset = Math.max(40, Math.min(Math.abs(dx) * 0.45, 140));
  const dir = dx >= 0 ? 1 : -1;
  const cp1x = fromX + dir * cpOffset;
  const cp1y = fromY;
  const cp2x = toX - dir * cpOffset;
  const cp2y = toY;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
  ctx.stroke();

  // 端点连接点（小圆点）
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(fromX, fromY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(toX, toY, 3, 0, Math.PI * 2);
  ctx.fill();

  // 箭头（沿曲线末端切线方向，白色描边更清晰）
  const angle = Math.atan2(toY - cp2y, toX - cp2x);
  const arrowLen = 12;
  const arrowW = Math.PI / 7;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - arrowLen * Math.cos(angle - arrowW), toY - arrowLen * Math.sin(angle - arrowW));
  ctx.lineTo(toX - arrowLen * Math.cos(angle + arrowW), toY - arrowLen * Math.sin(angle + arrowW));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 关系标签（白底圆角，避免被线条干扰）
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  const labelW = ctx.measureText(rel.type).width + 12;
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 - 12;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.roundRect(midX - labelW / 2, midY - 9, labelW, 18, 4);
  ctx.fill();
  ctx.strokeStyle = isSelected ? '#c41e3a' : '#c9d2dc';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = isSelected ? '#c41e3a' : '#5a6b7d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rel.type, midX, midY);
  ctx.textBaseline = 'alphabetic';
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
