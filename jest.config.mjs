/**
 * Jest 配置文件 (ESM)
 * 适用于 monorepo 架构
 */

export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',

  // 将 .ts 文件视为 ESM
  extensionsToTreatAsEsm: ['.ts'],

  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // 转换配置
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      }
    ]
  },

  // 模块名称映射 - 支持 workspace 协议
  moduleNameMapper: {
    // workspace 协议映射
    '^@modular-agent/common-utils$': '<rootDir>/packages/common-utils/src',
    '^@modular-agent/types$': '<rootDir>/packages/types/src',
    '^@modular-agent/tool-executors$': '<rootDir>/packages/tool-executors/src',

    // SDK 模块映射
    '^@modular-agent/sdk$': '<rootDir>/sdk/src',

    // 其他可能的路径别名
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // 忽略转换的模块 - 允许转换 workspace 依赖
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@modular-agent/.*))'
  ],

  // 覆盖率配置
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'sdk/*/src/**/*.ts',
    '!**/*.d.ts',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/index.ts'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // 测试超时时间
  testTimeout: 30000,

  // 详细输出
  verbose: true,

  // 清除模拟
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};