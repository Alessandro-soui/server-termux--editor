const express = require('express');
const os = require('os');
const http = require('http');
const { WebSocketServer } = require('ws');

const authMiddleware = require('./middleware/auth');
const requestLogger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const foldersRoutes = require('./routes/folders');
const filesRoutes = require('./routes/files');
const setupTerminalWebSocket = require('./routes/terminal');
const { PORT, HOST, ROOT_DIR, NETWORK_ACCESS, API_TOKEN } = require('./config/config');

const app = express();

// Log de todas as requisicoes (IP, metodo, rota, status, tamanho, tempo)
app.use(requestLogger);

app.use(express.json());

app.use(express.static('public'));

// Middleware de autenticacao aplicado a toda a API
app.use('/api', authMiddleware);

app.use('/api/folders', foldersRoutes);
app.use('/api/files', filesRoutes);

// Handler de erro padrao (sempre por ultimo)
app.use(errorHandler);

// Cria o servidor HTTP anexando o Express
const server = http.createServer(app);

// Inicializa o servidor WebSocket (sem rota específica atrelada inicialmente)
const wss = new WebSocketServer({ noServer: true });

// Configura os eventos e lógica do terminal
setupTerminalWebSocket(wss);

// Lida com o processo de Upgrade (HTTP -> WebSocket) e aplica autenticação
server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    
    // Verifica se a rota solicitada é a do terminal
    if (url.pathname === '/api/terminal') {
      const token = url.searchParams.get('token');
      
      // Valida o token recebido via query param
      if (token !== API_TOKEN) {
        console.log(`[WS] Bloqueado: Token inválido ou ausente em /api/terminal`);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // Se o token for válido, completa o upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  } catch (err) {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  const url = NETWORK_ACCESS ? `http://0.0.0.0:${PORT}` : `http://localhost:${PORT}`;
  console.log(`API rodando em ${url}`);
  console.log(`HOST: ${HOST} | rede local: ${NETWORK_ACCESS ? 'ATIVA' : 'desativada'}`);
  const nets = os.networkInterfaces();
  const localIps = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIps.push(net.address);
      }
    }
  }
  if (localIps.length === 0) {
    console.log('Acesso na rede local: nenhum IP detectado (sem Wi-Fi/dados ativo)');
  } else {
    for (const ip of localIps) {
      console.log(
        NETWORK_ACCESS
          ? `Acesso na rede local: http://${ip}:${PORT}`
          : `Acesso na rede local: http://${ip}:${PORT} (bloqueado — NETWORK_ACCESS=false)`
      );
    }
  }
  console.log(`ROOT_DIR: ${ROOT_DIR}`);
});
