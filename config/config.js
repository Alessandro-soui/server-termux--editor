require('dotenv').config();
const os = require('os');

// NETWORK_ACCESS=true  -> escuta em 0.0.0.0 (acessivel na rede local / Wi-Fi)
// NETWORK_ACCESS=false -> escuta em 127.0.0.1 (somente o proprio dispositivo)
const NETWORK_ACCESS = /^(true|1|yes|on)$/i.test(
  (process.env.NETWORK_ACCESS || '').trim()
);

const HOST = NETWORK_ACCESS ? '0.0.0.0' : '127.0.0.1';

module.exports = {
  // ROOT_DIR sempre a home do Termux, nunca fixo
  ROOT_DIR: process.env.HOME || os.homedir(),
  PORT: process.env.PORT || 3000,
  HOST,
  NETWORK_ACCESS,
  API_TOKEN: process.env.API_TOKEN || 'troque-por-um-token-forte-aqui'
};
