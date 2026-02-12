/**
 * 日志模块主入口
 * 统一导出日志系统的所有公共API
 */

// 类型定义
export type { Logger, LogLevel, LoggerOptions, LogOutput } from './types';
export { LOG_LEVEL_PRIORITY, shouldLog } from './types';

// 核心实现
export {
  createLogger,
  createConsoleLogger,
  createNoopLogger,
  setGlobalLogger,
  getGlobalLogger,
  setGlobalLogLevel,
  getGlobalLogLevel
} from './logger';

// 工具函数
export { formatLogMessage, mergeContext, formatContext, createConsoleOutput } from './utils';