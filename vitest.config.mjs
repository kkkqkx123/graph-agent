/**
 * Vitest 配置文件 (ESM)
 * 适用于 monorepo 架构
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'node',

    // 测试文件匹配模式
    include: [
      '**/__tests__/**/*.ts',
      '**/?(*.)+(spec|test).ts'
    ],

    // 排除文件
    exclude: [
      'node_modules',
      'dist',
      'coverage',
      '**/*.d.ts'
    ],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'packages/*/src/**/*.ts',
        'sdk/*/src/**/*.ts'
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts'
      ],
      // 覆盖率阈值
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },

    // 测试超时时间
    testTimeout: 30000,

    // 详细输出
    reporters: ['verbose'],

    // 清除模拟
    clearMocks: true,
    restoreMocks: true,

    // 全局配置
    globals: true,

    // 别名配置
    alias: {
      '@modular-agent/common-utils': '/packages/common-utils/src',
      '@modular-agent/types': '/packages/types/src',
      '@modular-agent/tool-executors': '/packages/tool-executors/src',
      '@modular-agent/sdk': '/sdk/src'
    }
  }
});