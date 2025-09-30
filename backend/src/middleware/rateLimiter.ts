import rateLimit from 'express-rate-limit';

// Disable rate limiting in test and development environments
const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV; // Default to dev if not set

// Strict rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (isTest || isDev) ? 1000 : 5, // Relaxed in dev/test, strict in production
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => (isTest || isDev), // Skip rate limiting in test/dev environments
});

// Moderate rate limiting for message sending
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (isTest || isDev) ? 1000 : 30, // Relaxed in dev/test, strict in production
  message: 'Too many messages, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: () => (isTest || isDev),
});

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (isTest || isDev) ? 1000 : 100, // Relaxed in dev/test, strict in production
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => (isTest || isDev),
});

// File upload rate limiting
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (isTest || isDev) ? 1000 : 20, // Relaxed in dev/test, strict in production
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => (isTest || isDev),
});

// Search rate limiting
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (isTest || isDev) ? 1000 : 20, // Relaxed in dev/test, strict in production
  message: 'Too many search requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => (isTest || isDev),
});