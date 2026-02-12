/**
 * 日志模块主入口
 * 基于pino设计思想的轻量级日志系统
 * 统一导出日志系统的所有公共API
 */

// 类型定义
export type { 
  Logger, 
  LogLevel, 
  LoggerContext, 
  LoggerOptions, 
  PackageLoggerOptions,
  LogOutput 
} from './types';
export { LOG_LEVEL_PRIORITY } from './types';

// 核心实现
export {
  createLogger,
  createPackageLogger,
  createConsoleLogger,
  createNoopLogger,
  setGlobalLogger,
  getGlobalLogger,
  setGlobalLogLevel,
  getGlobalLogLevel
} from './logger';

// 工具函数
export {
  shouldLog,
  formatTimestamp,
  createConsoleOutput,
  createAsyncOutput,
  mergeContext,
  formatContext
} from './utils';