const STATUS_BY_CODE = {
  INVALID_PATH: 400,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  NOT_A_DIRECTORY: 400,
  NOT_A_FILE: 400,
  PERMISSION_DENIED: 403,
  UNAUTHORIZED: 401,
  INTERNAL_ERROR: 500
};

function errorHandler(err, req, res, next) {
  const code = err.code && STATUS_BY_CODE[err.code] ? err.code : 'INTERNAL_ERROR';
  const status = STATUS_BY_CODE[code];

  res.status(status).json({
    success: false,
    error: {
      code,
      message: err.message || 'Erro interno'
    }
  });
}

module.exports = errorHandler;
