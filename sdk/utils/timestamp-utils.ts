/**
 * 时间戳工具函数
 * 提供时间戳的创建、转换和格式化功能
 */

import type { Timestamp } from '../types/common';

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