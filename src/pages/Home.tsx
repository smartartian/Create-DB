import { useCallback, useEffect, useRef, useState } from 'react';
import { useDesignerStore } from '@/store';
import Toolbar from '@/components/panels/Toolbar';
import LeftPanel from '@/components/panels/LeftPanel';
import RightPanel from '@/components/panels/RightPanel';
import BottomPanel from '@/components/panels/BottomPanel';
import ERCanvas from '@/components/canvas/ERCanvas';

export default function Home() {
  const ui = useDesignerStore((s) => s.ui);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(ui.leftPanelWidth);
  const [rightWidth, setRightWidth] = useState(ui.rightPanelWidth);
  const [bottomHeight, setBottomHeight] = useState(ui.bottomPanelHeight);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | 'bottom' | null>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      if (isResizing === 'left') {
        setLeftWidth(Math.max(180, Math.min(400, e.clientX)));
      } else if (isResizing === 'right') {
        const w = window.innerWidth - e.clientX;
        setRightWidth(Math.max(260, Math.min(500, w)));
      } else if (isResizing === 'bottom') {
        const h = window.innerHeight - e.clientY;
        setBottomHeight(Math.max(120, Math.min(500, h)));
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
      document.body.style.cursor = isResizing === 'bottom' ? 'ns-resize' : 'ew-resize';
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

  const showBottom = ui.showSqlPanel || ui.showDictPanel;

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

        {/* Center canvas area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative min-h-0">
            <ERCanvas />
          </div>

          {/* Bottom panel */}
          {showBottom && (
            <>
              <div
                className="h-1 shrink-0 bg-slate-700 hover:bg-sky-500 cursor-ns-resize transition-colors"
                onMouseDown={() => setIsResizing('bottom')}
              />
              <div
                ref={bottomRef}
                style={{ height: bottomHeight }}
                className="shrink-0"
              >
                <BottomPanel />
              </div>
            </>
          )}
        </div>

        {/* Right resizer */}
        <div
          className="w-1 shrink-0 bg-slate-700 hover:bg-sky-500 cursor-ew-resize transition-colors"
          onMouseDown={() => setIsResizing('right')}
        />

        {/* Right panel */}
        <div
          ref={rightRef}
          style={{ width: rightWidth }}
          className="shrink-0 h-full"
        >
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
