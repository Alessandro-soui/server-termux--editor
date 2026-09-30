import { useEffect, useRef, useState } from 'react';
import { VscCode as Code2, VscWarning as FileWarning, VscFolderOpened as FolderOpen } from 'react-icons/vsc';
import { useWorkspace } from '../context/WorkspaceContext';

const LINE_HEIGHT = 20;
const TEXT_PADDING_TOP = 12;

function PathBar({ path }: { path: string }) {
  return (
    <div
      className="flex items-center gap-2 px-2 sm:px-3 h-5 text-[10px] shrink-0"
      style={{ background: 'var(--vs-bg-editor)', color: 'var(--vs-text-dim)', borderBottom: '1px solid var(--vs-border)' }}
    >
      <span className="truncate min-w-0 flex-1" title={path}>
        {path}
      </span>
    </div>
  );
}

function EmptyState() {
  const { openFolderPicker } = useWorkspace();

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[color:var(--vs-text-dim)]">
      <Code2 size={48} strokeWidth={1} />
      <p className="text-[13px]">Selecione um arquivo no Explorer para comecar</p>
      <button
        onClick={openFolderPicker}
        className="mt-1 px-3 py-1.5 text-[13px] flex items-center gap-2"
        style={{ background: 'var(--vs-accent)', color: '#fff' }}
      >
        <FolderOpen size={14} /> Abrir pasta
      </button>
    </div>
  );
}

export default function EditorPane() {
  const { tabs, activeTabPath, updateTabContent, saveActiveTab } = useWorkspace();
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const tab = tabs.find((t) => t.path === activeTabPath);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void saveActiveTab().then((res) => {
          if (!res.ok && res.error) alert(res.error);
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveActiveTab]);

  if (!tab) return <EmptyState />;

  if (tab.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[color:var(--vs-text-dim)] text-[13px]">
        Carregando {tab.name}...
      </div>
    );
  }

  if (tab.error) {
    return (
      <div className="flex-1 flex items-center justify-center text-[13px]" style={{ color: 'var(--vs-danger)' }}>
        Erro ao abrir {tab.name}: {tab.error}
      </div>
    );
  }

  if (tab.kind === 'image') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <PathBar path={tab.path} />
        <div
          className="flex-1 flex items-center justify-center overflow-auto p-4 vs-scroll"
          style={{ background: 'var(--vs-bg-editor)' }}
        >
          {tab.previewUrl && (
            <img
              src={tab.previewUrl}
              alt={tab.name}
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: 'auto' }}
            />
          )}
        </div>
      </div>
    );
  }

  if (tab.kind === 'binary') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <PathBar path={tab.path} />
        <div
          className="flex-1 flex flex-col items-center justify-center gap-2 text-[13px]"
          style={{ background: 'var(--vs-bg-editor)', color: 'var(--vs-text-dim)' }}
        >
          <FileWarning size={40} strokeWidth={1} />
          <p>Arquivo binario, sem visualizacao.</p>
          <p className="text-[11px]">{tab.name}</p>
        </div>
      </div>
    );
  }

  const lineCount = tab.content.split('\n').length;
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const ta = textRef.current;
    if (!ta) return;
    const y = e.clientY - ta.getBoundingClientRect().top + ta.scrollTop - TEXT_PADDING_TOP;
    const index = Math.floor(y / LINE_HEIGHT);
    setHoverLine(index >= 0 && index < lineCount ? index + 1 : null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <PathBar path={tab.path} />

      <div
        className="flex-1 flex overflow-hidden relative"
        style={{ background: 'var(--vs-bg-editor)' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverLine(null)}
      >
        <div
          className="text-right pr-3 pt-3 select-none text-[13px] leading-[20px] overflow-hidden"
          style={{ fontFamily: 'var(--vs-font-mono)', color: 'var(--vs-text-dim)', minWidth: 40 }}
        >
          <div style={{ transform: `translateY(-${scrollTop}px)` }}>
            {lines.map((n) => (
              <div
                key={n}
                style={n === hoverLine ? { color: 'var(--vs-accent-blue)' } : undefined}
              >
                {n}
              </div>
            ))}
          </div>
        </div>

        <textarea
          ref={textRef}
          value={tab.content}
          onChange={(e) => updateTabContent(tab.path, e.target.value)}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          spellCheck={false}
          className="flex-1 min-w-0 resize-none pt-3 pr-4 pb-4 bg-transparent text-[13px] leading-[20px] vs-scroll"
          style={{ fontFamily: 'var(--vs-font-mono)', color: 'var(--vs-text)' }}
        />

        <span
          className="absolute right-2 top-1 text-[10px] pointer-events-none select-none"
          style={{ color: 'var(--vs-text-dim)' }}
        >
          {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
        </span>
      </div>
    </div>
  );
}
