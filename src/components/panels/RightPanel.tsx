import { useState } from 'react';
import { useDesignerStore } from '@/store';
import { Column, Index } from '@/types';
import { getDataTypes } from '@/utils/dataTypes';
import { Plus, Trash2, Key, Lock, Hash, ArrowUpDown } from 'lucide-react';

type TabType = 'columns' | 'indexes' | 'relations';

export default function RightPanel() {
  const model = useDesignerStore((s) => s.model);
  const ui = useDesignerStore((s) => s.ui);
  const updateTable = useDesignerStore((s) => s.updateTable);
  const addColumn = useDesignerStore((s) => s.addColumn);
  const updateColumn = useDesignerStore((s) => s.updateColumn);
  const deleteColumn = useDesignerStore((s) => s.deleteColumn);
  const addIndex = useDesignerStore((s) => s.addIndex);
  const deleteIndex = useDesignerStore((s) => s.deleteIndex);
  const addRelation = useDesignerStore((s) => s.addRelation);
  const deleteRelation = useDesignerStore((s) => s.deleteRelation);

  const [activeTab, setActiveTab] = useState<TabType>('columns');
  const [newRelationFrom, setNewRelationFrom] = useState('');
  const [newRelationTo, setNewRelationTo] = useState('');

  const table = model.tables.find((t) => t.id === ui.selectedTableId);
  if (!table) {
    return (
      <div className="flex flex-col h-full bg-slate-800 border-l border-slate-700">
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          选择一张表以编辑属性
        </div>
      </div>
    );
  }

  const dataTypes = getDataTypes(model.databaseType);

  return (
    <div className="flex flex-col h-full bg-slate-800 border-l border-slate-700">
      {/* Table header */}
      <div className="px-3 py-3 border-b border-slate-700">
        <input
          type="text"
          value={table.name}
          onChange={(e) => updateTable(table.id, { name: e.target.value })}
          className="w-full bg-transparent text-base font-semibold text-slate-100 border border-transparent hover:border-slate-600 focus:border-sky-500 rounded px-2 py-1 focus:outline-none"
        />
        <input
          type="text"
          value={table.comment}
          onChange={(e) => updateTable(table.id, { comment: e.target.value })}
          placeholder="表注释..."
          className="w-full mt-1 bg-transparent text-sm text-slate-400 border border-transparent hover:border-slate-600 focus:border-sky-500 rounded px-2 py-1 focus:outline-none"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
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
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'columns' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">字段列表</span>
              <button
                onClick={() =>
                  addColumn(table.id, {
                    name: `col_${table.columns.length + 1}`,
                    dataType: 'VARCHAR',
                    length: 255,
                    nullable: true,
                  })
                }
                className="flex items-center gap-1 px-2 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors"
              >
                <Plus size={12} />
                添加字段
              </button>
            </div>

            {table.columns.sort((a, b) => a.ordinal - b.ordinal).map((col) => (
              <ColumnEditor
                key={col.id}
                column={col}
                dataTypes={dataTypes}
                onUpdate={(updates) => updateColumn(table.id, col.id, updates)}
                onDelete={() => deleteColumn(table.id, col.id)}
              />
            ))}
          </div>
        )}

        {activeTab === 'indexes' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">索引列表</span>
              <button
                onClick={() =>
                  addIndex(table.id, {
                    name: `idx_${table.name}_${table.indexes.length}`,
                    type: 'index',
                    columns: [],
                  })
                }
                className="flex items-center gap-1 px-2 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors"
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
              <span className="text-xs font-medium text-slate-400">新建关系</span>
              <div className="space-y-2">
                <select
                  value={newRelationFrom}
                  onChange={(e) => setNewRelationFrom(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
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
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
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
                  className="w-full px-2 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors"
                >
                  创建关系
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400">已有关系</span>
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
                      className="flex items-center justify-between px-2 py-1.5 bg-slate-900 rounded border border-slate-700"
                    >
                      <span className="text-xs text-slate-300">
                        {fromTable?.name}.{fromCol?.name} {rel.type} {toTable?.name}.{toCol?.name}
                      </span>
                      <button
                        onClick={() => deleteRelation(rel.id)}
                        className="p-0.5 text-slate-500 hover:text-red-400"
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

function ColumnEditor({
  column,
  dataTypes,
  onUpdate,
  onDelete,
}: {
  column: Column;
  dataTypes: { name: string; label: string; hasLength: boolean; hasPrecision: boolean }[];
  onUpdate: (updates: Partial<Column>) => void;
  onDelete: () => void;
}) {
  const typeInfo = dataTypes.find((t) => t.name === column.dataType);

  return (
    <div className="p-2 bg-slate-900 rounded border border-slate-700 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={column.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent text-sm text-slate-200 border border-transparent hover:border-slate-600 focus:border-sky-500 rounded px-2 py-1 focus:outline-none"
          placeholder="字段名"
        />
        <button onClick={onDelete} className="p-1 text-slate-500 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={column.dataType}
          onChange={(e) => onUpdate({ dataType: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
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
            className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        )}

        {typeInfo?.hasPrecision && (
          <input
            type="number"
            value={column.precision || ''}
            onChange={(e) => onUpdate({ precision: parseInt(e.target.value) || undefined })}
            placeholder="精度"
            className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={column.isPrimaryKey}
            onChange={(e) => onUpdate({ isPrimaryKey: e.target.checked })}
            className="rounded border-slate-600"
          />
          <Key size={12} />
          主键
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={!column.nullable}
            onChange={(e) => onUpdate({ nullable: !e.target.checked })}
            className="rounded border-slate-600"
          />
          <Lock size={12} />
          非空
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={column.isUnique}
            onChange={(e) => onUpdate({ isUnique: e.target.checked })}
            className="rounded border-slate-600"
          />
          唯一
        </label>
      </div>

      <input
        type="text"
        value={column.defaultValue || ''}
        onChange={(e) => onUpdate({ defaultValue: e.target.value })}
        placeholder="默认值"
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
      />

      <input
        type="text"
        value={column.comment}
        onChange={(e) => onUpdate({ comment: e.target.value })}
        placeholder="注释"
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
      />
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
    <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900 rounded border border-slate-700">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-sky-400">{index.name}</span>
        <span className="text-xs text-slate-500">{index.type}</span>
        <span className="text-xs text-slate-400">
          {index.columns
            .map((ic) => columns.find((c) => c.id === ic.columnId)?.name)
            .filter(Boolean)
            .join(', ')}
        </span>
      </div>
      <button onClick={onDelete} className="p-0.5 text-slate-500 hover:text-red-400">
        <Trash2 size={12} />
      </button>
    </div>
  );
}
