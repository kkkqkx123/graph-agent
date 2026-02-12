/**
 * Jest 配置文件 (ESM)
 * 继承根目录配置，针对 common-utils 包进行调整
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  
  // 根目录指向项目根目录
  rootDir: rootDir,
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // 将 .ts 文件视为 ESM
  extensionsToTreatAsEsm: ['.ts'],
  
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
  
  // 模块名称映射 - 使用绝对路径
  moduleNameMapper: {
    '^@modular-agent/common-utils$': '<rootDir>/packages/common-utils/src',
    '^@modular-agent/types$': '<rootDir>/packages/types/src',
    '^@modular-agent/tool-executors$': '<rootDir>/packages/tool-executors/src',
    '^@modular-agent/sdk$': '<rootDir>/sdk/src'
  },
  
  // 忽略转换的模块
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@modular-agent/.*))'
  ],
  
  // 覆盖率配置
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/index.ts'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 测试超时时间
  testTimeout: 30000,
  
  // 详细输出
  verbose: true,
  
  // 清除模拟
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};