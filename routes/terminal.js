const { spawn } = require('droid-pty');
const { ROOT_DIR } = require('../config/config');
const { resolveSafePath } = require('../utils/pathUtils');

function setupTerminalWebSocket(wss) {
  wss.on('connection', (ws, request) => {
    let ptyProcess = null;

    try {
      // Extrai o cwd da URL
      const url = new URL(request.url, 'http://localhost');
      const cwdParam = url.searchParams.get('cwd') || '/';
      
      // Valida o cwd para garantir que está dentro do ROOT_DIR
      let safeCwd;
      try {
        safeCwd = resolveSafePath(cwdParam);
      } catch (err) {
        console.error('[Terminal] CWD inválido:', err.message);
        ws.close();
        return;
      }

      ptyProcess = spawn('bash', ['-l'], {
        cols: 80,
        rows: 24,
        cwd: safeCwd,
        env: process.env
      });

      console.log(`[Terminal] Sessão PTY iniciada (PID: ${ptyProcess.pid})`);

      // Envia saída do terminal para o cliente
      ptyProcess.onData((data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'output', data: data }));
        }
      });

      // Avisa o cliente quando encerrar
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`[Terminal] PTY PID: ${ptyProcess.pid} encerrado. (Código: ${exitCode}, Sinal: ${signal})`);
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'exit', code: exitCode, signal: signal }));
          ws.close();
        }
      });

    } catch (err) {
      console.error('[Terminal] Erro ao iniciar processo PTY:', err);
      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
      return;
    }

    // Lida com mensagens (input e resize) vindas do front-end
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message);
        
        if (msg.type === 'input' && typeof msg.data === 'string') {
          if (ptyProcess) {
            ptyProcess.write(msg.data);
          }
        } else if (msg.type === 'resize' && typeof msg.cols === 'number' && typeof msg.rows === 'number') {
          if (ptyProcess) {
            ptyProcess.resize(msg.cols, msg.rows);
          }
        }
      } catch (err) {
        console.error('[Terminal] Mensagem inválida via WS:', err);
      }
    });

    // Se o cliente fechar a aba/conexão, matamos o processo filho
    ws.on('close', () => {
      if (ptyProcess) {
        console.log(`[Terminal] Conexão WebSocket encerrada. Finalizando PTY (PID: ${ptyProcess.pid})...`);
        try {
          ptyProcess.kill();
        } catch (e) {
          // O processo pode já estar morto
        }
      }
    });
  });
}

module.exports = setupTerminalWebSocket;
