
import { VscLayoutSidebarLeft as PanelLeft } from 'react-icons/vsc';
import { useWorkspace } from '../context/WorkspaceContext';

interface TitleBarProps {
  activePath?: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function TitleBar({ activePath, sidebarOpen, onToggleSidebar }: TitleBarProps) {
  const { rootName, rootPath, openQuickOpen, isTerminalOpen, toggleTerminal } = useWorkspace();

  // "Command center": nome do arquivo aberto, ou da pasta aberta, no centro.
  const centerLabel = activePath
    ? activePath.split('/').filter(Boolean).pop() || activePath
    : rootPath
      ? rootName
      : 'Explorer';

  return (
    <div
      className="relative z-10 -mb-1.5 h-8 flex items-center gap-1 px-1 sm:px-2 text-[12px] shrink-0 select-none"
      style={{
        background: 'var(--vs-bg-app)',
        color: 'var(--vs-text-muted)',
      }}
    >
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Esconder o Explorer' : 'Mostrar o Explorer'}
        className="shrink-0 p-1.5"
        style={{ color: sidebarOpen ? 'var(--vs-text)' : 'var(--vs-text-muted)' }}
      >
        <PanelLeft size={15} />
      </button>

      <button
        onClick={toggleTerminal}
        disabled={!rootPath}
        title={rootPath ? "Terminal" : "Abra uma pasta para usar o Terminal"}
        className="shrink-0 px-2 py-1 text-[11px] disabled:opacity-30 disabled:cursor-not-allowed uppercase font-semibold"
        style={{ color: isTerminalOpen && rootPath ? 'var(--vs-text)' : 'var(--vs-text-muted)' }}
      >
        Terminal
      </button>

      <button
        onClick={openQuickOpen}
        title="Buscar arquivo (Ctrl+P)"
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 h-6 w-[38%] max-w-72 min-w-[110px] px-2 rounded-[3px] text-[12px] min-w-0"
        style={{
          background: 'var(--vs-bg-app)',
          border: '1px solid var(--vs-border-light)',
          color: 'var(--vs-text)',
        }}
      >
        <span className="truncate text-[11px]">{centerLabel}</span>
      </button>
    </div>
  );
}
