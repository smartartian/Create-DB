import { create } from 'zustand';
import { DBModel, Table, Column, Index, Relation, UIState, DatabaseType, FolderNode } from '@/types';
import { generateId } from '@/utils/id';
import { mapDataType } from '@/utils/dataTypes';

interface DesignerState {
  model: DBModel;
  ui: UIState;
  history: DBModel[];
  historyIndex: number;

  // Actions
  setModel: (model: DBModel) => void;
  addTable: (name: string, x: number, y: number, parentFolderId?: string | null) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  deleteTable: (tableId: string) => void;
  addColumn: (tableId: string, column: Partial<Column>) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;
  reorderColumn: (tableId: string, columnId: string, toIndex: number) => void;
  addIndex: (tableId: string, index: Partial<Index>) => void;
  updateIndex: (tableId: string, indexId: string, updates: Partial<Index>) => void;
  deleteIndex: (tableId: string, indexId: string) => void;
  addRelation: (relation: Partial<Relation>) => void;
  deleteRelation: (relationId: string) => void;
  setDatabaseType: (type: DatabaseType) => void;
  moveTable: (tableId: string, x: number, y: number) => void;
  resizeTable: (tableId: string, width: number, height: number) => void;
  duplicateTable: (tableId: string, offsetX?: number, offsetY?: number) => void;
  selectTable: (tableId: string | null) => void;
  selectColumn: (columnId: string | null) => void;
  selectRelation: (relationId: string | null) => void;
  setFilterFolderId: (folderId: string | null) => void;
  toggleToolbarLeft: () => void;
  setRightPanelVisible: (visible: boolean) => void;
  setMainView: (view: 'canvas' | 'sql') => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: () => void;

  // Folder actions
  addFolder: (name: string, parentId?: string | null) => void;
  updateFolder: (folderId: string, updates: Partial<FolderNode>) => void;
  deleteFolder: (folderId: string) => void;
  moveNodeToFolder: (nodeId: string, nodeType: 'table' | 'folder', targetFolderId: string | null) => void;
}

function createEmptyModel(): DBModel {
  return {
    version: '1.0',
    databaseType: 'mysql',
    tables: [],
    relations: [],
    folders: [],
    settings: {
      canvas: { zoom: 1, offsetX: 0, offsetY: 0 },
    },
  };
}

// 递归收集文件夹（含所有子文件夹）内的表 id，供侧边栏筛选与画布过滤共用
export function collectTableIdsForFolder(model: DBModel, folderId: string): Set<string> {
  const ids = new Set<string>();
  const walk = (fid: string) => {
    const folder = model.folders.find((f) => f.id === fid);
    if (!folder) return;
    for (const childId of folder.children) {
      if (model.folders.some((f) => f.id === childId)) {
        walk(childId);
      } else {
        ids.add(childId);
      }
    }
  };
  walk(folderId);
  return ids;
}

function createDefaultUI(): UIState {
  return {
    selectedTableId: null,
    selectedColumnId: null,
    selectedRelationId: null,
    mainView: 'canvas',
    leftPanelWidth: 240,
    rightPanelWidth: 320,
    bottomPanelHeight: 200,
    filterFolderId: null,
    showToolbarLeft: true,
    showRightPanel: false,
  };
}

