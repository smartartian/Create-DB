import { useState, useMemo, useEffect } from 'react';
import { useDesignerStore, collectTableIdsForFolder } from '@/store';
import { Table, FolderNode } from '@/types';
import {
  Plus,
  Search,
  Table2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Trash2,
  MoreHorizontal,
  FolderPlus,
} from 'lucide-react';

interface TreeNode {
  id: string;
  type: 'table' | 'folder';
  name: string;
  depth: number;
  table?: Table;
  folder?: FolderNode;
  hasChildren: boolean;
}

export default function LeftPanel() {
  const model = useDesignerStore((s) => s.model);
  const ui = useDesignerStore((s) => s.ui);
  const addTable = useDesignerStore((s) => s.addTable);
  const selectTable = useDesignerStore((s) => s.selectTable);
  const deleteTable = useDesignerStore((s) => s.deleteTable);
  const addFolder = useDesignerStore((s) => s.addFolder);
  const deleteFolder = useDesignerStore((s) => s.deleteFolder);
  const updateFolder = useDesignerStore((s) => s.updateFolder);
  const moveNodeToFolder = useDesignerStore((s) => s.moveNodeToFolder);

  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  // 画布/侧边栏筛选的文件夹 id（null = 根目录），存于全局 store 供画布同步
  const filterFolderId = useDesignerStore((s) => s.ui.filterFolderId);
  const setFilterFolderId = useDesignerStore((s) => s.setFilterFolderId);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    nodeType: 'table' | 'folder';
  } | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // 当前筛选文件夹的祖先链（含自身），用于路径导航
  const folderPath = useMemo(() => {
    const path: FolderNode[] = [];
    let cur = model.folders.find((f) => f.id === filterFolderId);
    while (cur) {
      path.unshift(cur);
      cur = model.folders.find((f) => f.id === cur.parentId);
    }
    return path;
  }, [model.folders, filterFolderId]);

  // 当前筛选范围内的表 id 集合（null = 根级表）
  const visibleTableIds = useMemo(
    () => (filterFolderId ? collectTableIdsForFolder(model, filterFolderId) : null),
    [filterFolderId, model]
  );

  // 筛选的文件夹被删除时回到根目录
  useEffect(() => {
    if (filterFolderId && !model.folders.some((f) => f.id === filterFolderId)) {
      setFilterFolderId(null);
    }
  }, [model.folders, filterFolderId]);

  // Build flat tree list
  const treeNodes = useMemo(() => {
    const nodes: TreeNode[] = [];
    const visited = new Set<string>();

    const addNode = (id: string, depth: number) => {
      if (visited.has(id)) return;
      visited.add(id);

      const folder = model.folders.find((f) => f.id === id);
      if (folder) {
        const isExpanded = expandedNodes.has(id);
        nodes.push({
          id: folder.id,
          type: 'folder',
          name: folder.name,
          depth,
          folder,
          hasChildren: folder.children.length > 0,
        });
        if (isExpanded) {
          for (const childId of folder.children) {
            addNode(childId, depth + 1);
          }
        }
        return;
      }

      const table = model.tables.find((t) => t.id === id);
      if (table) {
        // 树完整展示：展开的文件夹子表始终可见，不依赖筛选状态
        nodes.push({
          id: table.id,
          type: 'table',
          name: table.name,
          depth,
          table,
          hasChildren: false,
        });
      }
    };

    // Root level: folders with no parent + tables not in any folder
    const tableIdsInFolders = new Set(model.folders.flatMap((f) => f.children));
    const rootFolderIds = model.folders
      .filter((f) => f.parentId === null)
      .map((f) => f.id);
    const rootTableIds = model.tables
      .filter((t) => !tableIdsInFolders.has(t.id))
      .map((t) => t.id);

    for (const fid of rootFolderIds) addNode(fid, 0);
    for (const tid of rootTableIds) addNode(tid, 0);

    // Filter by search
    if (search.trim()) {
      const term = search.toLowerCase();
      return nodes.filter(
        (n) =>
          n.name.toLowerCase().includes(term) ||
          (n.type === 'table' && n.table?.comment.toLowerCase().includes(term))
      );
    }

    return nodes;
  }, [model.folders, model.tables, expandedNodes, search]);

  const toggleExpand = (nodeId: string) => {
    const next = new Set(expandedNodes);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    setExpandedNodes(next);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    nodeId: string,
    nodeType: 'table' | 'folder'
  ) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId, nodeType });
  };

  const handleAddFolder = (parentId?: string) => {
    const name = `folder_${model.folders.length + 1}`;
    addFolder(name, parentId || null);
    if (parentId) {
      setExpandedNodes((prev) => new Set(prev).add(parentId));
    }
  };

  const handleRenameFolder = (folderId: string) => {
    const folder = model.folders.find((f) => f.id === folderId);
    if (folder) {
      setEditingFolderId(folderId);
      setEditingName(folder.name);
    }
    setContextMenu(null);
  };

  const handleRenameSubmit = () => {
    if (editingFolderId && editingName.trim()) {
      updateFolder(editingFolderId, { name: editingName.trim() });
    }
    setEditingFolderId(null);
    setEditingName('');
  };

  const handleDragStart = (e: React.DragEvent, nodeId: string, nodeType: 'table' | 'folder') => {
    e.dataTransfer.setData('nodeId', nodeId);
    e.dataTransfer.setData('nodeType', nodeType);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const nodeId = e.dataTransfer.getData('nodeId');
    const nodeType = e.dataTransfer.getData('nodeType') as 'table' | 'folder';
    if (nodeId && nodeType) {
      // Prevent dropping into self or descendant
      if (nodeType === 'folder' && targetFolderId) {
        const isDescendant = (parentId: string, childId: string): boolean => {
          const parent = model.folders.find((f) => f.id === parentId);
          if (!parent) return false;
          if (parent.children.includes(childId)) return true;
          for (const cid of parent.children) {
            if (isDescendant(cid, childId)) return true;
          }
          return false;
        };
        if (nodeId === targetFolderId || isDescendant(nodeId, targetFolderId)) {
          setDragOverFolderId(null);
          return;
        }
      }
      moveNodeToFolder(nodeId, nodeType, targetFolderId);
      if (targetFolderId) {
        setExpandedNodes((prev) => new Set(prev).add(targetFolderId));
      }
    }
    setDragOverFolderId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gov-border">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gov-border bg-gov-bg">
        <span className="text-sm font-semibold text-gov-text flex items-center gap-1.5">
          <span className="w-[3px] h-3.5 bg-gov-red rounded-sm" />
          表列表
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleAddFolder(filterFolderId)}
            className="p-1 rounded hover:bg-gov-blueLight text-gov-blue transition-colors"
            title="新建文件夹"
          >
            <FolderPlus size={16} />
          </button>
          <button
            onClick={() => addTable(`table_${model.tables.length + 1}`, 100 + model.tables.length * 20, 100 + model.tables.length * 20, filterFolderId)}
            className="p-1 rounded hover:bg-gov-blueLight text-gov-red transition-colors"
            title="添加表"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* 路径导航：根目录 → 当前文件夹 */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gov-border text-xs bg-white overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setFilterFolderId(null)}
          className={`px-1.5 py-0.5 rounded transition-colors ${
            filterFolderId === null
              ? 'bg-gov-blueLight text-gov-blue font-medium'
              : 'text-gov-textSecondary hover:bg-gov-bg hover:text-gov-text'
          }`}
        >
          根目录
        </button>
        {folderPath.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <span className="text-gov-textMuted">/</span>
            <button
              onClick={() => setFilterFolderId(f.id)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterFolderId === f.id
                  ? 'bg-gov-blueLight text-gov-blue font-medium'
                  : 'text-gov-textSecondary hover:bg-gov-bg hover:text-gov-text'
              }`}
            >
              {f.name}
            </button>
          </span>
        ))}
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gov-textMuted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索表或文件夹..."
            className="w-full bg-white border border-gov-border rounded px-7 py-1.5 text-sm text-gov-text placeholder-gov-textMuted focus:outline-none focus:border-gov-blue"
          />
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-2 pb-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, null)}
      >
        {treeNodes.length === 0 ? (
          <div className="text-center py-8 text-gov-textMuted text-sm">暂无表</div>
        ) : (
          <div className="space-y-0.5">
            {treeNodes.map((node) => {
              const isSelected = ui.selectedTableId === node.id;
              const isFiltering = filterFolderId === node.id && node.type === 'folder';
              const isExpanded = expandedNodes.has(node.id);
              const isDragOver = dragOverFolderId === node.id && node.type === 'folder';

              return (
                <div
                  key={node.id}
                  style={{ paddingLeft: `${node.depth * 16}px` }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, node.id, node.type)}
                  onDragOver={(e) => {
                    if (node.type === 'folder') handleDragOver(e, node.id);
                  }}
                  onDrop={(e) => handleDrop(e, node.id)}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onContextMenu={(e) => handleContextMenu(e, node.id, node.type)}
                >
                  <div
                    className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors group border ${
                      isSelected || isFiltering
                        ? 'bg-gov-blueLight border-gov-blue/40'
                        : isDragOver
                        ? 'bg-amber-50 border-amber-300'
                        : 'border-transparent hover:bg-gov-bg'
                    }`}
                    onClick={() => {
                      if (node.type === 'table') {
                        selectTable(node.id);
                        // 选中表时，筛选文件夹自动切换为该表的父文件夹
                        const parentFolder = model.folders.find((f) => f.children.includes(node.id));
                        const parentId = parentFolder ? parentFolder.id : null;
                        if (parentId !== filterFolderId) {
                          setFilterFolderId(parentId);
                        }
                      } else {
                        // 点击文件夹：筛选该文件夹及其子文件夹下的所有表
                        setFilterFolderId(node.id);
                        setExpandedNodes((prev) => new Set(prev).add(node.id));
                      }
                    }}
                  >
                    {node.type === 'folder' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(node.id);
                        }}
                        className="p-0.5 text-gov-textMuted hover:text-gov-text"
                      >
                        {isExpanded ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                      </button>
                    )}
                    {node.type === 'folder' ? (
                      isExpanded ? (
                        <FolderOpen size={14} className="text-amber-500 shrink-0" />
                      ) : (
                        <Folder size={14} className="text-amber-500 shrink-0" />
                      )
                    ) : (
                      <Table2 size={14} className="text-gov-blue shrink-0" />
                    )}

                    {editingFolderId === node.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit();
                          if (e.key === 'Escape') {
                            setEditingFolderId(null);
                            setEditingName('');
                          }
                        }}
                        className="flex-1 bg-white border border-gov-blue rounded px-1 py-0.5 text-sm text-gov-text focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm text-gov-text truncate flex-1">
                        {node.name}
                      </span>
                    )}

                    {node.type === 'table' && (
                      <span className="text-xs text-gov-textMuted">
                        {node.table?.columns.length || 0}
                      </span>
                    )}
                    {node.type === 'folder' && (
                      <span className="text-xs text-gov-textMuted">
                        {node.folder?.children.length || 0}
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, node.id, node.type);
                      }}
                      className="p-0.5 text-gov-textMuted hover:text-gov-text opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gov-border text-xs text-gov-textMuted">
        {filterFolderId
          ? `${visibleTableIds?.size ?? 0} 张表（${folderPath[folderPath.length - 1]?.name ?? ''}）`
          : `共 ${model.tables.length} 张表 | ${model.folders.length} 个文件夹`}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-white border border-gov-border rounded shadow-lg py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.nodeType === 'folder' && (
              <>
                <button
                  onClick={() => {
                    handleAddFolder(contextMenu.nodeId);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gov-text hover:bg-gov-bg transition-colors"
                >
                  新建子文件夹
                </button>
                <button
                  onClick={() => handleRenameFolder(contextMenu.nodeId)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gov-text hover:bg-gov-bg transition-colors"
                >
                  重命名
                </button>
                <div className="border-t border-gov-border my-1" />
              </>
            )}
            <button
              onClick={() => {
                if (contextMenu.nodeType === 'folder') {
                  deleteFolder(contextMenu.nodeId);
                } else {
                  deleteTable(contextMenu.nodeId);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-gov-red hover:bg-gov-bg transition-colors"
            >
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
}
