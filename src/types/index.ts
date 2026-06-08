// 数据库类型
export type DatabaseType = 'mysql' | 'dm';

// 文件夹节点类型
export interface FolderNode {
  id: string;
  name: string;
  type: 'folder';
  parentId: string | null;
  children: string[]; // 子节点 id 列表
}

// 表节点引用（用于文件夹树）
export interface TableNodeRef {
  id: string; // 即 table.id
  type: 'table';
  parentId: string | null;
}

// 模型文件根结构
export interface DBModel {
  version: string;
  databaseType: DatabaseType;
  tables: Table[];
  relations: Relation[];
  folders: FolderNode[];
  settings: ModelSettings;
}

// 表定义
export interface Table {
  id: string;
  name: string;
  comment: string;
  schema?: string;
  engine?: string;
  charset?: string;
  columns: Column[];
  indexes: Index[];
  position: { x: number; y: number };
  width: number;
  height: number;
}

// 字段定义
export interface Column {
  id: string;
  name: string;
  dataType: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  defaultValue?: string;
  autoIncrement?: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  comment: string;
  ordinal: number;
}

// 索引定义
export interface Index {
  id: string;
  name: string;
  type: 'primary' | 'unique' | 'index' | 'fulltext';
  method?: 'btree' | 'hash' | 'gin' | 'gist';
  columns: { columnId: string; order: 'asc' | 'desc' }[];
}

// 关系定义
export interface Relation {
  id: string;
  fromTableId: string;
  fromColumnId: string;
  toTableId: string;
  toColumnId: string;
  type: '1:1' | '1:N' | 'N:M';
  onUpdate: 'cascade' | 'set_null' | 'restrict' | 'no_action';
  onDelete: 'cascade' | 'set_null' | 'restrict' | 'no_action';
}

// 模型设置
export interface ModelSettings {
  canvas: CanvasSettings;
}

// 画布设置
export interface CanvasSettings {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

// UI 状态
export interface UIState {
  selectedTableId: string | null;
  selectedColumnId: string | null;
  selectedRelationId: string | null;
  showSqlPanel: boolean;
  showDictPanel: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
}

// 历史记录条目
export interface HistoryEntry {
  model: DBModel;
  timestamp: number;
}
