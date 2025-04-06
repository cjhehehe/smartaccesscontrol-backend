// rateLimitMiddleware.js
import rateLimit from 'express-rate-limit';

// Create the underlying limiter with the desired options.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: 'Too many requests, please try again later' },
});

// Custom middleware that conditionally skips rate limiting for specified endpoints.
// - Always skips for /api/rfid/valid-cards and /auto-deactivate-expired.
// - In testing mode (NODE_ENV === 'testing'), bypass rate limiting for /api/rfid/verify.
export const apiLimiter = (req, res, next) => {
  const url = req.originalUrl;

  // Endpoints that are always excluded from rate limiting.
  if (url.startsWith('/api/rfid/valid-cards') || url.startsWith('/auto-deactivate-expired')) {
    return next();
  }

  // Bypass rate limiting for /api/rfid/verify only in testing mode.
  if (process.env.NODE_ENV === 'testing' && url.startsWith('/api/rfid/verify')) {
    return next();
  }

  // Apply rate limiting for all other routes.
  return limiter(req, res, next);
};
