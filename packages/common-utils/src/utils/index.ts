/**
 * 无状态工具类
 * 直接导出函数而非对象
 */

// 通用工具函数
export { now, timestampFromDate, timestampToDate, timestampToISOString, nowWithTimezone, diffTimestamp, formatDuration } from './timestamp-utils.js';
export { ok, err, tryCatchAsyncWithSignal, all, any } from './result-utils.js';

// 简单的ID生成函数（仅用于common-utils内部）
export function generateId(): string {
  return crypto.randomUUID();
}

export * from './signal/index.js';