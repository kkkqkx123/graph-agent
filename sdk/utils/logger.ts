/**
 * SDK日志器工具
 * 提供统一的日志记录接口
 *
 * 设计原则：
 * - 使用 SDK 全局实例管理器获取日志器
 * - 提供统一的日志配置
 */

import { createPackageLogger } from '@modular-agent/common-utils';

/**
 * SDK包级别日志器
 * 用于记录SDK级别的日志信息
 */
export const logger = createPackageLogger('sdk', {
  level: (process.env['SDK_LOG_LEVEL'] as any) || 'info',
  json: process.env['NODE_ENV'] === 'production'
});
