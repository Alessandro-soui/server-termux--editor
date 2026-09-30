function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) {
    const first = fwd.split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || (req.socket && req.socket.remoteAddress) || 'desconhecido';
}

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const ip = clientIp(req);
  const startedAt = new Date().toISOString();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const size = res.getHeader('content-length') || res.bytesWritten || 0;
    console.log(
      `${startedAt} | ${ip} | ${req.method} ${req.originalUrl} | ${res.statusCode} | ${size}B | ${ms.toFixed(1)}ms`
    );
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(
        `${startedAt} | ${ip} | ${req.method} ${req.originalUrl} | Conexao encerrada antes da resposta | ${ms.toFixed(1)}ms`
      );
    }
  });

  next();
}

module.exports = requestLogger;
module.exports.clientIp = clientIp;
