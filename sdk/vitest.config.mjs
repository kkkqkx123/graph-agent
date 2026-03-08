/**
 * Vitest 配置文件 (ESM)
 * 适用于 SDK 模块
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

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
        'core/**/*.ts',
        'api/**/*.ts',
        'utils/**/*.ts'
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts'
      ]
    },

    // 测试超时时间
    testTimeout: 30000,

    // 详细输出
    reporters: ['verbose'],

    // 清除模拟
    clearMocks: true,
    restoreMocks: true,

    // 全局配置
    globals: true
  },

  // 解析配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@utils': path.resolve(__dirname, 'utils'),
      '@core': path.resolve(__dirname, 'core'),
      '@api': path.resolve(__dirname, 'api'),
      '@modular-agent/types': path.resolve(__dirname, '../packages/types/src'),
      '@modular-agent/types/(.*)': path.resolve(__dirname, '../packages/types/src/$1'),
      '@modular-agent/common-utils': path.resolve(__dirname, '../packages/common-utils/src'),
      '@modular-agent/common-utils/id-utils': path.resolve(__dirname, '../packages/common-utils/src/utils/id-utils'),
      '@modular-agent/common-utils/timestamp-utils': path.resolve(__dirname, '../packages/common-utils/src/utils/timestamp-utils'),
      '@modular-agent/common-utils/result-utils': path.resolve(__dirname, '../packages/common-utils/src/utils/result-utils'),
      '@modular-agent/common-utils/token-encoder': path.resolve(__dirname, '../packages/common-utils/src/utils/token-encoder'),
      '@modular-agent/common-utils/(.*)': path.resolve(__dirname, '../packages/common-utils/src/$1'),
      '@modular-agent/tool-executors': path.resolve(__dirname, '../packages/tool-executors/src'),
      '@modular-agent/tool-executors/(.*)': path.resolve(__dirname, '../packages/tool-executors/src/$1')
    }
  }
});
