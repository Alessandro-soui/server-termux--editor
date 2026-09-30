import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VscChevronRight as ChevronRight,
  VscChevronDown as ChevronDown,
  VscFolder as FolderIcon,
  VscFolderOpened as FolderOpenIcon,
  VscHome as Home,
  VscLoading as Loader2,
  VscNewFolder as FolderPlus,
} from 'react-icons/vsc';
import { api, getErrorMessage, type FolderItem } from '../api/client';
import { useWorkspace, HOME_PATH, folderLabel } from '../context/WorkspaceContext';
import { useSettings } from '../context/SettingsContext';

function joinPath(parent: string, name: string): string {
  if (parent === '/' || parent === '') return `/${name}`;
  return `${parent}/${name}`;
}

interface PickerNodeProps {
  path: string;
  name: string;
  depth: number;
  selectedPath: string;
  currentRoot: string;
  onSelect: (path: string) => void;
}

function PickerNode({ path, name, depth, selectedPath, currentRoot, onSelect }: PickerNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FolderItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelected = selectedPath === path;
  const isCurrentRoot = currentRoot === path;

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listFolder(path);
      setChildren(data.items.filter((item) => item.type === 'folder'));
    } catch (err) {
      setError(getErrorMessage(err));
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [path]);

  const handleClick = () => {
    onSelect(path);
    const next = !expanded;
    setExpanded(next);
    if (next && children === null) loadChildren();
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className="flex items-center gap-1 h-[24px] cursor-pointer text-[13px] hover:bg-[color:var(--vs-bg-hover)]"
        style={{
          paddingLeft: 4 + depth * 14,
          background: isSelected ? 'var(--vs-bg-selected)' : undefined,
          color: isSelected ? '#ffffff' : 'var(--vs-text)',
        }}
      >
        {loading ? (
          <Loader2 size={13} className="shrink-0 animate-spin" style={{ color: 'var(--vs-text-muted)' }} />
        ) : expanded ? (
          <ChevronDown size={14} className="shrink-0" style={{ color: 'var(--vs-text-muted)' }} />
        ) : (
          <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--vs-text-muted)' }} />
        )}

        {depth === 0 ? (
          <Home size={14} className="shrink-0" style={{ color: 'var(--vs-accent-blue)' }} />
        ) : (
          <FolderIcon size={14} className="shrink-0" style={{ color: 'var(--vs-folder-icon)' }} />
        )}

        <span className="truncate">{name}</span>

        {isCurrentRoot && (
          <span
            className="ml-auto mr-2 text-[10px] px-1 shrink-0"
            style={{ color: 'var(--vs-success)', border: '1px solid var(--vs-success)' }}
          >
            aberta
          </span>
        )}
      </div>

      {error && (
        <div className="text-[11px]" style={{ paddingLeft: 4 + (depth + 1) * 14, color: 'var(--vs-danger)' }}>
          {error}
        </div>
      )}

      {expanded && !loading && children && children.length === 0 && (
        <div className="text-[11px]" style={{ paddingLeft: 4 + (depth + 1) * 14, color: 'var(--vs-text-dim)' }}>
          (sem subpastas)
        </div>
      )}

      {expanded && !loading && children?.map((child) => (
        <PickerNode
          key={child.name}
          path={joinPath(path, child.name)}
          name={child.name}
          depth={depth + 1}
          selectedPath={selectedPath}
          currentRoot={currentRoot}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default function OpenFolderModal() {
  const { isFolderPickerOpen, closeFolderPicker, openFolder, rootPath } = useWorkspace();
  const { hasToken } = useSettings();
  const navigate = useNavigate();

  const [selectedPath, setSelectedPath] = useState<string>(rootPath ?? HOME_PATH);

  // Sem token nao da para listar nada: manda o usuario direto para as Settings.
  useEffect(() => {
    if (!isFolderPickerOpen || hasToken) return;
    closeFolderPicker();
    navigate('/settings');
  }, [isFolderPickerOpen, hasToken, closeFolderPicker, navigate]);

  if (!isFolderPickerOpen || !hasToken) return null;

  function handleClose() {
    setSelectedPath(rootPath ?? HOME_PATH);
    closeFolderPicker();
  }

  const confirm = () => {
    openFolder(selectedPath);
    setSelectedPath(selectedPath);
    closeFolderPicker();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.6)' }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-folder-title"
        className="w-full max-w-lg shadow-2xl"
        style={{ background: 'var(--vs-bg-sidebar)', border: '1px solid var(--vs-border-light)' }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3 text-[13px] font-semibold"
          style={{ borderBottom: '1px solid var(--vs-border-light)' }}
        >
          <FolderOpenIcon size={15} style={{ color: 'var(--vs-accent-blue)' }} />
          <span id="open-folder-title">Abrir pasta</span>
        </div>

        <div className="px-4 pt-3 text-[12px]" style={{ color: 'var(--vs-text-muted)' }}>
          Toque numa pasta para selecionar; toque de novo para ver as subpastas.
        </div>

        <div className="vs-scroll overflow-y-auto px-2 py-2" style={{ maxHeight: 320 }}>
          <PickerNode
            path={HOME_PATH}
            name={folderLabel(HOME_PATH)}
            depth={0}
            selectedPath={selectedPath}
            currentRoot={rootPath ?? HOME_PATH}
            onSelect={setSelectedPath}
          />
        </div>

        <div
          className="flex items-center justify-between gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--vs-border-light)' }}
        >
          <span className="text-[11px] truncate" style={{ color: 'var(--vs-text-dim)' }}>
            Selecionada: {selectedPath}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 text-[13px]"
              style={{ color: 'var(--vs-text-muted)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirm}
              className="px-3 py-1.5 text-[13px] flex items-center gap-2"
              style={{ background: 'var(--vs-accent)', color: '#fff' }}
            >
              <FolderPlus size={13} /> Abrir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
