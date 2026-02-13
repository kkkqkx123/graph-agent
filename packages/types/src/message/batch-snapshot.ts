/**
 * 批次快照类型定义
 * 定义批次快照的数据结构，用于存储历史状态
 */

import type { Message } from './message';

/**
 * 批次快照
 * 存储批次创建时的完整消息数组状态
 */
export interface BatchSnapshot {
  /** 批次索引 */
  batchIndex: number;
  /** 批次创建时间戳 */
  timestamp: number;
  /** 批次消息数组的深拷贝（如果为空数组表示无额外拷贝开销） */
  messages: Message[];
  /** 批次消息数量 */
  messageCount: number;
  /** 批次描述 */
  description?: string;
}

/**
 * 批次快照数组
 */
export type BatchSnapshotArray = BatchSnapshot[];