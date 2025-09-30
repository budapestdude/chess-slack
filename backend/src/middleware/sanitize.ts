import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

// XSS sanitization options
const xssOptions = {
  whiteList: {
    // Allow basic formatting
    b: [],
    i: [],
    em: [],
    strong: [],
    code: [],
    pre: [],
    br: [],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

// List of keys that should not be sanitized (tokens, UUIDs, etc.)
const skipSanitizationKeys = ['token', 'jwt', 'authorization'];

// Recursively sanitize object properties
const sanitizeObject = (obj: any, parentKey?: string): any => {
  if (typeof obj === 'string') {
    // Skip sanitization for sensitive keys like tokens
    if (parentKey && skipSanitizationKeys.includes(parentKey.toLowerCase())) {
      return obj;
    }
    return xss(obj, xssOptions);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, parentKey));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], key);
      }
    }
    return sanitized;
  }

  return obj;
};

// Middleware to sanitize request body, query, and params
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

export default sanitizeInput;