import { useDesignerStore } from '@/store';
import {
  initStorage,
  saveModelToStorage,
  syncSaveModel,
  loadModelFromStorage,
  getStoredModels,
  getLastModelName,
  deleteModelFromStorage,
  downloadModelFile,
  downloadTextFile,
} from '@/file-manager';
import type { StoredModel } from '@/file-manager';
import { generateDDL } from '@/sql-generator';
import {
  Undo2,
  Redo2,
  ChevronDown,
  FileCode,
  Download,
  Trash2,
  Monitor,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

export default function Toolbar() {
  const model = useDesignerStore((s) => s.model);
  const setModel = useDesignerStore((s) => s.setModel);
  const undo = useDesignerStore((s) => s.undo);
  const redo = useDesignerStore((s) => s.redo);
  const canUndo = useDesignerStore((s) => s.canUndo());
  const canRedo = useDesignerStore((s) => s.canRedo());
  const setMainView = useDesignerStore((s) => s.setMainView);
  const mainView = useDesignerStore((s) => s.ui.mainView);
  const showToolbarLeft = useDesignerStore((s) => s.ui.showToolbarLeft);
  const toggleToolbarLeft = useDesignerStore((s) => s.toggleToolbarLeft);

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [currentModelName, setCurrentModelName] = useState<string | null>(null);
  const [recentModels, setRecentModels] = useState<StoredModel[]>([]);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
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

  // 初始化存储后端：探测桌面版 SQLite API，加载上次模型，刷新最近列表
  const refreshRecent = useCallback(async () => {
    const list = await getStoredModels();
    setRecentModels(list.sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initStorage();
      const last = await getLastModelName();
      if (cancelled) return;
      if (last) {
        const loaded = await loadModelFromStorage(last);
        if (cancelled) return;
        if (loaded) {
          setModel(loaded);
          setCurrentModelName(last);
        } else {
          setCurrentModelName(null);
        }
      }
      await refreshRecent();
    })();
    return () => {
      cancelled = true;
    };
  }, [setModel, refreshRecent]);

  // 关闭/刷新页面前的兜底保存，避免 800ms 防抖窗口内丢失最后修改
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentModelName) {
        syncSaveModel(currentModelName, model);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentModelName, model]);

  // 自动保存到当前模型
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  useEffect(() => {
    if (currentModelName) {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        saveModelToStorage(currentModelName, model).catch(() => {
          // 存储失败不阻塞编辑，恢复已保存标记避免状态卡在"保存中"
        });
        setSaveStatus('saved');
      }, 800);
      return () => clearTimeout(timer);
    } else if (model.tables.length > 0 || model.folders.length > 0) {
      setSaveStatus('unsaved');
    } else {
      setSaveStatus('saved');
    }
  }, [model, currentModelName]);

  const handleSave = async () => {
    if (currentModelName) {
      await saveModelToStorage(currentModelName, model);
      alert(`已保存到本地: ${currentModelName}`);
    } else {
      setSaveModalOpen(true);
      setSaveName(`design_${Date.now()}`);
    }
  };

  const handleSaveSubmit = async () => {
    if (!saveName.trim()) return;
    const name = saveName.trim();
    await saveModelToStorage(name, model);
    setCurrentModelName(name);
    setSaveModalOpen(false);
    await refreshRecent();
  };

  const handleLoadRecent = async (name: string) => {
    const loaded = await loadModelFromStorage(name);
    if (loaded) {
      setCurrentModelName(name);
      setModel(loaded);
    }
  };

  const handleDeleteRecent = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除 "${name}" 吗？`)) {
      await deleteModelFromStorage(name);
      if (currentModelName === name) {
        setCurrentModelName(null);
      }
      await refreshRecent();
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

  // 导出本地数据库文件（桌面原生版：保存对话框）
  const handleExportDB = async () => {
    try {
      const res = await fetch('/api/db/export', { method: 'POST' });
      const body = await res.json();
      setExportDropdownOpen(false);
      if (body.ok) {
        alert('数据库文件已导出');
      } else if (body.error) {
        alert(`导出失败: ${body.error}`);
      }
    } catch {
      setExportDropdownOpen(false);
      alert('导出失败：当前环境不支持');
    }
  };

  // 导入本地数据库文件（桌面原生版：选择对话框，导入后刷新）
  const handleImportDB = async () => {
    try {
      const res = await fetch('/api/db/import', { method: 'POST' });
      const body = await res.json();
      setExportDropdownOpen(false);
      if (body.ok) {
        if (body.cancelled) return;
        alert('数据库文件已导入，正在重新加载...');
        window.location.reload();
      } else if (body.error) {
        alert(`导入失败: ${body.error}`);
      }
    } catch {
      setExportDropdownOpen(false);
      alert('导入失败：当前环境不支持');
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 px-3 py-2 bg-gov-blue border-b border-gov-blueDark">
        {/* 折叠按钮（常驻，用于展开/收起左侧区域） */}
        <ToolbarButton onClick={toggleToolbarLeft} title={showToolbarLeft ? '收起工具栏' : '展开工具栏'}>
          {showToolbarLeft ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
        </ToolbarButton>

        {showToolbarLeft && (
          <>
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={undo} disabled={!canUndo} title="撤销">
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={redo} disabled={!canRedo} title="重做">
            <Redo2 size={16} />
          </ToolbarButton>
        </div>
          </>
        )}

        <div className="w-px h-5 bg-white/20 mx-1" />

        {/* 视图切换：画布 / SQL 编辑器 */}
        <div className="flex items-center rounded overflow-hidden border border-white/20">
          <button
            onClick={() => setMainView('canvas')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
              mainView === 'canvas'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <LayoutGrid size={13} />
            画布
          </button>
          <button
            onClick={() => setMainView('sql')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
              mainView === 'sql'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <FileCode size={13} />
            SQL
          </button>
        </div>

        <div className="w-px h-5 bg-white/20 mx-1" />

        {/* Export */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-white hover:bg-white/10 rounded transition-colors"
          >
            <Download size={14} className="text-white/70" />
            导出
            <ChevronDown size={12} className="text-white/50" />
          </button>
          {exportDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gov-border rounded shadow-lg py-1 z-50 min-w-[160px]">
              <button
                onClick={handleExportSQL}
                className="w-full text-left px-3 py-1.5 text-sm text-gov-text hover:bg-gov-bg transition-colors"
              >
                导出 SQL 脚本
              </button>
              <button
                onClick={handleExportJSON}
                className="w-full text-left px-3 py-1.5 text-sm text-gov-text hover:bg-gov-bg transition-colors"
              >
                导出 JSON 模型
              </button>
              <div className="border-t border-gov-border my-1" />
              <button
                onClick={handleExportDB}
                className="w-full text-left px-3 py-1.5 text-sm text-gov-text hover:bg-gov-bg transition-colors"
              >
                导出数据库文件
              </button>
              <button
                onClick={handleImportDB}
                className="w-full text-left px-3 py-1.5 text-sm text-gov-text hover:bg-gov-bg transition-colors"
              >
                导入数据库文件
              </button>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Save status */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-xs text-amber-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
              保存中...
            </span>
          )}
          {saveStatus === 'saved' && currentModelName && (
            <span className="text-xs text-emerald-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              已保存
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-xs text-amber-300 flex items-center gap-1 cursor-pointer hover:underline" onClick={handleSave}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
              未保存，点击保存
            </span>
          )}
        </div>

        <div className="w-px h-5 bg-white/20 mx-2" />

        {/* Platform indicator */}
        <div className="relative">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-white/60 hover:text-white transition-colors"
            title="运行环境信息"
          >
            <Monitor size={12} />
            {platform === 'darwin' && 'macOS'}
            {platform === 'win32' && 'Windows'}
            {platform === 'linux' && 'Linux'}
            {platform === 'web' && 'Web'}
          </button>
          {settingsOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gov-border rounded shadow-lg py-3 px-4 z-50 min-w-[260px] max-h-[80vh] overflow-y-auto">
              <div className="text-xs text-gov-textMuted space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-gov-border">
                  <img src="/sql-logo.png" alt="DBDesigner Pro" className="w-10 h-10 rounded" />
                  <div>
                    <div className="font-semibold text-gov-text">DBDesigner Pro</div>
                    <div className="text-gov-textMuted">v1.0.0</div>
                  </div>
                </div>
                <div className="pt-1">
                  <div className="text-gov-textMuted mb-1">运行平台</div>
                  <div className="text-gov-text">
                    {platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : platform === 'linux' ? 'Linux' : 'Web 浏览器'}
                  </div>
                </div>
                <div>
                  <div className="text-gov-textMuted mb-1">数据库支持</div>
                  <div className="text-gov-text">MySQL, DM (达梦)</div>
                </div>
                <div className="pt-1 border-t border-gov-border">
                  <div className="text-gov-textMuted mb-1">已保存模型</div>
                  {recentModels.length === 0 ? (
                    <div className="text-gov-textMuted">暂无保存的模型</div>
                  ) : (
                    <div className="space-y-1">
                      {recentModels.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            handleLoadRecent(m.name);
                            setSettingsOpen(false);
                          }}
                          className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors border ${
                            currentModelName === m.name
                              ? 'bg-gov-blueLight border-gov-blue/40'
                              : 'border-transparent hover:bg-gov-bg'
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-gov-text">{m.name}</span>
                            <span className="text-xs text-gov-textMuted">
                              {new Date(m.updatedAt).toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteRecent(m.name, e)}
                            className="p-0.5 text-gov-textMuted hover:text-gov-red shrink-0 ml-2"
                            title="删除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-white/20 mx-2" />

        {/* Status */}
        <div className="text-xs text-white/70">
          {model.tables.length} 张表 | {model.folders.length} 个文件夹
        </div>
      </div>

      {/* Save Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-gov-border rounded shadow-xl p-5 w-80">
            <h3 className="text-lg font-semibold text-gov-text mb-3 flex items-center gap-2">
              <span className="w-[4px] h-4 bg-gov-red rounded-sm" />
              保存模型
            </h3>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveSubmit();
                if (e.key === 'Escape') setSaveModalOpen(false);
              }}
              placeholder="输入模型名称..."
              className="w-full bg-white border border-gov-border rounded px-3 py-2 text-sm text-gov-text placeholder-gov-textMuted focus:outline-none focus:border-gov-blue mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-3 py-1.5 text-sm text-gov-text hover:bg-gov-bg rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveSubmit}
                disabled={!saveName.trim()}
                className="px-3 py-1.5 text-sm bg-gov-red hover:bg-gov-redDark disabled:bg-gov-border disabled:text-gov-textMuted text-white rounded transition-colors"
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
      className={`p-1.5 rounded transition-colors ${
        disabled
          ? 'text-white/30 cursor-not-allowed'
          : 'text-white/80 hover:bg-white/15 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
