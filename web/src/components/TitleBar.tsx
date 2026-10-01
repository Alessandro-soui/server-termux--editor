import { useState } from 'react';
import { VscEllipsis as MoreHorizontal, VscLayoutSidebarLeft as PanelLeft, VscSaveAll as Save, VscTerminal as TerminalIcon } from 'react-icons/vsc';
import { useWorkspace } from '../context/WorkspaceContext';
import TitleBarMenuModal from './TitleBarMenuModal';

interface TitleBarProps {
  activePath?: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function TitleBar({ activePath, sidebarOpen, onToggleSidebar }: TitleBarProps) {
  const { tabs, activeTabPath, saveActiveTab, isSaving, rootName, rootPath, openQuickOpen, isTerminalOpen, toggleTerminal } = useWorkspace();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tab = tabs.find((t) => t.path === activeTabPath);
  const isDirty = Boolean(tab) && tab!.content !== tab!.originalContent;

  // "Command center": nome do arquivo aberto, ou da pasta aberta, no centro.
  const centerLabel = activePath
    ? activePath.split('/').filter(Boolean).pop() || activePath
    : rootPath
      ? rootName
      : 'Explorer';

  const handleSave = () => {
    void saveActiveTab().then((res) => {
      if (!res.ok && res.error) alert(res.error);
    });
  };

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

      <div className="ml-auto flex items-center gap-1">
        {tab && (
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            title="Salvar (Ctrl+S)"
            className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] disabled:opacity-40"
            style={{ color: isDirty ? 'var(--vs-text)' : 'var(--vs-text-dim)' }}
          >
            <Save size={12} />
            {isSaving ? 'Salvando...' : 'Save'}
          </button>
        )}

        <button
          onClick={toggleTerminal}
          title="Terminal"
          className="shrink-0 p-1"
          style={{ color: isTerminalOpen ? 'var(--vs-text)' : 'var(--vs-text-muted)' }}
        >
          <TerminalIcon size={14} />
        </button>

        <button
          onClick={() => setIsMenuOpen((v) => !v)}
          title="Mais acoes"
          className="shrink-0 p-1"
          style={{ color: isMenuOpen ? 'var(--vs-text)' : 'var(--vs-text-muted)' }}
        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      <TitleBarMenuModal
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        canSave={isDirty}
        onSave={handleSave}
      />
    </div>
  );
}
