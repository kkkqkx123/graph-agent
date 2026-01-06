/**
 * Jest测试设置文件
 */

// 设置测试环境变量
process.env['NODE_ENV'] = 'test';

import 'reflect-metadata';

// 导出测试工具
export const testUtils = {
  /**
   * 创建模拟的实体ID
   */
  createEntityId: (value: string = 'test-id') => ({
    value,
  }),

  /**
   * 创建模拟的时间戳
   */
  createTimestamp: (createdAt: Date = new Date(), updatedAt: Date = new Date()) => ({
    createdAt,
    updatedAt,
  }),

  /**
   * 等待指定时间
   */
  sleep: (ms: number): Promise<void> =>
    new Promise(resolve => {
      // 使用简单的循环等待实现
      const start = Date.now();
      const check = () => {
        if (Date.now() - start >= ms) {
          resolve();
        } else {
          // 使用简单的循环等待
          while (Date.now() - start < ms) {
            // 空循环，让出控制权
          }
          resolve();
        }
      };
      check();
    }),

  /**
   * 创建模拟的配置
   */
  createMockConfig: (overrides: Record<string, any> = {}) => ({
    app: {
      name: 'test-app',
      version: '1.0.0',
      environment: 'test',
    },
    server: {
      port: 3000,
      host: 'localhost',
    },
    database: {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_password',
    },
    ...overrides,
  }),
};
