const express = require('express');
const fs = require('fs/promises');
const fssync = require('fs');
const path = require('path');
const router = express.Router();
const { resolveSafePath, ROOT_DIR } = require('../utils/pathUtils');

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

// 1.1 Listar conteudo de uma pasta
// Sem "path" (ou path=/) lista os itens diretos da home do Termux, sem recursao.
router.get('/', async (req, res, next) => {
  try {
    const relPath = req.query.path || '/';
    const target = resolveSafePath(relPath);

    const stat = await fs.stat(target).catch(() => null);
    if (!stat) throw fail('NOT_FOUND', 'Pasta nao encontrada');
    if (!stat.isDirectory()) throw fail('NOT_A_DIRECTORY', 'O caminho nao e uma pasta');

    const entries = await fs.readdir(target, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(target, entry.name);
        const entryStat = await fs.stat(fullPath);
        const isDir = entry.isDirectory();

        return {
          name: entry.name,
          type: isDir ? 'folder' : 'file',
          ...(isDir ? {} : { size: entryStat.size }),
          modified: entryStat.mtime.toISOString()
        };
      })
    );

    items.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'folder' ? -1 : 1;
    });

    res.json({ success: true, data: { path: relPath, items } });
  } catch (err) {
    next(err);
  }
});

// 1.2 Criar nova pasta
router.post('/', async (req, res, next) => {
  try {
    const { path: parentPath, name } = req.body || {};
    if (!name) throw fail('INVALID_PATH', 'Nome da pasta e obrigatorio');

    const parentDir = resolveSafePath(parentPath || '/');
    const newDir = path.join(parentDir, name);

    if (newDir !== ROOT_DIR && !newDir.startsWith(ROOT_DIR + path.sep)) {
      throw fail('INVALID_PATH', 'Caminho fora do ROOT_DIR');
    }
    if (fssync.existsSync(newDir)) throw fail('ALREADY_EXISTS', 'Pasta ja existe');

    await fs.mkdir(newDir);

    const newRelPath = path.posix.join(parentPath || '/', name);
    res.status(201).json({ success: true, data: { path: newRelPath } });
  } catch (err) {
    next(err);
  }
});

// 1.3 Renomear pasta
router.patch('/rename', async (req, res, next) => {
  try {
    const { path: relPath, newName } = req.body || {};
    if (!relPath || !newName) throw fail('INVALID_PATH', 'path e newName sao obrigatorios');

    const oldDir = resolveSafePath(relPath);
    const newDir = path.join(path.dirname(oldDir), newName);

    if (!fssync.existsSync(oldDir)) throw fail('NOT_FOUND', 'Pasta nao encontrada');
    if (fssync.existsSync(newDir)) throw fail('ALREADY_EXISTS', 'Ja existe uma pasta com esse nome');

    await fs.rename(oldDir, newDir);

    const parentRel = path.posix.dirname(relPath);
    const newRelPath = path.posix.join(parentRel, newName);

    res.json({ success: true, data: { oldPath: relPath, newPath: newRelPath } });
  } catch (err) {
    next(err);
  }
});

// 1.4 Deletar pasta
router.delete('/', async (req, res, next) => {
  try {
    const relPath = req.query.path;
    const recursive = req.query.recursive === 'true';

    if (!relPath) throw fail('INVALID_PATH', 'path e obrigatorio');

    const target = resolveSafePath(relPath);

    const stat = await fs.stat(target).catch(() => null);
    if (!stat) throw fail('NOT_FOUND', 'Pasta nao encontrada');
    if (!stat.isDirectory()) throw fail('NOT_A_DIRECTORY', 'O caminho nao e uma pasta');

    await fs.rm(target, { recursive, force: false });

    res.json({ success: true, data: { deleted: relPath } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
