/**
 * Custom Application Error Classes and Standardized Error Handler
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class RateLimitError extends AppError {
  constructor(message, retryAfterSeconds = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfterSeconds });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

class PayloadTooLargeError extends AppError {
  constructor(message = 'Request payload exceeds maximum allowed size') {
    super(message, 413, 'PAYLOAD_TOO_LARGE');
  }
}

class TimeoutError extends AppError {
  constructor(message = 'Request timed out waiting for AI provider response') {
    super(message, 504, 'TIMEOUT_ERROR');
  }
}

class ProviderError extends AppError {
  constructor(message, providerId = 'unknown', details = null) {
    super(message, 502, 'PROVIDER_ERROR', { providerId, ...details });
    this.providerId = providerId;
  }
}

/**
 * Send standardized JSON or SSE error responses
 * @param {import('http').ServerResponse} res
 * @param {any} err
 * @param {Object} [config]
 */
function sendErrorResponse(res, err, config = {}) {
  const isDev = config.nodeEnv === 'development';
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const code = err.code || 'INTERNAL_ERROR';

  const errorPayload = {
    error: err.name || 'Error',
    code,
    message: err.message || 'An unexpected error occurred',
    statusCode,
    timestamp: new Date().toISOString(),
    ...(err.details ? { details: err.details } : {}),
    ...(isDev && err.stack ? { stack: err.stack } : {})
  };

  if (res.headersSent) {
    // If SSE streaming already commenced, emit a structured SSE error event
    try {
      res.write(`data: ${JSON.stringify({ 
        done: true, 
        error: errorPayload.message, 
        code: errorPayload.code,
        statusCode 
      })}\n\n`);
      res.end();
    } catch (e) {
      // socket might be closed already
    }
    return;
  }

  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (err.retryAfterSeconds) {
    res.setHeader('Retry-After', String(err.retryAfterSeconds));
  }
  res.end(JSON.stringify(errorPayload, null, 2));
}

module.exports = {
  AppError,
  ValidationError,
  RateLimitError,
  PayloadTooLargeError,
  TimeoutError,
  ProviderError,
  sendErrorResponse
};
