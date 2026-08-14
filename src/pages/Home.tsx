import { useCallback, useEffect, useRef, useState } from 'react';
import { useDesignerStore } from '@/store';
import Toolbar from '@/components/panels/Toolbar';
import LeftPanel from '@/components/panels/LeftPanel';
import RightPanel from '@/components/panels/RightPanel';
import SqlEditor from '@/components/panels/SqlEditor';
import ERCanvas from '@/components/canvas/ERCanvas';

export default function Home() {
  const ui = useDesignerStore((s) => s.ui);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(ui.leftPanelWidth);
  const [rightWidth, setRightWidth] = useState(ui.rightPanelWidth);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      if (isResizing === 'left') {
        setLeftWidth(Math.max(180, Math.min(400, e.clientX)));
      } else if (isResizing === 'right') {
        const w = window.innerWidth - e.clientX;
        setRightWidth(Math.max(260, Math.min(500, w)));
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div
          ref={leftRef}
          style={{ width: leftWidth }}
          className="shrink-0 h-full"
        >
          <LeftPanel />
        </div>

        {/* Left resizer */}
        <div
          className="w-1 shrink-0 bg-slate-700 hover:bg-sky-500 cursor-ew-resize transition-colors"
          onMouseDown={() => setIsResizing('left')}
        />

        {/* Center main area: 画布 / SQL 编辑器（切换） */}
        <div className="flex-1 relative min-w-0">
          {ui.mainView === 'canvas' ? <ERCanvas /> : <SqlEditor />}
        </div>

        {/* Right resizer + panel（属性 / SQL 预览，可关闭） */}
        {ui.showRightPanel && (
          <>
            <div
              className="w-1 shrink-0 bg-slate-700 hover:bg-sky-500 cursor-ew-resize transition-colors"
              onMouseDown={() => setIsResizing('right')}
            />
            <div
              ref={rightRef}
              style={{ width: rightWidth }}
              className="shrink-0 h-full"
            >
              <RightPanel />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
