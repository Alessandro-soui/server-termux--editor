import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VscSearch as FolderSearch, VscLoading as Loader2, VscSearch as Search } from 'react-icons/vsc';
import { api, getErrorMessage, type SearchHit } from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';
import { useSettings } from '../context/SettingsContext';
import { getFileIcon } from '../utils/iconUtils';

// Ordem: quem comeca com o texto digitado sobe; depois o nome; depois o caminho.
function rank(hit: SearchHit, query: string): number {
  if (!query) return 0;
  const name = hit.name.toLowerCase();
  const file = hit.path.toLowerCase();
  if (name.startsWith(query)) return 0;
  const nameIndex = name.indexOf(query);
  if (nameIndex >= 0) return 1 + nameIndex / 1000;
  const pathIndex = file.indexOf(query);
  if (pathIndex >= 0) return 2 + pathIndex / 1000;
  return 3;
}

export default function QuickOpenModal() {
  const { isQuickOpenOpen, closeQuickOpen, openFile, rootPath, treeVersion } = useWorkspace();
  const { hasToken } = useSettings();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isQuickOpenOpen) return;
    setQuery('');
    setHits([]);
    setSelected(0);
    setError(null);
    inputRef.current?.focus();
  }, [isQuickOpenOpen]);

  // Sem token nao da para buscar nada: manda o usuario direto para as Settings.
  useEffect(() => {
    if (!isQuickOpenOpen || hasToken) return;
    closeQuickOpen();
    navigate('/settings');
  }, [isQuickOpenOpen, hasToken, closeQuickOpen, navigate]);

  // Busca com debounce: digitar nao pode virar uma requisicao por tecla.
  useEffect(() => {
    if (!isQuickOpenOpen || !hasToken || !rootPath) return;

    const term = query.trim();
    const timer = setTimeout(() => {
      let cancelled = false;
      setLoading(true);
      api
        .searchFiles(rootPath, term)
        .then((data) => {
          if (cancelled) return;
          setHits(data.results);
          setTruncated(data.truncated);
          setError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setHits([]);
          setError(getErrorMessage(err));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, term ? 180 : 0);

    return () => clearTimeout(timer);
  }, [query, isQuickOpenOpen, hasToken, rootPath, treeVersion]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...hits].sort((a, b) => rank(a, term) - rank(b, term));
  }, [hits, query]);

  const openHit = useCallback(
    (hit: SearchHit) => {
      closeQuickOpen();
      void openFile(hit.path, hit.name);
    },
    [closeQuickOpen, openFile]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeQuickOpen();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => (results.length ? (s + 1) % results.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => (results.length ? (s - 1 + results.length) % results.length : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[selected];
      if (hit) openHit(hit);
    }
  };

  // Mantem a linha selecionada visivel na rolagem.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!isQuickOpenOpen || !hasToken) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeQuickOpen();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar arquivos"
        className="w-full max-w-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--vs-bg-sidebar)', border: '1px solid var(--vs-border-light)' }}
        onKeyDown={handleKeyDown}
      >
        <div
          className="flex items-center gap-2 px-3 h-9 shrink-0"
          style={{ borderBottom: '1px solid var(--vs-border-light)' }}
        >
          {loading ? (
            <Loader2 size={14} className="shrink-0 animate-spin" style={{ color: 'var(--vs-text-muted)' }} />
          ) : (
            <Search size={14} className="shrink-0" style={{ color: 'var(--vs-text-muted)' }} />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder="Buscar arquivo pelo nome..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 min-w-0 bg-transparent text-[13px] outline-none"
            style={{ color: 'var(--vs-text)' }}
          />
          {loading && <span className="text-[11px] shrink-0" style={{ color: 'var(--vs-text-dim)' }}>buscando</span>}
        </div>

        <div ref={listRef} className="vs-scroll overflow-y-auto py-1" style={{ maxHeight: 320 }}>
          {!rootPath && (
            <div className="px-3 py-4 text-center text-[12px]" style={{ color: 'var(--vs-text-dim)' }}>
              Nenhuma pasta aberta. Abra uma pasta para buscar arquivos.
            </div>
          )}

          {rootPath && error && (
            <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--vs-danger)' }}>
              {error}
            </div>
          )}

          {rootPath && !error && !loading && results.length === 0 && (
            <div className="px-3 py-4 text-center text-[12px]" style={{ color: 'var(--vs-text-dim)' }}>
              Nenhum arquivo encontrado.
            </div>
          )}

          {results.map((hit, index) => {
            const dir = hit.path.slice(0, hit.path.length - hit.name.length).replace(/\/+$/, '');
            return (
              <button
                key={hit.path}
                data-index={index}
                onMouseEnter={() => setSelected(index)}
                onClick={() => openHit(hit)}
                className="flex items-center gap-2 w-full px-3 h-[26px] text-left text-[13px] min-w-0"
                style={{
                  background: index === selected ? 'var(--vs-accent)' : 'transparent',
                  color: index === selected ? '#fff' : 'var(--vs-text)',
                }}
              >
                {getFileIcon(hit.name, 14)}
                <span className="truncate shrink-0 max-w-[50%]">{hit.name}</span>
                <span
                  className="truncate text-[11px] min-w-0"
                  style={{ color: index === selected ? 'rgba(255,255,255,0.75)' : 'var(--vs-text-dim)' }}
                >
                  {dir || '/'}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] shrink-0"
          style={{ borderTop: '1px solid var(--vs-border-light)', color: 'var(--vs-text-dim)' }}
        >
          <span className="flex items-center gap-1 min-w-0 truncate">
            <FolderSearch size={12} className="shrink-0" />
            {results.length} arquivo(s){truncated ? ' (lista truncada)' : ''}
          </span>
          <span className="shrink-0">↑↓ navegar · Enter abrir · Esc fechar</span>
        </div>
      </div>
    </div>
  );
}
