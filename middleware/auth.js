const { API_TOKEN } = require('../config/config');

function authMiddleware(req, res, next) {
  const headerToken = req.headers['x-api-token'];

  if (!headerToken || headerToken !== API_TOKEN) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token ausente ou invalido'
      }
    });
  }

  next();
}

module.exports = authMiddleware;
