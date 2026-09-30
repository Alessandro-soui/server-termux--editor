const express = require('express');
const os = require('os');

const authMiddleware = require('./middleware/auth');
const requestLogger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const foldersRoutes = require('./routes/folders');
const filesRoutes = require('./routes/files');
const { PORT, HOST, ROOT_DIR, NETWORK_ACCESS } = require('./config/config');

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

app.listen(PORT, HOST, () => {
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
