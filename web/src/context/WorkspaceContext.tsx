import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { api, getErrorMessage, isImagePath } from '../api/client';

export type TabKind = 'text' | 'image' | 'binary';

export interface Tab {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  loading: boolean;
  error: string | null;
  kind: TabKind;
  previewUrl: string | null;
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

export interface WorkspaceContextValue {
  tabs: Tab[];
  activeTabPath: string | null;
  setActiveTabPath: (path: string | null) => void;
  openFile: (fullPath: string, name: string) => Promise<void>;
  closeTab: (path: string) => void;
  updateTabContent: (path: string, content: string) => void;
  saveTab: (path: string) => Promise<void>;
  isSaving: boolean;
  saveActiveTab: () => Promise<SaveResult>;
  treeVersion: number;
  refreshTree: () => void;
  rootPath: string | null;
  rootName: string;
  openFolder: (path: string) => void;
  isFolderPickerOpen: boolean;
  openFolderPicker: () => void;
  closeFolderPicker: () => void;
  isQuickOpenOpen: boolean;
  openQuickOpen: () => void;
  closeQuickOpen: () => void;
}

export const HOME_PATH = '/';

export function folderLabel(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  if (trimmed === '' || trimmed === HOME_PATH) return 'HOME (~)';
  return trimmed.split('/').pop() || trimmed;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [treeVersion, setTreeVersion] = useState(0);
  // null = nenhuma pasta aberta ainda (a arvore fica vazia ate o usuario escolher).
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [isFolderPickerOpen, setFolderPickerOpen] = useState(false);
  const [isQuickOpenOpen, setQuickOpenOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // URLs de preview (imagens): criadas com createObjectURL e revogadas ao
  // fechar a aba ou ao desmontar, para nao vazar memoria.
  const previewUrls = useRef(new Set<string>());

  const refreshTree = useCallback(() => setTreeVersion((v) => v + 1), []);

  const openFolder = useCallback(
    (path: string) => {
      setRootPath(path || HOME_PATH);
      refreshTree();
    },
    [refreshTree]
  );

  const openFolderPicker = useCallback(() => setFolderPickerOpen(true), []);
  const closeFolderPicker = useCallback(() => setFolderPickerOpen(false), []);

  const openQuickOpen = useCallback(() => setQuickOpenOpen(true), []);
  const closeQuickOpen = useCallback(() => setQuickOpenOpen(false), []);

  // Ctrl+P / Ctrl+Shift+P abrem a busca de arquivos de qualquer lugar.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setQuickOpenOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Revoga os previews de imagem ao desmontar o app.
  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const openFile = useCallback(async (fullPath: string, name: string) => {
    setActiveTabPath(fullPath);

    setTabs((prev) => {
      if (prev.some((t) => t.path === fullPath)) return prev;
      return [
        ...prev,
        {
          path: fullPath,
          name,
          content: '',
          originalContent: '',
          loading: true,
          error: null,
          kind: 'text',
          previewUrl: null,
        },
      ];
    });

    try {
      // Imagem: baixa o binario e mostra o preview, sem entrar no editor de texto.
      if (isImagePath(fullPath)) {
        const blob = await api.readFileBlob(fullPath);
        const previewUrl = URL.createObjectURL(blob);
        previewUrls.current.add(previewUrl);
        setTabs((prev) =>
          prev.map((t) =>
            t.path === fullPath ? { ...t, kind: 'image', previewUrl, loading: false } : t
          )
        );
        return;
      }

      const data = await api.readFile(fullPath);
      // Caractere de substituicao = o arquivo nao era texto valido.
      const kind: TabKind = data.content.includes('\uFFFD') ? 'binary' : 'text';
      setTabs((prev) =>
        prev.map((t) =>
          t.path === fullPath
            ? { ...t, content: data.content, originalContent: data.content, kind, loading: false }
            : t
        )
      );
    } catch (err) {
      setTabs((prev) =>
        prev.map((t) => (t.path === fullPath ? { ...t, loading: false, error: getErrorMessage(err) } : t))
      );
    }
  }, []);

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const closed = prev.find((t) => t.path === path);
        if (closed?.previewUrl) {
          URL.revokeObjectURL(closed.previewUrl);
          previewUrls.current.delete(closed.previewUrl);
        }
        const next = prev.filter((t) => t.path !== path);
        if (activeTabPath === path) {
          setActiveTabPath(next.length ? next[next.length - 1].path : null);
        }
        return next;
      });
    },
    [activeTabPath]
  );

  const updateTabContent = useCallback((path: string, content: string) => {
    setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, content } : t)));
  }, []);

  const saveTab = useCallback(
    async (path: string) => {
      const tab = tabs.find((t) => t.path === path);
      if (!tab) return;
      // Imagem/binario nao tem texto para gravar: evita sobrescrever o arquivo.
      if (tab.kind !== 'text') return;

      await api.saveFile(path, tab.content);
      setTabs((prev) =>
        prev.map((t) => (t.path === path ? { ...t, originalContent: t.content } : t))
      );
    },
    [tabs]
  );

  const saveActiveTab = useCallback(async (): Promise<SaveResult> => {
    if (!activeTabPath) return { ok: false, error: 'Nenhum arquivo aberto' };
    const active = tabs.find((t) => t.path === activeTabPath);
    if (active && active.kind !== 'text') return { ok: false, error: 'Este arquivo nao e editavel' };
    setIsSaving(true);
    try {
      await saveTab(activeTabPath);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: getErrorMessage(err) };
    } finally {
      setIsSaving(false);
    }
  }, [activeTabPath, saveTab, tabs]);

  return (
    <WorkspaceContext.Provider
      value={{
        tabs,
        activeTabPath,
        setActiveTabPath,
        openFile,
        closeTab,
        updateTabContent,
        saveTab,
        isSaving,
        saveActiveTab,
        treeVersion,
        refreshTree,
        rootPath,
        rootName: rootPath ? folderLabel(rootPath) : '',
        openFolder,
        isFolderPickerOpen,
        openFolderPicker,
        closeFolderPicker,
        isQuickOpenOpen,
        openQuickOpen,
        closeQuickOpen,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider');
  return ctx;
}
