/**
 * 日志模块主入口
 * 基于pino设计思想的流式日志系统
 * 统一导出日志系统的所有公共API
 */

// 类型定义
export type {
  Logger,
  LogLevel,
  LoggerContext,
  LoggerOptions,
  PackageLoggerOptions,
  LogStream,
  LogEntry,
  StreamOptions,
  MultistreamOptions,
  StreamEntry
} from './types.js';
export { LOG_LEVEL_PRIORITY } from './types.js';

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
} from './logger.js';

// Stream实现
export {
  ConsoleStream,
  createConsoleStream,
  FileStream,
  createFileStream,
  AsyncStream,
  createAsyncStream,
  Multistream,
  createMultistream
} from './streams/index.js';

// Transport实现
export {
  destination,
  transport
} from './transports/index.js';
export type {
  Destination,
  TransportOptions,
  MultiTransportOptions
} from './transports/index.js';

// 工具函数
export {
  shouldLog,
  formatTimestamp,
  mergeContext,
  createLogEntry
} from './utils.js';