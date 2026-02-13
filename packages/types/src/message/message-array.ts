/**
 * 消息数组类型定义
 * 定义消息数组的状态和统计信息
 */

import type { Message } from './message';
import type { BatchSnapshot } from './batch-snapshot';

/**
 * 消息数组状态
 */
export interface MessageArrayState {
  /** 完整的消息数组（包含所有批次） */
  messages: Message[];
  /** 批次快照数组 */
  batchSnapshots: BatchSnapshot[];
  /** 当前批次索引 */
  currentBatchIndex: number;
  /** 消息总数 */
  totalMessageCount: number;
}

/**
 * 消息数组统计信息
 */
export interface MessageArrayStats {
  /** 总消息数 */
  totalMessages: number;
  /** 当前批次消息数 */
  currentBatchMessages: number;
  /** 批次总数 */
  totalBatches: number;
  /** 当前批次索引 */
  currentBatchIndex: number;
}