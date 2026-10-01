import { useState, useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import TabBar from './TabBar';
import EditorPane from './EditorPane';
import TerminalPanel from './TerminalPanel';
import { useWorkspace } from '../context/WorkspaceContext';

export default function EditorGroup() {
  const { isTerminalOpen, rootPath } = useWorkspace();
  const showTerminal = isTerminalOpen && Boolean(rootPath);
  const [terminalHeight, setTerminalHeight] = useState(256);
  const heightRef = useRef(terminalHeight);
  const groupRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startHeight = heightRef.current;
    
    // O tamanho máximo é a altura total do grupo (menos um respiro para o editor)
    const maxH = groupRef.current ? groupRef.current.clientHeight - 100 : window.innerHeight - 150;

    const move = (ev: PointerEvent) => {
      // Movimento para cima aumenta o terminal (clientY menor = delta negativo)
      const deltaY = startY - ev.clientY;
      const nextHeight = Math.max(100, Math.min(maxH, startHeight + deltaY));
      heightRef.current = nextHeight;
      setTerminalHeight(nextHeight);
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, []);

  return (
    <div ref={groupRef} className="flex-1 min-w-0 flex flex-col overflow-hidden gap-1.5">
      {/* Bloco do Editor */}
      <div
        className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-[5px]"
        style={{
          background: 'var(--vs-bg-editor)',
          border: '1px solid var(--vs-border-group)',
        }}
      >
        <TabBar />
        <EditorPane />
      </div>

      {/* Bloco do Terminal (agora englobando o Resizer de forma sobreposta) */}
      {showTerminal && (
        <div className="relative shrink-0 flex flex-col">
          {/* Divisor / Resizer - absolute para não somar espaços no gap do flex */}
          <div
            className="absolute left-0 right-0 h-4 cursor-row-resize z-20 flex items-center justify-center touch-none"
            style={{ top: '-11px' }}
            onPointerDown={handleResizeStart}
          >
            <div className="w-12 h-1 bg-gray-600 rounded-full opacity-60" />
          </div>

          <div
            className="shrink-0 flex overflow-hidden rounded-[5px]"
            style={{
              height: terminalHeight,
              background: '#000000',
              border: '1px solid var(--vs-border-group)',
            }}
          >
            <TerminalPanel />
          </div>
        </div>
      )}
    </div>
  );
}
