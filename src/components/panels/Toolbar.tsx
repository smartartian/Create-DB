import { useDesignerStore } from '@/store';
import {
  saveModelToStorage,
  loadModelFromStorage,
  getStoredModels,
  getLastModelName,
  deleteModelFromStorage,
  downloadModelFile,
  importModelFromFile,
  downloadTextFile,
} from '@/file-manager';
import { generateDDL, generateDataDictionary } from '@/sql-generator';
import {
  FilePlus,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  Database,
  ChevronDown,
  FileCode,
  BookOpen,
  Download,
  Clock,
  Trash2,
  Settings,
  Monitor,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Toolbar() {
  const model = useDesignerStore((s) => s.model);
  const setModel = useDesignerStore((s) => s.setModel);
  const setDatabaseType = useDesignerStore((s) => s.setDatabaseType);
  const undo = useDesignerStore((s) => s.undo);
  const redo = useDesignerStore((s) => s.redo);
  const canUndo = useDesignerStore((s) => s.canUndo());
  const canRedo = useDesignerStore((s) => s.canRedo());
  const toggleSqlPanel = useDesignerStore((s) => s.toggleSqlPanel);
  const toggleDictPanel = useDesignerStore((s) => s.toggleDictPanel);

  const [dbDropdownOpen, setDbDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [recentDropdownOpen, setRecentDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [currentModelName, setCurrentModelName] = useState<string | null>(getLastModelName());
  const dbDropdownRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const recentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dbDropdownRef.current && !dbDropdownRef.current.contains(e.target as Node)) {
        setDbDropdownOpen(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
      if (recentDropdownRef.current && !recentDropdownRef.current.contains(e.target as Node)) {
        setRecentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 检测运行环境
  const [platform, setPlatform] = useState<string>('web');
  useEffect(() => {
    const detectPlatform = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getPlatform) {
          const p = await (window as any).electronAPI.getPlatform();
          setPlatform(p);
        } else if ((navigator as any).standalone) {
          setPlatform('pwa');
        } else {
          setPlatform('web');
        }
      } catch {
        setPlatform('web');
      }
    };
    detectPlatform();
  }, []);

  // 自动保存到当前模型
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  useEffect(() => {
    if (currentModelName) {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        saveModelToStorage(currentModelName, model);
        setSaveStatus('saved');
      }, 800);
      return () => clearTimeout(timer);
    } else if (model.tables.length > 0 || model.folders.length > 0) {
      setSaveStatus('unsaved');
    } else {
      setSaveStatus('saved');
    }
  }, [model, currentModelName]);

  const handleNew = () => {
    if (confirm('确定要新建模型吗？未保存的更改将丢失。')) {
      setCurrentModelName(null);
      setModel({
        version: '1.0',
        databaseType: 'mysql',
        tables: [],
        relations: [],
        folders: [],
        settings: { canvas: { zoom: 1, offsetX: 0, offsetY: 0 } },
      });
    }
  };

  const handleOpen = async () => {
    const loaded = await importModelFromFile();
    if (loaded) {
      setCurrentModelName(null);
      setModel(loaded);
    }
  };

  const handleSave = () => {
    if (currentModelName) {
      saveModelToStorage(currentModelName, model);
      alert(`已保存到本地: ${currentModelName}`);
    } else {
      setSaveModalOpen(true);
      setSaveName(`design_${Date.now()}`);
    }
  };

  const handleSaveAs = () => {
    setSaveModalOpen(true);
    setSaveName(currentModelName || `design_${Date.now()}`);
  };

  const handleSaveSubmit = () => {
    if (!saveName.trim()) return;
    const name = saveName.trim();
    saveModelToStorage(name, model);
    setCurrentModelName(name);
    setSaveModalOpen(false);
  };

  const handleLoadRecent = (name: string) => {
    const loaded = loadModelFromStorage(name);
    if (loaded) {
      setCurrentModelName(name);
      setModel(loaded);
      setRecentDropdownOpen(false);
    }
  };

  const handleDeleteRecent = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除 "${name}" 吗？`)) {
      deleteModelFromStorage(name);
      if (currentModelName === name) {
        setCurrentModelName(null);
      }
    }
  };

  const handleExportSQL = () => {
    const sql = generateDDL(model);
    downloadTextFile(sql, `${model.databaseType}_schema.sql`, 'text/plain');
    setExportDropdownOpen(false);
  };

  const handleExportJSON = () => {
    downloadModelFile(model, currentModelName ? `${currentModelName}.dbm` : undefined);
    setExportDropdownOpen(false);
  };

  const handleExportDict = () => {
    const html = generateDataDictionary(model);
    downloadTextFile(html, 'data_dictionary.html', 'text/html');
    setExportDropdownOpen(false);
  };

  const recentModels = getStoredModels().sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-800 border-b border-slate-700">
        {/* File operations */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={handleNew} title="新建">
            <FilePlus size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={handleOpen} title="打开文件">
            <FolderOpen size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={handleSave} title="保存">
            <Save size={16} />
          </ToolbarButton>
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Recent models */}
        <div className="relative" ref={recentDropdownRef}>
          <button
            onClick={() => setRecentDropdownOpen(!recentDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-700 rounded-md transition-colors"
          >
            <Clock size={14} className="text-sky-400" />
            {currentModelName || '未命名'}
            <ChevronDown size={12} className="text-slate-500" />
          </button>
          {recentDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 z-50 min-w-[220px]">
              {recentModels.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500">暂无历史记录</div>
              ) : (
                recentModels.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleLoadRecent(m.name)}
                    className={`flex items-center justify-between px-3 py-1.5 text-sm hover:bg-slate-700 cursor-pointer transition-colors ${
                      currentModelName === m.name ? 'text-sky-400' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{m.name}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(m.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteRecent(m.name, e)}
                      className="p-0.5 text-slate-500 hover:text-red-400 shrink-0 ml-2"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={undo} disabled={!canUndo} title="撤销">
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={redo} disabled={!canRedo} title="重做">
            <Redo2 size={16} />
          </ToolbarButton>
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Database type */}
        <div className="relative" ref={dbDropdownRef}>
          <button
            onClick={() => setDbDropdownOpen(!dbDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-700 rounded-md transition-colors"
          >
            <Database size={14} className="text-sky-400" />
            {model.databaseType === 'mysql' ? 'MySQL' : 'DM (达梦)'}
            <ChevronDown size={12} className="text-slate-500" />
          </button>
          {dbDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 z-50 min-w-[140px]">
              <button
                onClick={() => {
                  setDatabaseType('mysql');
                  setDbDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700 transition-colors ${
                  model.databaseType === 'mysql' ? 'text-sky-400' : 'text-slate-300'
                }`}
              >
                MySQL
              </button>
              <button
                onClick={() => {
                  setDatabaseType('dm');
                  setDbDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700 transition-colors ${
                  model.databaseType === 'dm' ? 'text-sky-400' : 'text-slate-300'
                }`}
              >
                DM (达梦)
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Preview toggles */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={toggleSqlPanel} title="SQL 预览">
            <FileCode size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={toggleDictPanel} title="数据字典">
            <BookOpen size={16} />
          </ToolbarButton>
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Export */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-700 rounded-md transition-colors"
          >
            <Download size={14} className="text-sky-400" />
            导出
            <ChevronDown size={12} className="text-slate-500" />
          </button>
          {exportDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 z-50 min-w-[160px]">
              <button
                onClick={handleExportSQL}
                className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                导出 SQL 脚本
              </button>
              <button
                onClick={handleExportJSON}
                className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                导出 JSON 模型
              </button>
              <button
                onClick={handleExportDict}
                className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                导出数据字典 (HTML)
              </button>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Save status */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              保存中...
            </span>
          )}
          {saveStatus === 'saved' && currentModelName && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              已保存
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-xs text-sky-400 flex items-center gap-1 cursor-pointer hover:underline" onClick={handleSave}>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              未保存，点击保存
            </span>
          )}
        </div>

        <div className="w-px h-5 bg-slate-700 mx-2" />

        {/* Platform indicator */}
        <div className="relative">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="运行环境信息"
          >
            <Monitor size={12} />
            {platform === 'darwin' && 'macOS'}
            {platform === 'win32' && 'Windows'}
            {platform === 'linux' && 'Linux'}
            {platform === 'web' && 'Web'}
          </button>
          {settingsOpen && (
            <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg py-3 px-4 z-50 min-w-[220px]">
              <div className="text-xs text-slate-400 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                  <img src="/sql-logo.png" alt="DBDesigner Pro" className="w-10 h-10 rounded" />
                  <div>
                    <div className="font-semibold text-slate-200">DBDesigner Pro</div>
                    <div className="text-slate-500">v1.0.0</div>
                  </div>
                </div>
                <div className="pt-1">
                  <div className="text-slate-500 mb-1">运行平台</div>
                  <div className="text-slate-200">
                    {platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : platform === 'linux' ? 'Linux' : 'Web 浏览器'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">数据库支持</div>
                  <div className="text-slate-200">MySQL, DM (达梦)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-700 mx-2" />

        {/* Status */}
        <div className="text-xs text-slate-500">
          {model.tables.length} 张表 | {model.folders.length} 个文件夹
        </div>
      </div>

      {/* Save Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-5 w-80">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">保存模型</h3>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveSubmit();
                if (e.key === 'Escape') setSaveModalOpen(false);
              }}
              placeholder="输入模型名称..."
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveSubmit}
                disabled={!saveName.trim()}
                className="px-3 py-1.5 text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        disabled
          ? 'text-slate-600 cursor-not-allowed'
          : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
