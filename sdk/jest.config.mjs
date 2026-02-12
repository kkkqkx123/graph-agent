export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      useESM: true
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@modular-agent)/)'
  ],
  collectCoverageFrom: [
    'core/**/*.ts',
    '!core/**/*.d.ts',
    '!core/**/*.test.ts',
    '!core/**/*.spec.ts',
    '!core/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@modular-agent/types$': '<rootDir>/../packages/types/src',
    '^@modular-agent/types/(.*)$': '<rootDir>/../packages/types/src/$1',
    '^@modular-agent/common-utils$': '<rootDir>/../packages/common-utils/src',
    '^@modular-agent/common-utils/id-utils$': '<rootDir>/../packages/common-utils/src/utils/id-utils',
    '^@modular-agent/common-utils/timestamp-utils$': '<rootDir>/../packages/common-utils/src/utils/timestamp-utils',
    '^@modular-agent/common-utils/result-utils$': '<rootDir>/../packages/common-utils/src/utils/result-utils',
    '^@modular-agent/common-utils/token-encoder$': '<rootDir>/../packages/common-utils/src/utils/token-encoder',
    '^@modular-agent/common-utils/(.*)$': '<rootDir>/../packages/common-utils/src/$1',
  },
  testTimeout: 30000,
  verbose: true
};