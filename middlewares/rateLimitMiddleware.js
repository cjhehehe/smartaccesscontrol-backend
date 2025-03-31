import rateLimit from 'express-rate-limit';

// Create the underlying limiter with the desired options.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: 'Too many requests, please try again later' },
});

// Custom middleware that skips rate limiting for specified endpoints.
export const apiLimiter = (req, res, next) => {
  const url = req.originalUrl;
  if (
    url.startsWith('/api/rfid/valid-cards') ||
    url.startsWith('/auto-deactivate-expired')
  ) {
    return next(); // Skip rate limiting for these endpoints.
  }
  return limiter(req, res, next); // Apply rate limiting for all other routes.
};
