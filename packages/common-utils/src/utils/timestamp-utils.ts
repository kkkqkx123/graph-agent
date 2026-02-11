/**
 * 时间戳工具函数
 * 提供时间戳的创建、转换和格式化功能
 */

import type { Timestamp } from '@modular-agent/types/common';

/**
 * 创建当前时间戳
 */
export function now(): Timestamp {
  return Date.now();
}

/**
 * 从Date创建时间戳
 */
export function timestampFromDate(date: Date): Timestamp {
  return date.getTime();
}

/**
 * 转换为Date对象
 */
export function timestampToDate(timestamp: Timestamp): Date {
  return new Date(timestamp);
}

/**
 * 转换为ISO字符串
 */
export function timestampToISOString(timestamp: Timestamp): string {
  return new Date(timestamp).toISOString();
}

/**
 * 创建带时区信息的时间戳
 * @returns 包含时间戳和时区信息的对象
 */
export function nowWithTimezone(): { timestamp: Timestamp; timezone: string } {
  return {
    timestamp: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

/**
 * 计算时间差（毫秒）
 * @param start 开始时间戳
 * @param end 结束时间戳
 * @returns 时间差（毫秒）
 */
export function diffTimestamp(start: Timestamp, end: Timestamp): number {
  return end - start;
}

/**
 * 格式化持续时间
 * @param ms 持续时间（毫秒）
 * @returns 格式化的持续时间字符串
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}min`;
  return `${(ms / 3600000).toFixed(2)}h`;
}