import { useState, useMemo } from 'react';
import { useDesignerStore } from '@/store';
import { generateDDL, generateDataDictionary } from '@/sql-generator';
import { downloadTextFile } from '@/file-manager';
import { FileCode, BookOpen, Copy, Download, X } from 'lucide-react';

type BottomTab = 'sql' | 'dict';

export default function BottomPanel() {
  const model = useDesignerStore((s) => s.model);
  const ui = useDesignerStore((s) => s.ui);
  const toggleSqlPanel = useDesignerStore((s) => s.toggleSqlPanel);
  const toggleDictPanel = useDesignerStore((s) => s.toggleDictPanel);
  const [activeTab, setActiveTab] = useState<BottomTab>('sql');
  const [copied, setCopied] = useState(false);

  const sql = useMemo(() => generateDDL(model), [model]);
  const dictHtml = useMemo(() => generateDataDictionary(model), [model]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadSQL = () => {
    downloadTextFile(sql, `${model.databaseType}_schema.sql`, 'text/plain');
  };

  const handleDownloadDict = () => {
    downloadTextFile(dictHtml, 'data_dictionary.html', 'text/html');
  };

  if (!ui.showSqlPanel && !ui.showDictPanel) return null;

  return (
    <div className="flex flex-col h-full bg-slate-800 border-t border-slate-700">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              activeTab === 'sql'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode size={14} />
            SQL 预览
          </button>
          <button
            onClick={() => setActiveTab('dict')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              activeTab === 'dict'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={14} />
            数据字典
          </button>
        </div>
        <div className="flex items-center gap-1 px-2">
          {activeTab === 'sql' && (
            <>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded transition-colors"
              >
                <Copy size={12} />
                {copied ? '已复制' : '复制'}
              </button>
              <button
                onClick={handleDownloadSQL}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded transition-colors"
              >
                <Download size={12} />
                导出 SQL
              </button>
            </>
          )}
          {activeTab === 'dict' && (
            <button
              onClick={handleDownloadDict}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded transition-colors"
            >
              <Download size={12} />
              导出 HTML
            </button>
          )}
          <button
            onClick={() => {
              toggleSqlPanel();
              toggleDictPanel();
            }}
            className="p-1 text-slate-500 hover:text-slate-300"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'sql' && (
          <pre className="p-3 text-sm font-mono text-slate-300 whitespace-pre-wrap">
            {sql}
          </pre>
        )}
        {activeTab === 'dict' && (
          <iframe
            srcDoc={dictHtml}
            className="w-full h-full border-0"
            title="Data Dictionary"
          />
        )}
      </div>
    </div>
  );
}
