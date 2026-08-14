import { useState, useMemo } from 'react';
import { useDesignerStore } from '@/store';
import { Column, Index } from '@/types';
import { getDataTypes } from '@/utils/dataTypes';
import { Plus, Trash2, Key, Lock, Hash, ArrowUpDown, Folder, Layers, X, Table2 } from 'lucide-react';

type TabType = 'columns' | 'indexes' | 'relations';

// 表头背景预设色板（深色系，保证白色表名可读）
const PRESET_COLORS = ['#1a3a5c', '#c41e3a', '#1b5e20', '#283593', '#00695c', '#37474f', '#4e342e', '#5d4037'];

export default function RightPanel() {
  const model = useDesignerStore((s) => s.model);
  const ui = useDesignerStore((s) => s.ui);
  const updateTable = useDesignerStore((s) => s.updateTable);
  const addColumn = useDesignerStore((s) => s.addColumn);
  const updateColumn = useDesignerStore((s) => s.updateColumn);
  const deleteColumn = useDesignerStore((s) => s.deleteColumn);
  const reorderColumn = useDesignerStore((s) => s.reorderColumn);
  const addIndex = useDesignerStore((s) => s.addIndex);
  const deleteIndex = useDesignerStore((s) => s.deleteIndex);
  const addRelation = useDesignerStore((s) => s.addRelation);
  const deleteRelation = useDesignerStore((s) => s.deleteRelation);
  const moveNodeToFolder = useDesignerStore((s) => s.moveNodeToFolder);
  const setFilterFolderId = useDesignerStore((s) => s.setFilterFolderId);
  const setRightPanelVisible = useDesignerStore((s) => s.setRightPanelVisible);

  const [activeTab, setActiveTab] = useState<TabType>('columns');
  const [newRelationFrom, setNewRelationFrom] = useState('');
  const [newRelationTo, setNewRelationTo] = useState('');

  // 扁平化文件夹列表（带层级缩进），用于"所属目录"选择器
  const folderOptions = useMemo(() => {
    const opts: { id: string; label: string; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const f of model.folders.filter((x) => x.parentId === parentId)) {
        opts.push({ id: f.id, label: f.name, depth });
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return opts;
  }, [model.folders]);

  const table = model.tables.find((t) => t.id === ui.selectedTableId);

  // 按序号倒序显示：最新添加的字段在最上方（hooks 必须在条件返回之前）
  const sortedColumns = useMemo(
    () => (table ? [...table.columns].sort((a, b) => b.ordinal - a.ordinal) : []),
    [table]
  );

  if (!table) {
    return (
      <div className="flex flex-col h-full bg-white border-l border-gov-border">
        <PanelHeader setRightPanelVisible={setRightPanelVisible} />
        <div className="flex items-center justify-center h-full text-gov-textMuted text-sm">
          选择一张表以编辑属性
        </div>
      </div>
    );
  }

  const dataTypes = getDataTypes(model.databaseType);

  // 当前表所属文件夹（直接父级）
  const tableFolderId = model.folders.find((f) => f.children.includes(table.id))?.id ?? null;

  // 修改表所属文件夹，并把筛选联动切换到目标目录
  const handleFolderChange = (targetFolderId: string) => {
    const target = targetFolderId || null;
    moveNodeToFolder(table.id, 'table', target);
    setFilterFolderId(target);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gov-border">
      <PanelHeader setRightPanelVisible={setRightPanelVisible} />
      {/* Table header */}
      <div className="px-3 py-3 border-b border-gov-border bg-gov-bg relative">
        <input
          type="text"
          value={table.name}
          onChange={(e) => updateTable(table.id, { name: e.target.value })}
          className="w-full bg-transparent text-base font-semibold text-gov-text border border-transparent hover:border-gov-border focus:border-gov-blue rounded px-2 py-1 focus:outline-none"
        />
        <input
          type="text"
          value={table.comment}
          onChange={(e) => updateTable(table.id, { comment: e.target.value })}
          placeholder="表注释..."
          className="w-full mt-1 bg-transparent text-sm text-gov-textSecondary border border-transparent hover:border-gov-border focus:border-gov-blue rounded px-2 py-1 focus:outline-none"
        />
        {/* 所属目录 */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gov-textSecondary flex items-center gap-1 shrink-0">
            <Folder size={12} />
            所属目录
          </span>
          <select
            value={tableFolderId ?? ''}
            onChange={(e) => handleFolderChange(e.target.value)}
            className="flex-1 min-w-0 bg-white border border-gov-border rounded px-2 py-1 text-xs text-gov-text focus:outline-none focus:border-gov-blue"
          >
            <option value="">根目录</option>
            {folderOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.depth > 0 ? '　'.repeat(f.depth) : ''}
                {f.label}
              </option>
            ))}
          </select>
        </div>
        {/* 画布层级 */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gov-textSecondary flex items-center gap-1 shrink-0">
            <Layers size={12} />
            画布层级
          </span>
          <input
            type="number"
            min={0}
            value={table.zIndex ?? 0}
            onChange={(e) => updateTable(table.id, { zIndex: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-20 bg-white border border-gov-border rounded px-2 py-1 text-xs text-gov-text focus:outline-none focus:border-gov-blue"
          />
          <span className="text-xs text-gov-textMuted">数值越大越靠上层</span>
        </div>
        {/* 表头背景颜色 */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gov-textSecondary shrink-0">表头颜色</span>
          <div className="flex items-center gap-1 flex-1 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateTable(table.id, { headerColor: c })}
                className={`w-4 h-4 rounded-full border transition-transform hover:scale-110 ${
                  (table.headerColor ?? '#1a3a5c') === c ? 'ring-2 ring-gov-blue' : 'border-gov-border'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <input
              type="color"
              value={table.headerColor || '#1a3a5c'}
              onChange={(e) => updateTable(table.id, { headerColor: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              title="自定义颜色"
            />
            {table.headerColor && (
              <button
                onClick={() => updateTable(table.id, { headerColor: undefined })}
                className="text-xs text-gov-textMuted hover:text-gov-red"
                title="恢复默认颜色"
              >
                默认
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gov-border">
        {[
          { key: 'columns' as TabType, label: '字段', icon: Hash },
          { key: 'indexes' as TabType, label: '索引', icon: Key },
          { key: 'relations' as TabType, label: '关系', icon: ArrowUpDown },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
              activeTab === tab.key
                ? 'text-gov-red border-b-2 border-gov-red'
                : 'text-gov-textSecondary hover:text-gov-text'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 字段操作区（固定，不随列表滚动） */}
      {activeTab === 'columns' && (
        <div className="px-3 py-2 border-b border-gov-border bg-gov-bg shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-textSecondary whitespace-nowrap">
              字段列表
            </span>
            <button
              onClick={() =>
                addColumn(table.id, {
                  name: `col_${table.columns.length + 1}`,
                  dataType: 'VARCHAR',
                  length: 255,
                  nullable: true,
                })
              }
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gov-red hover:bg-gov-redDark text-white rounded transition-colors whitespace-nowrap shrink-0"
            >
              <Plus size={12} />
              添加字段
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'columns' && (
          <div className="space-y-1.5">
            {sortedColumns.map((col) => (
              <ColumnEditor
                key={col.id}
                column={col}
                totalCount={table.columns.length}
                dataTypes={dataTypes}
                onUpdate={(updates) => updateColumn(table.id, col.id, updates)}
                onDelete={() => deleteColumn(table.id, col.id)}
                onReorder={(targetIndex) => reorderColumn(table.id, col.id, targetIndex)}
              />
            ))}
          </div>
        )}

        {activeTab === 'indexes' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gov-textSecondary">索引列表</span>
              <button
                onClick={() =>
                  addIndex(table.id, {
                    name: `idx_${table.name}_${table.indexes.length}`,
                    type: 'index',
                    columns: [],
                  })
                }
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gov-red hover:bg-gov-redDark text-white rounded transition-colors"
              >
                <Plus size={12} />
                添加索引
              </button>
            </div>

            {table.indexes.map((idx) => (
              <IndexEditor
                key={idx.id}
                index={idx}
                columns={table.columns}
                onDelete={() => deleteIndex(table.id, idx.id)}
              />
            ))}
          </div>
        )}

        {activeTab === 'relations' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <span className="text-xs font-medium text-gov-textSecondary">新建关系</span>
              <div className="space-y-2">
                <select
                  value={newRelationFrom}
                  onChange={(e) => setNewRelationFrom(e.target.value)}
                  className="w-full bg-white border border-gov-border rounded px-2 py-1.5 text-sm text-gov-text focus:outline-none focus:border-gov-blue"
                >
                  <option value="">选择当前表字段</option>
                  {table.columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newRelationTo}
                  onChange={(e) => setNewRelationTo(e.target.value)}
                  className="w-full bg-white border border-gov-border rounded px-2 py-1.5 text-sm text-gov-text focus:outline-none focus:border-gov-blue"
                >
                  <option value="">选择目标表字段</option>
                  {model.tables
                    .filter((t) => t.id !== table.id)
                    .flatMap((t) =>
                      t.columns.map((col) => ({
                        key: `${t.id}:${col.id}`,
                        label: `${t.name}.${col.name}`,
                        tableId: t.id,
                        columnId: col.id,
                      }))
                    )
                    .map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    if (!newRelationFrom || !newRelationTo) return;
                    const [toTableId, toColumnId] = newRelationTo.split(':');
                    addRelation({
                      fromTableId: table.id,
                      fromColumnId: newRelationFrom,
                      toTableId,
                      toColumnId,
                      type: '1:N',
                    });
                    setNewRelationFrom('');
                    setNewRelationTo('');
                  }}
                  disabled={!newRelationFrom || !newRelationTo}
                  className="w-full px-2 py-1.5 text-xs bg-gov-red hover:bg-gov-redDark disabled:bg-gov-bg disabled:text-gov-textMuted text-white rounded transition-colors"
                >
                  创建关系
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-gov-textSecondary">已有关系</span>
              {model.relations
                .filter((r) => r.fromTableId === table.id || r.toTableId === table.id)
                .map((rel) => {
                  const fromTable = model.tables.find((t) => t.id === rel.fromTableId);
                  const toTable = model.tables.find((t) => t.id === rel.toTableId);
                  const fromCol = fromTable?.columns.find((c) => c.id === rel.fromColumnId);
                  const toCol = toTable?.columns.find((c) => c.id === rel.toColumnId);
                  return (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between px-2 py-1.5 bg-gov-bg rounded border border-gov-border"
                    >
                      <span className="text-xs text-gov-text">
                        {fromTable?.name}.{fromCol?.name} {rel.type} {toTable?.name}.{toCol?.name}
                      </span>
                      <button
                        onClick={() => deleteRelation(rel.id)}
                        className="p-0.5 text-gov-textMuted hover:text-gov-red"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 右侧面板顶部标题栏（含关闭按钮）
function PanelHeader({ setRightPanelVisible }: { setRightPanelVisible: (visible: boolean) => void }) {
  return (
    <div className="flex items-center border-b border-gov-border bg-gov-bg shrink-0">
      <span className="flex items-center gap-1 px-3 py-2 text-sm text-gov-red border-b-2 border-gov-red">
        <Table2 size={14} />
        属性
      </span>
      <div className="flex-1" />
      <button
        onClick={() => setRightPanelVisible(false)}
        className="p-1.5 text-gov-textMuted hover:text-gov-red rounded transition-colors mr-1"
        title="关闭面板"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ColumnEditor({
  column,
  totalCount,
  dataTypes,
  onUpdate,
  onDelete,
  onReorder,
}: {
  column: Column;
  totalCount: number;
  dataTypes: { name: string; label: string; hasLength: boolean; hasPrecision: boolean }[];
  onUpdate: (updates: Partial<Column>) => void;
  onDelete: () => void;
  onReorder: (targetIndex: number) => void;
}) {
  const typeInfo = dataTypes.find((t) => t.name === column.dataType);

  return (
    <div className="p-1.5 bg-white rounded border border-gov-border space-y-1.5">
      {/* 序号 + 字段名 + 删除 */}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={totalCount}
          value={column.ordinal + 1}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v >= 1 && v <= totalCount && v !== column.ordinal + 1) {
              onReorder(v - 1);
            }
          }}
          title="字段顺序（1 为最前）"
          className="w-9 shrink-0 bg-white border border-gov-border rounded px-1 py-0.5 text-center text-xs text-gov-text focus:outline-none focus:border-gov-blue"
        />
        <input
          type="text"
          value={column.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 min-w-0 bg-transparent text-sm text-gov-text border border-transparent hover:border-gov-border focus:border-gov-blue rounded px-1.5 py-0.5 focus:outline-none"
          placeholder="字段名"
        />
        <button onClick={onDelete} className="p-0.5 text-gov-textMuted hover:text-gov-red shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {/* 类型 + 长度/精度 */}
      <div className="flex items-center gap-1.5">
        <select
          value={column.dataType}
          onChange={(e) => onUpdate({ dataType: e.target.value })}
          className="flex-1 min-w-0 bg-white border border-gov-border rounded px-1.5 py-0.5 text-xs text-gov-text focus:outline-none focus:border-gov-blue"
        >
          {dataTypes.map((t) => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </select>

        {typeInfo?.hasLength && (
          <input
            type="number"
            value={column.length || ''}
            onChange={(e) => onUpdate({ length: parseInt(e.target.value) || undefined })}
            placeholder="长度"
            title="长度"
            className="w-14 bg-white border border-gov-border rounded px-1.5 py-0.5 text-xs text-gov-text focus:outline-none focus:border-gov-blue"
          />
        )}

        {typeInfo?.hasPrecision && (
          <input
            type="number"
            value={column.precision || ''}
            onChange={(e) => onUpdate({ precision: parseInt(e.target.value) || undefined })}
            placeholder="精度"
            title="精度"
            className="w-14 bg-white border border-gov-border rounded px-1.5 py-0.5 text-xs text-gov-text focus:outline-none focus:border-gov-blue"
          />
        )}
      </div>

      {/* 约束 */}
      <div className="flex items-center gap-2.5">
        <label className="flex items-center gap-1 text-xs text-gov-textSecondary cursor-pointer">
          <input
            type="checkbox"
            checked={column.isPrimaryKey}
            onChange={(e) => onUpdate({ isPrimaryKey: e.target.checked })}
            className="rounded border-gov-border"
          />
          <Key size={11} />
          主键
        </label>
        <label className="flex items-center gap-1 text-xs text-gov-textSecondary cursor-pointer">
          <input
            type="checkbox"
            checked={!column.nullable}
            onChange={(e) => onUpdate({ nullable: !e.target.checked })}
            className="rounded border-gov-border"
          />
          <Lock size={11} />
          非空
        </label>
        <label className="flex items-center gap-1 text-xs text-gov-textSecondary cursor-pointer">
          <input
            type="checkbox"
            checked={column.isUnique}
            onChange={(e) => onUpdate({ isUnique: e.target.checked })}
            className="rounded border-gov-border"
          />
          唯一
        </label>
      </div>

      {/* 默认值 + 注释（并排压缩） */}
      <div className="grid grid-cols-2 gap-1.5">
        <input
          type="text"
          value={column.defaultValue || ''}
          onChange={(e) => onUpdate({ defaultValue: e.target.value })}
          placeholder="默认值"
          className="min-w-0 bg-white border border-gov-border rounded px-1.5 py-0.5 text-xs text-gov-text focus:outline-none focus:border-gov-blue"
        />
        <input
          type="text"
          value={column.comment}
          onChange={(e) => onUpdate({ comment: e.target.value })}
          placeholder="注释"
          className="min-w-0 bg-white border border-gov-border rounded px-1.5 py-0.5 text-xs text-gov-text focus:outline-none focus:border-gov-blue"
        />
      </div>
    </div>
  );
}

function IndexEditor({
  index,
  columns,
  onDelete,
}: {
  index: Index;
  columns: Column[];
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 bg-white rounded border border-gov-border">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gov-blue">{index.name}</span>
        <span className="text-xs text-gov-textMuted">{index.type}</span>
        <span className="text-xs text-gov-textSecondary">
          {index.columns
            .map((ic) => columns.find((c) => c.id === ic.columnId)?.name)
            .filter(Boolean)
            .join(', ')}
        </span>
      </div>
      <button onClick={onDelete} className="p-0.5 text-gov-textMuted hover:text-gov-red">
        <Trash2 size={12} />
      </button>
    </div>
  );
}
