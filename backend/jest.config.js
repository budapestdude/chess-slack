module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', 'testApp.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^winston$': '<rootDir>/src/__tests__/__mocks__/winston.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/database/**',
    '!src/**/__tests__/**',
    '!src/routes/**',
    '!src/types/**',
    '!src/services/socketService.ts',
    '!src/utils/logger.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 33,
      functions: 39,
      lines: 44,
      statements: 45,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 15000,
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};