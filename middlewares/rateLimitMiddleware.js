// rateLimitMiddleware.js
import rateLimit from 'express-rate-limit';

// Create the underlying limiter with the desired options.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: 'Too many requests, please try again later' },
});

export const apiLimiter = (req, res, next) => {
  // If DISABLE_RATE_LIMIT is true, bypass all rate limiting.
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return next();
  }

  const url = req.originalUrl;

  // Always exclude these endpoints from rate limiting.
  if (
    url.startsWith('/api/rfid/valid-cards') ||
    url.startsWith('/auto-deactivate-expired')
  ) {
    return next();
  }

  // In testing mode, bypass rate limiting for /api/rfid/verify.
  if (process.env.NODE_ENV === 'testing' && url.startsWith('/api/rfid/verify')) {
    return next();
  }

  // Otherwise, apply the rate limiter.
  return globalLimiter(req, res, next);
};
