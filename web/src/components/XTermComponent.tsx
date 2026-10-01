import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useSettings } from '../context/SettingsContext';

interface XTermComponentProps {
  visible: boolean;
  cwd: string;
  onExit: () => void;
  onProcessChange?: (name: string) => void;
}

export interface XTermRef {
  sendData: (data: string) => void;
  clear: () => void;
}

const XTermComponent = forwardRef<XTermRef, XTermComponentProps>(({ visible, cwd, onExit, onProcessChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { token } = useSettings();
  
  // Guardamos onExit e visible em refs para evitar recriar o terminal
  const onExitRef = useRef(onExit);
  const visibleRef = useRef(visible);
  const onProcessChangeRef = useRef(onProcessChange);
  useEffect(() => {
    onExitRef.current = onExit;
    visibleRef.current = visible;
    onProcessChangeRef.current = onProcessChange;
  }, [onExit, visible, onProcessChange]);

  useImperativeHandle(ref, () => ({
    sendData: (data: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }));
      }
    },
    clear: () => {
      terminalRef.current?.clear();
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'monospace',
      fontSize: 13,
      theme: {
        background: '#000000', // black background as requested
      }
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(containerRef.current);
    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Conectar WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl = '';
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const cwdQuery = encodeURIComponent(cwd);
    
    if (apiBaseUrl) {
      const url = new URL(apiBaseUrl, window.location.origin);
      wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/api/terminal?token=${token}&cwd=${cwdQuery}`;
    } else {
      wsUrl = `${protocol}//${window.location.host}/api/terminal?token=${token}&cwd=${cwdQuery}`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Ajusta o tamanho inicial ao conectar
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims) {
        ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') {
          term.write(msg.data);
        } else if (msg.type === 'exit') {
          ws.close();
          onExitRef.current();
        } else if (msg.type === 'process' && msg.name) {
          onProcessChangeRef.current?.(msg.name);
        }
      } catch (e) {
        console.error('Erro ao processar mensagem do WS:', e);
      }
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    const handleResize = () => {
      if (visibleRef.current) {
        try {
          fitAddon.fit();
          const dims = fitAddon.proposeDimensions();
          if (dims && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
          }
        } catch (e) {}
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => handleResize());
    });
    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      term.dispose();
      ws.close();
    };
  }, [token]); // removido cwd e onExit das dependências para evitar recriar o terminal

  // Se a visibilidade mudar para true, recalcula o fit
  useEffect(() => {
    if (visible && fitAddonRef.current) {
      // O xterm precisa de um tempinho apos o CSS apply
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          const dims = fitAddonRef.current?.proposeDimensions();
          if (dims && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
          }
        } catch (e) {}
      }, 50);
    }
  }, [visible]);

  return (
    <>
      <style>{`
        .hide-xterm-scroll .xterm-viewport {
          overflow-y: hidden !important;
        }
      `}</style>
      <div 
        className="w-full h-full p-2 overflow-hidden hide-xterm-scroll" 
        ref={containerRef}
        style={{ display: visible ? 'block' : 'none' }}
      />
    </>
  );
});

export default XTermComponent;
