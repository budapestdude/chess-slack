// Mock winston logger for tests
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  add: jest.fn(),
};

export default {
  createLogger: jest.fn(() => mockLogger),
  format: {
    combine: jest.fn(() => ({})),
    timestamp: jest.fn(() => ({})),
    errors: jest.fn(() => ({})),
    splat: jest.fn(() => ({})),
    json: jest.fn(() => ({})),
    simple: jest.fn(() => ({})),
    colorize: jest.fn(() => ({})),
    printf: jest.fn(() => ({})),
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn(),
  },
};