// Test setup file
import { Pool } from 'pg';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/chessslack_test';

// Mock socket.io to prevent server startup
jest.mock('../index', () => ({
  io: {
    in: jest.fn().mockReturnValue({
      emit: jest.fn(),
      fetchSockets: jest.fn().mockResolvedValue([]),
    }),
    emit: jest.fn(),
  },
}));

// Increase timeout for integration tests
jest.setTimeout(15000);

// This file doesn't export any tests, just setup
describe('Setup', () => {
  it('should configure test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});