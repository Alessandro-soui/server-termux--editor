import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useSettings } from '../context/SettingsContext';

interface XTermComponentProps {
  visible: boolean;
  onExit: () => void;
}

export interface XTermRef {
  sendData: (data: string) => void;
}

const XTermComponent = forwardRef<XTermRef, XTermComponentProps>(({ visible, onExit }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { token } = useSettings();

  useImperativeHandle(ref, () => ({
    sendData: (data: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }));
      }
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'monospace',
      fontSize: 13,
      theme: {
        background: '#1e1e1e', // vscode-like background
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
    
    if (apiBaseUrl) {
      const url = new URL(apiBaseUrl, window.location.origin);
      wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/api/terminal?token=${token}`;
    } else {
      wsUrl = `${protocol}//${window.location.host}/api/terminal?token=${token}`;
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
          onExit();
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
      if (visible) {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      ws.close();
    };
  }, [token, onExit]);

  // Se a visibilidade mudar para true, recalcula o fit
  useEffect(() => {
    if (visible && fitAddonRef.current) {
      // O xterm precisa de um tempinho apos o CSS apply
      setTimeout(() => {
        fitAddonRef.current?.fit();
        const dims = fitAddonRef.current?.proposeDimensions();
        if (dims && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      }, 50);
    }
  }, [visible]);

  return (
    <div 
      className="w-full h-full p-2 overflow-hidden" 
      ref={containerRef}
      style={{ display: visible ? 'block' : 'none' }}
    />
  );
});

export default XTermComponent;
