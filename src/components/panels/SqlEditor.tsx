import { useState, useMemo } from 'react';
import { useDesignerStore, collectTableIdsForFolder } from '@/store';
import { generateDDL } from '@/sql-generator';
import { downloadTextFile } from '@/file-manager';
import { Database, Copy, Download } from 'lucide-react';

// SQL 编辑器独立面板：包含数据库类型切换（MySQL/达梦）与 SQL 预览
// 与画布一致：按左侧筛选的文件夹展示对应表的 SQL
export default function SqlEditor() {
  const model = useDesignerStore((s) => s.model);
  const ui = useDesignerStore((s) => s.ui);
  const setDatabaseType = useDesignerStore((s) => s.setDatabaseType);
  const [copied, setCopied] = useState(false);

  // 按左侧筛选范围过滤表和关系
  const filteredModel = useMemo(() => {
    if (!ui.filterFolderId) return model;
    const ids = collectTableIdsForFolder(model, ui.filterFolderId);
    const tables = model.tables.filter((t) => ids.has(t.id));
    const tableIds = new Set(tables.map((t) => t.id));
    const relations = model.relations.filter(
      (r) => tableIds.has(r.fromTableId) && tableIds.has(r.toTableId)
    );
    return { ...model, tables, relations };
  }, [model, ui.filterFolderId]);

  const sql = useMemo(() => generateDDL(filteredModel), [filteredModel]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    downloadTextFile(sql, `${model.databaseType}_schema.sql`, 'text/plain');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* SQL 编辑器工具栏：数据库切换 + 操作（白色） */}
      <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-gov-border shrink-0">
        <Database size={14} className="text-gov-textSecondary" />
        <div className="flex items-center rounded overflow-hidden border border-gov-border">
          <button
            onClick={() => setDatabaseType('mysql')}
            className={`px-2.5 py-1 text-xs transition-colors ${
              model.databaseType === 'mysql'
                ? 'bg-gov-blue text-white'
                : 'text-gov-textSecondary hover:bg-gov-bg'
            }`}
          >
            MySQL
          </button>
          <button
            onClick={() => setDatabaseType('dm')}
            className={`px-2.5 py-1 text-xs transition-colors ${
              model.databaseType === 'dm'
                ? 'bg-gov-blue text-white'
                : 'text-gov-textSecondary hover:bg-gov-bg'
            }`}
          >
            DM (达梦)
          </button>
        </div>

        <div className="w-px h-5 bg-gov-border mx-1" />

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gov-textSecondary hover:bg-gov-bg rounded transition-colors"
        >
          <Copy size={12} />
          {copied ? '已复制' : '复制'}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gov-textSecondary hover:bg-gov-bg rounded transition-colors"
        >
          <Download size={12} />
          导出 SQL
        </button>

        <div className="flex-1" />
        <span className="text-xs text-gov-textMuted">
          {filteredModel.tables.length} 张表
        </span>
      </div>

      {/* SQL 内容 */}
      <div className="flex-1 overflow-auto bg-gov-bg">
        <pre className="p-4 text-sm font-mono text-gov-text whitespace-pre-wrap">
          {sql}
        </pre>
      </div>
    </div>
  );
}
