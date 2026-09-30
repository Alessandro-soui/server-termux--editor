import { VscClose as X } from 'react-icons/vsc';
import { getFileIcon } from '../utils/iconUtils';
import { useWorkspace } from '../context/WorkspaceContext';

// Topo do grupo de editors: a aba ativa se funde com o editor (mesmo fundo),
// as inativas ficam pretas, iguais ao fundo do app.
export default function TabBar() {
  const { tabs, activeTabPath, setActiveTabPath, closeTab } = useWorkspace();

  if (tabs.length === 0) return null;

  return (
    <div
      className="flex h-9 shrink-0 overflow-x-auto vs-scroll pl-1 pt-1"
      style={{ background: 'var(--vs-bg-app)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        const dirty = tab.content !== tab.originalContent;

        return (
          <div
            key={tab.path}
            onClick={() => setActiveTabPath(tab.path)}
            title={tab.path}
            className={`relative flex items-center gap-2 pl-3 pr-2 h-8 text-[13px] cursor-pointer shrink-0 rounded-t-[4px] ${
              isActive ? '' : 'hover:bg-[color:var(--vs-bg-hover)]'
            }`}
            style={{
              background: isActive ? 'var(--vs-bg-editor)' : 'var(--vs-bg-app)',
              color: isActive ? '#ffffff' : 'var(--vs-text-dim)',
            }}
          >
            {getFileIcon(tab.name, 13)}
            <span className="whitespace-nowrap">{tab.name}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.path);
              }}
              className="w-4 h-4 flex items-center justify-center rounded-sm hover:bg-[color:var(--vs-bg-hover)] shrink-0"
              title="Fechar"
            >
              {dirty ? <span className="w-2 h-2 rounded-full bg-white inline-block" /> : <X size={13} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}
