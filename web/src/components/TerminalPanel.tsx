import { useRef, useState, useCallback, useEffect } from 'react';
import { VscAdd, VscTrash, VscArrowUp, VscArrowDown, VscArrowLeft, VscArrowRight, VscNewline, VscClearAll, VscTerminal } from 'react-icons/vsc';
import { useWorkspace } from '../context/WorkspaceContext';
import XTermComponent, { type XTermRef } from './XTermComponent';

export default function TerminalPanel() {
  const { isTerminalOpen, rootPath, setTerminalOpen, terminalRequests, consumeTerminalRequests } = useWorkspace();
  const [terminals, setTerminals] = useState<{ id: number; name: string; cwd: string }[]>([]);
  const [activeTermId, setActiveTermId] = useState<number | null>(null);
  const [nextId, setNextId] = useState(1);
  const termRefs = useRef<Record<number, XTermRef | null>>({});

  // Só mostra o painel se estiver aberto E houver uma pasta raiz selecionada
  if (!isTerminalOpen || !rootPath) return null;

  const handleAddTerminal = useCallback((overrideCwd?: string) => {
    const newTerm = { id: nextId, name: `bash`, cwd: typeof overrideCwd === 'string' ? overrideCwd : rootPath };
    setTerminals((prev) => [...prev, newTerm]);
    setActiveTermId(nextId);
    setNextId((id) => id + 1);
  }, [nextId, rootPath]);

  useEffect(() => {
    if (terminalRequests.length > 0) {
      terminalRequests.forEach((cwd) => {
        handleAddTerminal(cwd);
      });
      consumeTerminalRequests();
    }
  }, [terminalRequests, handleAddTerminal, consumeTerminalRequests]);

  const handleRemoveTerminal = (id: number) => {
    setTerminals((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (updated.length === 0) {
        setTerminalOpen(false);
      } else if (activeTermId === id) {
        // Ativa o último da lista se removermos o ativo
        setActiveTermId(updated[updated.length - 1].id);
      }
      return updated;
    });
    delete termRefs.current[id];
  };

  const updateTerminalName = useCallback((id: number, newName: string) => {
    setTerminals((prev) => prev.map((t) => t.id === id ? { ...t, name: newName } : t));
  }, []);

  // Cria um terminal automaticamente se não houver nenhum E o painel estiver aberto
  if (terminals.length === 0 && isTerminalOpen) {
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

  const btnClass = "px-1.5 py-0.5 hover:bg-white/10 rounded text-gray-400 hover:text-white flex items-center justify-center";

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: '#000000' }}>
      <div className="flex-1 flex flex-col overflow-hidden relative border-r" style={{ borderColor: 'var(--vs-border-group)' }}>
        {/* Barra de atalhos móveis (title bar do terminal mais fina e preta) */}
        <div className="flex items-center gap-1 h-6 px-1 border-b" style={{ borderColor: 'var(--vs-border-light)', background: '#000000' }}>
          <button onClick={() => sendCommand('\x1b[A')} className={btnClass} title="Para Cima"><VscArrowUp size={14} /></button>
          <button onClick={() => sendCommand('\x1b[B')} className={btnClass} title="Para Baixo"><VscArrowDown size={14} /></button>
          <button onClick={() => sendCommand('\x1b[D')} className={btnClass} title="Para Esquerda"><VscArrowLeft size={14} /></button>
          <button onClick={() => sendCommand('\x1b[C')} className={btnClass} title="Para Direita"><VscArrowRight size={14} /></button>
          <div className="w-px h-3 bg-gray-600 mx-1"></div>
          <button onClick={() => sendCommand('\r')} className={btnClass} title="Enter"><VscNewline size={14} /></button>
          <button onClick={() => sendCommand('\x03')} className={`${btnClass} text-[10px] font-bold`} title="Ctrl+C">Ctrl+C</button>
          <div className="w-px h-3 bg-gray-600 mx-1"></div>
          <button onClick={clearTerminal} className={btnClass} title="Limpar (Clear)"><VscClearAll size={14} /></button>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {terminals.map((t) => (
            <XTermComponent
              key={t.id}
              ref={(el) => { termRefs.current[t.id] = el; }}
              visible={activeTermId === t.id}
              cwd={t.cwd}
              onProcessChange={(name) => updateTerminalName(t.id, name)}
              onExit={() => handleRemoveTerminal(t.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Sidebar direita para gerenciar terminais */}
      <div 
        className="w-48 flex flex-col shrink-0"
        style={{ background: '#000000' }}
      >
        <div className="flex items-center justify-between px-2 h-6 border-b" style={{ borderColor: 'var(--vs-border-light)' }}>
          <span className="text-[10px] font-semibold text-gray-400 uppercase">Terminais</span>
          <button 
            onClick={() => handleAddTerminal()}
            className="p-0.5 hover:bg-white/10 rounded"
            title="Novo Terminal"
          >
            <VscAdd size={12} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pt-1">
          {terminals.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between px-2 py-1 text-[12px] cursor-pointer group hover:bg-white/5 ${
                activeTermId === t.id ? 'bg-white/10 text-white' : 'text-gray-400'
              }`}
              onClick={() => setActiveTermId(t.id)}
            >
              <div className="flex items-center gap-1.5 truncate">
                <VscTerminal size={14} className="shrink-0" />
                <span className="truncate">{t.name}</span>
              </div>
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
