import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { VscNewFile as FilePlus, VscNewFolder as FolderPlus, VscFolderOpened as FolderOpen, VscKey as KeyRound, VscRefresh as RefreshCw, VscClose as X, VscSaveAll as Save } from 'react-icons/vsc';
import { api, getErrorMessage, type FolderItem } from '../api/client';
import { useSettings } from '../context/SettingsContext';
import { useWorkspace } from '../context/WorkspaceContext';
import FileTreeItem, { type TreeNode } from './FileTreeItem';

type ContextMenuAction = 'rename' | 'delete' | 'terminal';

interface ContextMenuProps {
  x: number;
  y: number;
  target: TreeNode;
  onClose: () => void;
  onAction: (action: ContextMenuAction, target: TreeNode) => void;
}

function ContextMenu({ x, y, target, onClose, onAction }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items: { key: ContextMenuAction; label: string }[] = [
    { key: 'rename', label: 'Renomear' },
    { key: 'delete', label: 'Excluir' },
  ];

  if (target.isFolder) {
    items.push({ key: 'terminal', label: 'Abrir no Terminal' });
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 text-[13px] py-1 shadow-lg"
      style={{ top: y, left: x, background: 'var(--vs-bg-app)', border: '1px solid var(--vs-border-light)', minWidth: 140 }}
    >
      {items.map((it) => (
        <div
          key={it.key}
          className="px-3 py-1 cursor-pointer hover:bg-[color:var(--vs-accent)] hover:text-white"
          onClick={() => onAction(it.key, target)}
        >
          {it.label}
        </div>
      ))}
    </div>
  );
}

interface ContextMenuState {
  x: number;
  y: number;
  target: TreeNode;
}

interface SidebarProps {
  onRequestClose: () => void;
  width: number;
  onResizeStart: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeReset: () => void;
}

