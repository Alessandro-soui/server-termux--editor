import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Outlet } from 'react-router-dom';
import ActivityBar from './ActivityBar';
import Sidebar from './Sidebar';
import TitleBar from './TitleBar';
import StatusBar from './StatusBar';
import { useWorkspace } from '../context/WorkspaceContext';

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 520;
const SIDEBAR_DEFAULT = 240;
const SIDEBAR_KEY = 'vs_sidebar_width';

function clampSidebarWidth(value: number) {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, value));
}

function readStoredSidebarWidth() {
  const stored = Number(localStorage.getItem(SIDEBAR_KEY));
  if (!Number.isFinite(stored) || stored <= 0) return SIDEBAR_DEFAULT;
  return clampSidebarWidth(stored);
}

export default function Layout() {
  const { tabs, activeTabPath } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth);
  const widthRef = useRef(sidebarWidth);
  const activeTab = tabs.find((t) => t.path === activeTabPath);

  // Arraste da borda direita do Explorer (mouse e touch).
  const handleResizeStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startWidth = widthRef.current;

      const move = (ev: PointerEvent) => {
        const next = clampSidebarWidth(startWidth + (ev.clientX - startX));
        widthRef.current = next;
        setSidebarWidth(next);
      };
      const up = () => {
        localStorage.setItem(SIDEBAR_KEY, String(widthRef.current));
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    []
  );

  const handleResizeReset = useCallback(() => {
    const next = clampSidebarWidth(SIDEBAR_DEFAULT);
    widthRef.current = next;
    setSidebarWidth(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  }, []);

  return (
    <div className="vs-viewport flex flex-col" style={{ background: 'var(--vs-bg-app)' }}>
      <TitleBar
        activePath={activeTab?.path}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {/* "Frame": um unico espacamento ao redor dos cards (side panel e editor) */}
      <div
        className="flex flex-1 min-h-0 p-1.5 gap-1.5 overflow-hidden"
        style={{ background: 'var(--vs-bg-app)' }}
      >
        {/* Activity bar + Explorer no mesmo card preto, com linha fina nas bordas */}
        <div
          className="flex h-full min-h-0 shrink-0 rounded-[5px]"
          style={{ background: 'var(--vs-bg-app)', border: '1px solid var(--vs-border-group)' }}
        >
          <ActivityBar />

          {sidebarOpen && (
            <>
              <div className="w-px shrink-0" style={{ background: 'var(--vs-border-group)' }} />
              <Sidebar
                onRequestClose={() => setSidebarOpen(false)}
                width={sidebarWidth}
                onResizeStart={handleResizeStart}
                onResizeReset={handleResizeReset}
              />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0 flex overflow-hidden">
          <Outlet />
        </div>
      </div>

      <StatusBar activeTab={activeTab} />
    </div>
  );
}