export const useDesignerStore = create<DesignerState>((set, get) => ({
  model: createEmptyModel(),
  ui: createDefaultUI(),
  history: [createEmptyModel()],
  historyIndex: 0,

  setModel: (model) => {
    set({ model });
    get().pushHistory();
  },

  addTable: (name, x, y, parentFolderId = null) => {
    const { model } = get();
    const newTable: Table = {
      id: generateId('tbl_'),
      name,
      comment: '',
      columns: [],
      indexes: [],
      position: { x, y },
      width: 200,
      height: 120,
      zIndex: model.tables.length,
    };
    const newTables = [...model.tables, newTable];
    let newFolders = model.folders;
    if (parentFolderId) {
      newFolders = model.folders.map(f =>
        f.id === parentFolderId ? { ...f, children: [...f.children, newTable.id] } : f
      );
    }
    const newModel = { ...model, tables: newTables, folders: newFolders };
    set({ model: newModel, ui: { ...get().ui, selectedTableId: newTable.id } });
    get().pushHistory();
  },

  updateTable: (tableId, updates) => {
    const { model } = get();
    const newModel = {
      ...model,
      tables: model.tables.map((t) => (t.id === tableId ? { ...t, ...updates } : t)),
    };
    set({ model: newModel });
    get().pushHistory();
  },

  deleteTable: (tableId) => {
    const { model } = get();
    const newModel = {
      ...model,
      tables: model.tables.filter((t) => t.id !== tableId),
      relations: model.relations.filter((r) => r.fromTableId !== tableId && r.toTableId !== tableId),
      folders: model.folders.map(f => ({
        ...f,
        children: f.children.filter(cid => cid !== tableId),
      })),
    };
    set({
      model: newModel,
      ui: { ...get().ui, selectedTableId: null, selectedColumnId: null },
    });
    get().pushHistory();
  },

  addColumn: (tableId, column) => {
    const { model } = get();
    const table = model.tables.find((t) => t.id === tableId);
    if (!table) return;

    const newColumn: Column = {
      id: generateId('col_'),
      name: column.name || 'new_column',
      dataType: column.dataType || 'VARCHAR',
      length: column.length,
      precision: column.precision,
      scale: column.scale,
      nullable: column.nullable ?? true,
      defaultValue: column.defaultValue,
      autoIncrement: column.autoIncrement ?? false,
      isPrimaryKey: column.isPrimaryKey ?? false,
      isUnique: column.isUnique ?? false,
      comment: column.comment || '',
      ordinal: table.columns.length,
    };

    const newModel = {
      ...model,
      tables: model.tables.map((t) =>
        t.id === tableId ? { ...t, columns: [...t.columns, newColumn] } : t
      ),
    };
    set({ model: newModel, ui: { ...get().ui, selectedColumnId: newColumn.id } });
    get().pushHistory();
  },

  updateColumn: (tableId, columnId, updates) => {
    const { model } = get();
    const newModel = {
      ...model,
      tables: model.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              columns: t.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c)),
            }
          : t
      ),
    };
    set({ model: newModel });
    get().pushHistory();
  },

  deleteColumn: (tableId, columnId) => {
    const { model } = get();
    const newModel = {
      ...model,
      tables: model.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              columns: t.columns.filter((c) => c.id !== columnId).map((c, i) => ({ ...c, ordinal: i })),
              indexes: t.indexes
                .map((idx) => ({
                  ...idx,
                  columns: idx.columns.filter((ic) => ic.columnId !== columnId),
                }))
                .filter((idx) => idx.columns.length > 0),
            }
          : t
      ),
      relations: model.relations.filter((r) => r.fromColumnId !== columnId && r.toColumnId !== columnId),
    };
    set({ model: newModel, ui: { ...get().ui, selectedColumnId: null } });
    get().pushHistory();
  },

  // 调整字段顺序（按目标索引重排并重设 ordinal）
  reorderColumn: (tableId, columnId, toIndex) => {
    const { model } = get();
    const newModel = {
      ...model,
      tables: model.tables.map((t) => {
        if (t.id !== tableId) return t;
        const cols = [...t.columns];
        const fromIndex = cols.findIndex((c) => c.id === columnId);
        if (fromIndex < 0) return t;
        const [moved] = cols.splice(fromIndex, 1);
        const target = Math.max(0, Math.min(cols.length, toIndex));
        cols.splice(target, 0, moved);
        return { ...t, columns: cols.map((c, i) => ({ ...c, ordinal: i })) };
      }),
    };
    set({ model: newModel });
    get().pushHistory();
  },

  addIndex: (tableId, index) => {
    const { model } = get();
    const table = model.tables.find((t) => t.id === tableId);
    if (!table) return;

    const newIndex: Index = {
      id: generateId('idx_'),
      name: index.name || `idx_${table.name}_${table.indexes.length}`,
      type: index.type || 'index',
      method: index.method,
      columns: index.columns || [],
    };

    const newModel = {
      ...model,
      tables: model.tables.map((t) =>
        t.id === tableId ? { ...t, indexes: [...t.indexes, newIndex] } : t
      ),
    };
    set({ model: newModel });
    get().pushHistory();
  },

  updateIndex: (tableId, indexId, updates) => {
    const { model } = get();
    const newModel = {
      ...model,
      tables: model.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              indexes: t.indexes.map((idx) => (idx.id === indexId ? { ...idx, ...updates } : idx)),
            }
          : t
      ),
    };
    set({ model: newModel });
    get().pushHistory();
  },

  deleteIndex: (tableId, indexId) => {
    const { model } = get();
    const newModel = {
      ...model,
      tables: model.tables.map((t) =>
        t.id === tableId ? { ...t, indexes: t.indexes.filter((idx) => idx.id !== indexId) } : t
      ),
    };
    set({ model: newModel });
    get().pushHistory();
  },

  addRelation: (relation) => {
    const { model } = get();
    const newRelation: Relation = {
      id: generateId('rel_'),
      fromTableId: relation.fromTableId!,
      fromColumnId: relation.fromColumnId!,
      toTableId: relation.toTableId!,
      toColumnId: relation.toColumnId!,
      type: relation.type || '1:N',
      onUpdate: relation.onUpdate || 'restrict',
      onDelete: relation.onDelete || 'restrict',
    };
    const newModel = { ...model, relations: [...model.relations, newRelation] };
    set({ model: newModel, ui: { ...get().ui, selectedRelationId: newRelation.id } });
    get().pushHistory();
  },

  deleteRelation: (relationId) => {
    const { model } = get();
    const newModel = {
      ...model,
      relations: model.relations.filter((r) => r.id !== relationId),
    };
    set({ model: newModel, ui: { ...get().ui, selectedRelationId: null } });
    get().pushHistory();
  },

  setDatabaseType: (type) => {
    const { model } = get();
    if (model.databaseType === type) return;

    const newTables = model.tables.map((table) => ({
      ...table,
      columns: table.columns.map((col) => ({
        ...col,
        dataType: mapDataType(col.dataType, model.databaseType, type),
      })),
    }));

    const newModel = { ...model, databaseType: type, tables: newTables };
    set({ model: newModel });
    get().pushHistory();
  },

  moveTable: (tableId, x, y) => {
    const { model } = get();
    const newModel = {
      ...model,
      tables: model.tables.map((t) => (t.id === tableId ? { ...t, position: { x, y } } : t)),
    };
    set({ model: newModel });
  },

  // 调整表卡片大小（拖拽过程中调用，不进撤销历史）
  resizeTable: (tableId, width, height) => {
    const { model } = get();
    const newModel = {
      ...model,
      tables: model.tables.map((t) => (t.id === tableId ? { ...t, width, height } : t)),
    };
    set({ model: newModel });
  },

  // 复制已有表创建新表（字段/索引/所属文件夹一并复制）
  duplicateTable: (tableId, offsetX = 40, offsetY = 40) => {
    const { model } = get();
    const src = model.tables.find((t) => t.id === tableId);
    if (!src) return;

    const idMap = new Map<string, string>();
    const newTable: Table = {
      ...src,
      id: generateId('tbl_'),
      name: `${src.name}_copy`,
      position: { x: src.position.x + offsetX, y: src.position.y + offsetY },
      columns: src.columns.map((c) => {
        const nid = generateId('col_');
        idMap.set(c.id, nid);
        return { ...c, id: nid };
      }),
      indexes: src.indexes.map((idx) => ({
        ...idx,
        id: generateId('idx_'),
        columns: idx.columns.map((ic) => ({ ...ic, columnId: idMap.get(ic.columnId) || ic.columnId })),
      })),
      zIndex: model.tables.length,
    };

    // 复制到源表所在文件夹
    let newFolders = model.folders;
    const srcFolder = model.folders.find((f) => f.children.includes(src.id));
    if (srcFolder) {
      newFolders = model.folders.map((f) =>
        f.id === srcFolder.id ? { ...f, children: [...f.children, newTable.id] } : f
      );
    }

    const newModel = { ...model, tables: [...model.tables, newTable], folders: newFolders };
    set({ model: newModel, ui: { ...get().ui, selectedTableId: newTable.id } });
    get().pushHistory();
  },

  selectTable: (tableId) => {
    if (tableId) {
      // 选中表：打开右侧面板并切换到属性 tab
      set({ ui: { ...get().ui, selectedTableId: tableId, selectedColumnId: null, selectedRelationId: null, showRightPanel: true } });
    } else {
      // 取消选中（点击画布空白）：不改变面板显示状态
      set({ ui: { ...get().ui, selectedTableId: null, selectedColumnId: null, selectedRelationId: null } });
    }
  },

  selectColumn: (columnId) => {
    set({ ui: { ...get().ui, selectedColumnId: columnId } });
  },

  selectRelation: (relationId) => {
    set({ ui: { ...get().ui, selectedRelationId: relationId, selectedTableId: null, selectedColumnId: null } });
  },

  // 折叠/展开工具栏左侧区域（数据库选择器及左侧内容）
  toggleToolbarLeft: () => {
    set({ ui: { ...get().ui, showToolbarLeft: !get().ui.showToolbarLeft } });
  },

  // 显示/隐藏右侧面板
  setRightPanelVisible: (visible) => {
    set({ ui: { ...get().ui, showRightPanel: visible } });
  },

  // 切换主区域视图（画布 / SQL 编辑器）
  setMainView: (view) => {
    set({ ui: { ...get().ui, mainView: view } });
  },

  setFilterFolderId: (folderId) => {
    set({ ui: { ...get().ui, filterFolderId: folderId } });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({ historyIndex: newIndex, model: history[newIndex] });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({ historyIndex: newIndex, model: history[newIndex] });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  pushHistory: () => {
    const { model, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(model)));
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  addFolder: (name, parentId = null) => {
    const { model } = get();
    const newFolder: FolderNode = {
      id: generateId('fld_'),
      name,
      type: 'folder',
      parentId,
      children: [],
    };
    let newFolders = [...model.folders, newFolder];
    if (parentId) {
      newFolders = newFolders.map(f =>
        f.id === parentId ? { ...f, children: [...f.children, newFolder.id] } : f
      );
    }
    const newModel = { ...model, folders: newFolders };
    set({ model: newModel });
    get().pushHistory();
  },

  updateFolder: (folderId, updates) => {
    const { model } = get();
    const newModel = {
      ...model,
      folders: model.folders.map((f) => (f.id === folderId ? { ...f, ...updates } : f)),
    };
    set({ model: newModel });
    get().pushHistory();
  },

  deleteFolder: (folderId) => {
    const { model } = get();
    // Remove folder and all nested children (recursive)
    const idsToDelete = new Set<string>();
    const collectIds = (id: string) => {
      idsToDelete.add(id);
      const folder = model.folders.find(f => f.id === id);
      if (folder) {
        for (const childId of folder.children) {
          const childFolder = model.folders.find(f => f.id === childId);
          if (childFolder) {
            collectIds(childId);
          } else {
            idsToDelete.add(childId); // table id
          }
        }
      }
    };
    collectIds(folderId);

    const newModel = {
      ...model,
      tables: model.tables.filter(t => !idsToDelete.has(t.id)),
      folders: model.folders.filter(f => !idsToDelete.has(f.id)).map(f => ({
        ...f,
        children: f.children.filter(cid => !idsToDelete.has(cid)),
      })),
      relations: model.relations.filter(r => !idsToDelete.has(r.fromTableId) && !idsToDelete.has(r.toTableId)),
    };
    set({ model: newModel });
    get().pushHistory();
  },

  moveNodeToFolder: (nodeId, nodeType, targetFolderId) => {
    const { model } = get();
    let newFolders = [...model.folders];

    // Remove from old parent
    newFolders = newFolders.map(f => ({
      ...f,
      children: f.children.filter(cid => cid !== nodeId),
    }));

    // Add to new parent
    if (targetFolderId) {
      newFolders = newFolders.map(f =>
        f.id === targetFolderId ? { ...f, children: [...f.children, nodeId] } : f
      );
    }

    // Update node parentId if it's a folder
    if (nodeType === 'folder') {
      newFolders = newFolders.map(f =>
        f.id === nodeId ? { ...f, parentId: targetFolderId } : f
      );
    }

    const newModel = { ...model, folders: newFolders };
    set({ model: newModel });
    get().pushHistory();
  },
}));
