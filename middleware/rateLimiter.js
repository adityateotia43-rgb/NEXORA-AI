/**
 * Sliding Window In-Memory Rate Limiter (Zero-Dependency)
 * 
 * Protects endpoints from DDoS, excessive API consumption, and brute-force traffic.
 * Implements standard IETF RateLimit HTTP headers and automatic memory garbage collection.
 */

const { RateLimitError } = require('../utils/errors');

class RateLimiter {
  /**
   * @param {Object} options
   * @param {number} [options.maxRequests] - Maximum allowed requests in window
   * @param {number} [options.windowMs] - Window size in milliseconds
   */
  constructor({ maxRequests = 60, windowMs = 60000 } = {}) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.hits = new Map(); // ip -> Array of timestamps

    // Periodic cleanup of expired records every 60 seconds to prevent memory leaks
    this.cleanupTimer = setInterval(() => this.pruneExpired(), 60000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Extract reliable client IP address
   * @param {import('http').IncomingMessage} req
   * @returns {string}
   */
  getClientIp(req) {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const raw = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      const firstIp = raw.split(',')[0].trim();
      if (firstIp) return firstIp;
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      const raw = Array.isArray(realIp) ? realIp[0] : realIp;
      return raw.trim();
    }
    const rawIp = req.socket?.remoteAddress || '127.0.0.1';
    return rawIp.replace(/^::ffff:/, '');
  }

  /**
   * Check rate limit for the incoming request
   * @param {import('http').IncomingMessage} req
   * @param {import('http').ServerResponse} res
   * @throws {RateLimitError} if limit is exceeded
   * @returns {{ allowed: boolean, remaining: number, limit: number, resetSeconds: number }}
   */
  check(req, res) {
    const now = Date.now();
    const clientIp = this.getClientIp(req);
    const windowStart = now - this.windowMs;

    let timestamps = this.hits.get(clientIp) || [];
    // Keep only timestamps within current window
    timestamps = timestamps.filter(ts => ts > windowStart);

    const resetSeconds = Math.ceil(
      ((timestamps.length > 0 ? timestamps[0] : now) + this.windowMs - now) / 1000
    );

    if (timestamps.length >= this.maxRequests) {
      const retryAfterSeconds = Math.max(1, resetSeconds);
      if (res && !res.headersSent) {
        res.setHeader('RateLimit-Limit', String(this.maxRequests));
        res.setHeader('RateLimit-Remaining', '0');
        res.setHeader('RateLimit-Reset', String(resetSeconds));
        res.setHeader('Retry-After', String(retryAfterSeconds));
      }
      throw new RateLimitError(
        `Rate limit of ${this.maxRequests} requests per minute exceeded. Please wait ${retryAfterSeconds}s before retrying.`,
        retryAfterSeconds
      );
    }

    // Record this hit
    timestamps.push(now);
    this.hits.set(clientIp, timestamps);

    const remaining = Math.max(0, this.maxRequests - timestamps.length);

    if (res && !res.headersSent) {
      res.setHeader('RateLimit-Limit', String(this.maxRequests));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(resetSeconds));
    }

    return {
      allowed: true,
      remaining,
      limit: this.maxRequests,
      resetSeconds
    };
  }

  /**
   * Remove IPs whose timestamps are all expired
   */
  pruneExpired() {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    for (const [ip, timestamps] of this.hits.entries()) {
      const active = timestamps.filter(ts => ts > cutoff);
      if (active.length === 0) {
        this.hits.delete(ip);
      } else {
        this.hits.set(ip, active);
      }
    }
  }

  /**
   * Reset rate limiter records (useful for unit testing)
   */
  reset() {
    this.hits.clear();
  }
}

module.exports = RateLimiter;