export default function Sidebar({ onRequestClose, width, onResizeStart, onResizeReset }: SidebarProps) {
  const [items, setItems] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  // A selecao vale para a raiz em que foi feita: trocando de pasta, volta para a raiz.
  const [selection, setSelection] = useState<{ root: string | null; path: string | null }>({
    root: null,
    path: null,
  });
  const {
    treeVersion,
    refreshTree,
    closeTab,
    rootPath,
    rootName,
    openFolderPicker,
    requestTerminal,
    tabs,
    activeTabPath,
    saveActiveTab,
    isSaving
  } = useWorkspace();
  const { hasToken } = useSettings();
  const navigate = useNavigate();

  const tab = tabs.find((t) => t.path === activeTabPath);
  const isDirty = Boolean(tab) && tab!.content !== tab!.originalContent;

  const handleSave = () => {
    void saveActiveTab().then((res) => {
      if (!res.ok && res.error) alert(res.error);
    });
  };

  const selectedFolder = selection.root === rootPath ? selection.path : rootPath;
  const handleSelect = useCallback(
    (path: string) => setSelection({ root: rootPath, path }),
    [rootPath]
  );

  // Sem pasta aberta nao ha nada para listar: a arvore comeca vazia.
  const targetFolder = selectedFolder || rootPath;

  const load = useCallback(async () => {
    if (!hasToken) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (!rootPath) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.listFolder(rootPath);
      setItems(data.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [rootPath, hasToken]);

  useEffect(() => {
    load();
  }, [load, treeVersion]);

  const handleNewFile = async () => {
    const dir = targetFolder || rootPath;
    if (!dir) {
      openFolderPicker();
      return;
    }
    const name = prompt(`Nome do novo arquivo (em ${dir}):`);
    if (!name) return;
    try {
      await api.createFile(dir, name, '');
      refreshTree();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleNewFolder = async () => {
    const dir = targetFolder || rootPath;
    if (!dir) {
      openFolderPicker();
      return;
    }
    const name = prompt(`Nome da nova pasta (em ${dir}):`);
    if (!name) return;
    try {
      await api.createFolder(dir, name);
      refreshTree();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleContextMenu = (e: ReactMouseEvent, target: TreeNode) => {
    setMenu({ x: e.clientX, y: e.clientY, target });
  };

  const handleMenuAction = async (action: ContextMenuAction, target: TreeNode) => {
    setMenu(null);

    if (action === 'rename') {
      const newName = prompt('Novo nome:', target.name);
      if (!newName || newName === target.name) return;
      try {
        if (target.isFolder) await api.renameFolder(target.fullPath, newName);
        else await api.renameFile(target.fullPath, newName);
        refreshTree();
      } catch (err) {
        alert(getErrorMessage(err));
      }
    }

    if (action === 'delete') {
      const ok = confirm(`Excluir "${target.name}"? Essa acao nao pode ser desfeita.`);
      if (!ok) return;
      try {
        if (target.isFolder) await api.deleteFolder(target.fullPath, true);
        else await api.deleteFile(target.fullPath);
        closeTab(target.fullPath);
        refreshTree();
      } catch (err) {
        alert(getErrorMessage(err));
      }
    }

    if (action === 'terminal') {
      requestTerminal(target.fullPath);
    }
  };

  return (
    <div
      className="h-full min-h-0 shrink-0 flex flex-col relative"
      style={{ width: `${width}px` }}
    >
      <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[11px] tracking-wide text-[color:var(--vs-text-muted)] shrink-0 overflow-hidden">
        <div className="flex items-center gap-3">
          <span>EXPLORER</span>
          {tab && (
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              title="Salvar arquivo aberto (Ctrl+S)"
              className="flex items-center gap-1 normal-case disabled:opacity-40 hover:text-white"
              style={{ color: isDirty ? 'var(--vs-text)' : 'var(--vs-text-dim)' }}
            >
              <Save size={12} />
              <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          )}
        </div>
        <button
          onClick={onRequestClose}
          title="Esconder o Explorer"
          className="p-1 hover:text-white"
          style={{ color: 'var(--vs-text-muted)' }}
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 pl-3 pr-1.5 pb-0.5 shrink-0 overflow-hidden">
        <button
          onClick={openFolderPicker}
          title="Abrir outra pasta"
          className="flex items-center gap-1.5 min-w-0 h-5 px-1 rounded-[3px] text-[11px] font-semibold text-[color:var(--vs-text)] hover:bg-[color:var(--vs-bg-hover)]"
        >
          <FolderOpen size={13} className="shrink-0" />
          <span className="truncate">{rootName || 'Nenhuma pasta aberta'}</span>
        </button>
        <div className="flex items-center shrink-0 text-[color:var(--vs-text-muted)]">
          <button
            title="Abrir pasta"
            onClick={openFolderPicker}
            className="grid place-items-center size-5 rounded-[3px] hover:bg-[color:var(--vs-bg-hover)] hover:text-white"
          >
            <FolderOpen size={13} />
          </button>
          <button
            title={targetFolder ? `Novo arquivo em ${targetFolder}` : 'Novo arquivo'}
            onClick={handleNewFile}
            className="grid place-items-center size-5 rounded-[3px] hover:bg-[color:var(--vs-bg-hover)] hover:text-white"
          >
            <FilePlus size={14} />
          </button>
          <button
            title={targetFolder ? `Nova pasta em ${targetFolder}` : 'Nova pasta'}
            onClick={handleNewFolder}
            className="grid place-items-center size-5 rounded-[3px] hover:bg-[color:var(--vs-bg-hover)] hover:text-white"
          >
            <FolderPlus size={14} />
          </button>
          <button
            title="Atualizar"
            onClick={refreshTree}
            className="grid place-items-center size-5 rounded-[3px] hover:bg-[color:var(--vs-bg-hover)] hover:text-white"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 h-0 min-h-0 overflow-y-auto overflow-x-hidden vs-scroll" style={{ overscrollBehavior: 'contain' }}>
        {!hasToken && (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
            <KeyRound size={20} style={{ color: 'var(--vs-text-dim)' }} />
            <p className="text-[12px]" style={{ color: 'var(--vs-text-dim)' }}>
              Sem token configurado.
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="px-3 py-1.5 text-[12px]"
              style={{ background: 'var(--vs-accent)', color: '#fff' }}
            >
              Abrir Settings
            </button>
          </div>
        )}

        {hasToken && !rootPath && (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
            <FolderOpen size={22} style={{ color: 'var(--vs-text-dim)' }} />
            <p className="text-[12px]" style={{ color: 'var(--vs-text-dim)' }}>
              Nenhuma pasta aberta.
            </p>
            <button
              onClick={openFolderPicker}
              className="px-3 py-1.5 text-[12px]"
              style={{ background: 'var(--vs-accent)', color: '#fff' }}
            >
              Abrir pasta
            </button>
          </div>
        )}

        {hasToken && rootPath && loading && <div className="px-3 py-2 text-[12px] text-[color:var(--vs-text-dim)]">carregando...</div>}
        {hasToken && rootPath && error && (
          <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--vs-danger)' }}>
            {error}. Confira o token em Settings.
          </div>
        )}
        {hasToken &&
          rootPath &&
          !loading &&
          !error &&
          items.map((item) => (
            <FileTreeItem
              key={item.name}
              item={item}
              parentPath={rootPath}
              depth={0}
              selectedPath={selectedFolder}
              onSelect={handleSelect}
              onContextMenu={handleContextMenu}
            />
          ))}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          target={menu.target}
          onClose={() => setMenu(null)}
          onAction={handleMenuAction}
        />
      )}

      <div
        onPointerDown={onResizeStart}
        onDoubleClick={onResizeReset}
        title="Arraste para redimensionar"
        className="absolute top-0 h-full w-4 cursor-col-resize touch-none select-none flex items-center justify-center z-50"
        style={{ right: '-11px', background: 'transparent' }}
      >
        <div className="w-1 h-12 bg-gray-600 rounded-full opacity-60" />
      </div>
    </div>
  );
}
