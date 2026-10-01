import { useState, useCallback, useEffect, useRef, type MouseEvent } from 'react';
import { VscChevronRight as ChevronRight, VscChevronDown as ChevronDown } from 'react-icons/vsc';
import { api, type FolderItem } from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';
import { getFileIcon, getFolderIcon } from '../utils/iconUtils';

export interface TreeNode extends FolderItem {
  fullPath: string;
  isFolder: boolean;
}

function joinPath(parent: string, name: string): string {
  if (parent === '/' || parent === '') return `/${name}`;
  return `${parent}/${name}`;
}

interface FileTreeItemProps {
  item: FolderItem;
  parentPath: string;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onContextMenu: (e: MouseEvent, target: TreeNode) => void;
}

export default function FileTreeItem({
  item,
  parentPath,
  depth,
  selectedPath,
  onSelect,
  onContextMenu,
}: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FolderItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { openFile, activeTabPath, treeVersion } = useWorkspace();

  const fullPath = joinPath(parentPath, item.name);
  const isFolder = item.type === 'folder';
  const isActive = activeTabPath === fullPath;
  const isSelected = isFolder && selectedPath === fullPath;

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listFolder(fullPath);
      setChildren(data.items);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [fullPath]);

  const handleClick = async () => {
    if (isFolder) {
      // Selecionar a pasta e expandir: a selecao define onde "Novo arquivo/pasta" cria.
      onSelect(fullPath);
      const next = !expanded;
      setExpanded(next);
      if (next && children === null) await loadChildren();
    } else {
      // Ao abrir um arquivo, a pasta que contem o arquivo fica selecionada.
      onSelect(parentPath);
      openFile(fullPath, item.name);
    }
  };

  // Recarrega os filhos se a versao global da arvore mudar (apos criar/renomear/deletar)
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (isFolder && expanded) loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeVersion]);

  return (
    <div>
      <div
        onClick={handleClick}
        onDoubleClick={(e) => {
          e.preventDefault();
          onSelect(isFolder ? fullPath : parentPath);
          onContextMenu(e, { ...item, fullPath, isFolder });
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onSelect(isFolder ? fullPath : parentPath);
          onContextMenu(e, { ...item, fullPath, isFolder });
        }}
        className="flex items-center gap-1 h-[22px] cursor-pointer text-[13px] hover:bg-[color:var(--vs-bg-hover)]"
        style={{
          paddingLeft: 8 + depth * 12,
          background: isSelected || isActive ? 'var(--vs-bg-selected)' : undefined,
          color: isActive ? '#ffffff' : 'var(--vs-text)',
          boxShadow: isActive ? 'inset 2px 0 0 0 var(--vs-accent-blue)' : undefined,
        }}
      >
        {isFolder ? (
          expanded ? <ChevronDown size={14} className="shrink-0 text-[color:var(--vs-text-muted)]" /> : <ChevronRight size={14} className="shrink-0 text-[color:var(--vs-text-muted)]" />
        ) : (
          <span className="w-[14px] shrink-0" />
        )}

        {isFolder ? getFolderIcon(item.name, expanded) : getFileIcon(item.name)}

        <span className="truncate">{item.name}</span>
      </div>

      {isFolder && expanded && (
        <div>
          {loading && (
            <div className="text-[12px] text-[color:var(--vs-text-dim)]" style={{ paddingLeft: 8 + (depth + 1) * 12 }}>
              carregando...
            </div>
          )}
          {!loading && children && children.length === 0 && (
            <div className="text-[12px] text-[color:var(--vs-text-dim)]" style={{ paddingLeft: 8 + (depth + 1) * 12 }}>
              (vazio)
            </div>
          )}
          {!loading &&
            children &&
            children.map((child) => (
              <FileTreeItem
                key={child.name}
                item={child}
                parentPath={fullPath}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
              />
            ))}
        </div>
      )}
    </div>
  );
}
