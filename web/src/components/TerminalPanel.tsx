import { useRef, useState } from 'react';
import { VscAdd, VscTrash, VscArrowUp, VscArrowDown, VscArrowLeft, VscArrowRight, VscNewline, VscClearAll } from 'react-icons/vsc';
import { useWorkspace } from '../context/WorkspaceContext';
import XTermComponent, { type XTermRef } from './XTermComponent';

export default function TerminalPanel() {
  const { isTerminalOpen, rootPath } = useWorkspace();
  const [terminals, setTerminals] = useState<{ id: number; name: string; cwd: string }[]>([]);
  const [activeTermId, setActiveTermId] = useState<number | null>(null);
  const [nextId, setNextId] = useState(1);
  const termRefs = useRef<Record<number, XTermRef | null>>({});

  // Só mostra o painel se estiver aberto E houver uma pasta raiz selecionada
  if (!isTerminalOpen || !rootPath) return null;

  const handleAddTerminal = () => {
    const newTerm = { id: nextId, name: `bash`, cwd: rootPath };
    setTerminals((prev) => [...prev, newTerm]);
    setActiveTermId(nextId);
    setNextId((id) => id + 1);
  };

  const handleRemoveTerminal = (id: number) => {
    setTerminals((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (activeTermId === id) {
        // Ativa o último da lista se removermos o ativo
        setActiveTermId(updated.length > 0 ? updated[updated.length - 1].id : null);
      }
      return updated;
    });
    delete termRefs.current[id];
  };

  // Cria um terminal automaticamente se não houver nenhum
  if (terminals.length === 0) {
    handleAddTerminal();
  }

  const sendCommand = (cmd: string) => {
    if (activeTermId !== null) {
      const term = termRefs.current[activeTermId];
      if (term) {
        term.sendData(cmd);
      }
    }
  };

  const clearTerminal = () => {
    if (activeTermId !== null) {
      const term = termRefs.current[activeTermId];
      if (term) {
        term.clear();
      }
    }
  };

  const btnClass = "p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white flex items-center justify-center";

  return (
    <div
      className="flex h-64 shrink-0 border-t"
      style={{
        background: 'var(--vs-bg-editor)',
        borderColor: 'var(--vs-border-group)',
      }}
    >
      <div className="flex-1 flex flex-col overflow-hidden relative border-r" style={{ borderColor: 'var(--vs-border-group)' }}>
        {/* Barra de atalhos móveis (title bar do terminal) */}
        <div className="flex items-center gap-1 p-1 border-b" style={{ borderColor: 'var(--vs-border-light)', background: 'var(--vs-bg-activitybar)' }}>
          <button onClick={() => sendCommand('\x1b[A')} className={btnClass} title="Para Cima"><VscArrowUp size={16} /></button>
          <button onClick={() => sendCommand('\x1b[B')} className={btnClass} title="Para Baixo"><VscArrowDown size={16} /></button>
          <button onClick={() => sendCommand('\x1b[D')} className={btnClass} title="Para Esquerda"><VscArrowLeft size={16} /></button>
          <button onClick={() => sendCommand('\x1b[C')} className={btnClass} title="Para Direita"><VscArrowRight size={16} /></button>
          <div className="w-px h-4 bg-gray-600 mx-1"></div>
          <button onClick={() => sendCommand('\r')} className={btnClass} title="Enter"><VscNewline size={16} /></button>
          <button onClick={() => sendCommand('\x03')} className={`${btnClass} text-[11px] font-bold`} title="Ctrl+C">Ctrl+C</button>
          <div className="w-px h-4 bg-gray-600 mx-1"></div>
          <button onClick={clearTerminal} className={btnClass} title="Limpar (Clear)"><VscClearAll size={16} /></button>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {terminals.map((t) => (
            <XTermComponent
              key={t.id}
              ref={(el) => { termRefs.current[t.id] = el; }}
              visible={activeTermId === t.id}
              cwd={t.cwd}
              onExit={() => handleRemoveTerminal(t.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Sidebar direita para gerenciar terminais */}
      <div 
        className="w-48 flex flex-col border-l shrink-0"
        style={{ borderColor: 'var(--vs-border-group)', background: 'var(--vs-bg-activitybar)' }}
      >
        <div className="flex items-center justify-between px-2 py-1 border-b" style={{ borderColor: 'var(--vs-border-light)' }}>
          <span className="text-[11px] font-semibold text-gray-400 uppercase">Terminais</span>
          <button 
            onClick={handleAddTerminal}
            className="p-1 hover:bg-white/10 rounded"
            title="Novo Terminal"
          >
            <VscAdd size={14} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {terminals.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between px-2 py-1 text-[12px] cursor-pointer group hover:bg-white/5 ${
                activeTermId === t.id ? 'bg-white/10 text-white' : 'text-gray-400'
              }`}
              onClick={() => setActiveTermId(t.id)}
            >
              <span className="truncate">{t.name}</span>
              <button
                className="hover:text-red-400 p-1 rounded"
                title="Fechar (Kill)"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTerminal(t.id);
                }}
              >
                <VscTrash size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
