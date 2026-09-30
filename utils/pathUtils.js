const path = require('path');
const { ROOT_DIR } = require('../config/config');

/**
 * Resolve um caminho relativo (vindo da request) para um caminho absoluto
 * dentro do ROOT_DIR (home do Termux), bloqueando qualquer tentativa de
 * sair da area permitida (ex: ../../etc).
 */
function resolveSafePath(relativePath = '/') {
  const normalized = path.normalize('/' + (relativePath || '/'));
  const target = path.resolve(ROOT_DIR, '.' + normalized);

  if (target !== ROOT_DIR && !target.startsWith(ROOT_DIR + path.sep)) {
    const err = new Error('Caminho fora do ROOT_DIR');
    err.code = 'INVALID_PATH';
    throw err;
  }

  return target;
}

module.exports = { resolveSafePath, ROOT_DIR };
