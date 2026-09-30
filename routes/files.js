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

// 2.1 Criar arquivo
router.post('/', async (req, res, next) => {
  try {
    const { path: parentPath, name, content = '' } = req.body || {};
    if (!name) throw fail('INVALID_PATH', 'Nome do arquivo e obrigatorio');

    const parentDir = resolveSafePath(parentPath || '/');
    const newFile = path.join(parentDir, name);

    if (newFile !== ROOT_DIR && !newFile.startsWith(ROOT_DIR + path.sep)) {
      throw fail('INVALID_PATH', 'Caminho fora do ROOT_DIR');
    }
    if (fssync.existsSync(newFile)) throw fail('ALREADY_EXISTS', 'Arquivo ja existe');

    await fs.writeFile(newFile, content, 'utf8');

    const newRelPath = path.posix.join(parentPath || '/', name);
    res.status(201).json({ success: true, data: { path: newRelPath } });
  } catch (err) {
    next(err);
  }
});

// 2.2 Ler conteudo de um arquivo
router.get('/', async (req, res, next) => {
  try {
    const relPath = req.query.path;
    if (!relPath) throw fail('INVALID_PATH', 'path e obrigatorio');

    const target = resolveSafePath(relPath);

    const stat = await fs.stat(target).catch(() => null);
    if (!stat) throw fail('NOT_FOUND', 'Arquivo nao encontrado');
    if (!stat.isFile()) throw fail('NOT_A_FILE', 'O caminho nao e um arquivo');

    const content = await fs.readFile(target, 'utf8');

    res.json({
      success: true,
      data: {
        path: relPath,
        content,
        size: stat.size,
        modified: stat.mtime.toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

// Pastas ignoradas na busca e limites para nao travar em arvores grandes.
const SEARCH_SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.cache',
  '.npm',
  '.gradle'
]);
const SEARCH_MAX_DEPTH = 8;
const SEARCH_MAX_RESULTS = 200;

// 2.6 Buscar arquivos recursivamente (quick open / Ctrl+P)
// Filtra por "query" (substring, sem diferenciar maiusculas) no caminho relativo.
// Sem "query" devolve os primeiros arquivos encontrados (ate o limite).
router.get('/search', async (req, res, next) => {
  try {
    const relPath = req.query.path || '/';
    const query = String(req.query.query || '').trim().toLowerCase();

    const root = resolveSafePath(relPath);
    const stat = await fs.stat(root).catch(() => null);
    if (!stat) throw fail('NOT_FOUND', 'Pasta nao encontrada');
    if (!stat.isDirectory()) throw fail('NOT_A_DIRECTORY', 'O caminho nao e uma pasta');

    const results = [];
    const queue = [
      { dir: root, rel: relPath === '/' ? '' : relPath.replace(/\/+$/, ''), depth: 0 }
    ];

    while (queue.length > 0 && results.length < SEARCH_MAX_RESULTS) {
      const { dir, rel, depth } = queue.shift();
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);

      for (const entry of entries) {
        if (results.length >= SEARCH_MAX_RESULTS) break;

        const childRel = rel ? `${rel}/${entry.name}` : `/${entry.name}`;

        if (entry.isDirectory()) {
          if (depth >= SEARCH_MAX_DEPTH) continue;
          if (entry.name.startsWith('.') || SEARCH_SKIP_DIRS.has(entry.name)) continue;
          queue.push({ dir: path.join(dir, entry.name), rel: childRel, depth: depth + 1 });
          continue;
        }

        if (!entry.isFile()) continue;
        if (query && !childRel.toLowerCase().includes(query)) continue;

        const entryStat = await fs.stat(path.join(dir, entry.name)).catch(() => null);
        results.push({
          path: childRel,
          name: entry.name,
          size: entryStat ? entryStat.size : 0,
          modified: entryStat ? entryStat.mtime.toISOString() : null
        });
      }
    }

    res.json({
      success: true,
      data: { path: relPath, results, truncated: results.length >= SEARCH_MAX_RESULTS }
    });
  } catch (err) {
    next(err);
  }
});

// 2.2.1 Conteudo bruto (binario), com o Content-Type do arquivo. Serve para
// o front abrir imagens (png, jpg, webp...) sem passar por base64.
const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

router.get('/raw', async (req, res, next) => {
  try {
    const relPath = req.query.path;
    if (!relPath) throw fail('INVALID_PATH', 'path e obrigatorio');

    const target = resolveSafePath(relPath);

    const stat = await fs.stat(target).catch(() => null);
    if (!stat) throw fail('NOT_FOUND', 'Arquivo nao encontrado');
    if (!stat.isFile()) throw fail('NOT_A_FILE', 'O caminho nao e um arquivo');

    const ext = path.extname(target).toLowerCase();
    res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Cache-Control', 'no-store');

    const stream = fssync.createReadStream(target);
    stream.on('error', (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

// 2.3 Salvar/atualizar conteudo (cria se nao existir, sobrescreve se existir)
router.put('/content', async (req, res, next) => {
  try {
    const { path: relPath, content } = req.body || {};
    if (!relPath || content === undefined) {
      throw fail('INVALID_PATH', 'path e content sao obrigatorios');
    }

    const target = resolveSafePath(relPath);

    await fs.writeFile(target, content, 'utf8');
    const stat = await fs.stat(target);

    res.json({ success: true, data: { path: relPath, size: stat.size } });
  } catch (err) {
    next(err);
  }
});

// 2.4 Renomear arquivo
router.patch('/rename', async (req, res, next) => {
  try {
    const { path: relPath, newName } = req.body || {};
    if (!relPath || !newName) throw fail('INVALID_PATH', 'path e newName sao obrigatorios');

    const oldFile = resolveSafePath(relPath);
    const newFile = path.join(path.dirname(oldFile), newName);

    if (!fssync.existsSync(oldFile)) throw fail('NOT_FOUND', 'Arquivo nao encontrado');
    if (fssync.existsSync(newFile)) throw fail('ALREADY_EXISTS', 'Ja existe um arquivo com esse nome');

    await fs.rename(oldFile, newFile);

    const parentRel = path.posix.dirname(relPath);
    const newRelPath = path.posix.join(parentRel, newName);

    res.json({ success: true, data: { oldPath: relPath, newPath: newRelPath } });
  } catch (err) {
    next(err);
  }
});

// 2.5 Deletar arquivo
router.delete('/', async (req, res, next) => {
  try {
    const relPath = req.query.path;
    if (!relPath) throw fail('INVALID_PATH', 'path e obrigatorio');

    const target = resolveSafePath(relPath);

    const stat = await fs.stat(target).catch(() => null);
    if (!stat) throw fail('NOT_FOUND', 'Arquivo nao encontrado');
    if (!stat.isFile()) throw fail('NOT_A_FILE', 'O caminho nao e um arquivo');

    await fs.unlink(target);

    res.json({ success: true, data: { deleted: relPath } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
