import rateLimit from 'express-rate-limit';

// Disable rate limiting in test environment
const isTest = process.env.NODE_ENV === 'test';

// Strict rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 5, // Disable in tests
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest, // Skip rate limiting in test environment
});

// Moderate rate limiting for message sending
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTest ? 1000 : 30, // Disable in tests
  message: 'Too many messages, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: () => isTest,
});

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 100, // Disable in tests
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

// File upload rate limiting
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 1000 : 20, // Disable in tests
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

// Search rate limiting
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTest ? 1000 : 20, // Disable in tests
  message: 'Too many search requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});