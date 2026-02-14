/**
 * 消息标记映射类型定义
 * 定义消息标记映射的数据结构，用于跟踪消息的可见性和批次信息
 */

import type { MessageRole } from './message';

/**
 * 消息标记映射
 * 用于跟踪消息的可见性、类型索引和批次边界
 */
export interface MessageMarkMap {
  /** 原始索引数组（记录所有消息的原始位置） */
  originalIndices: number[];
  /** 按类型分组的索引映射 */
  typeIndices: Record<MessageRole, number[]>;
  /** 批次边界数组（每个批次的起始索引） */
  batchBoundaries: number[];
  /** 边界到批次的映射 */
  boundaryToBatch: number[];
  /** 当前批次索引 */
  currentBatch: number;
}