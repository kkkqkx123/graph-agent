/**
 * 消息标记映射类型定义
 * 定义消息标记映射的数据结构，用于跟踪消息的可见性和批次信息
 */

/**
 * 消息标记映射
 * 用于跟踪消息的可见性和批次边界
 *
 * 设计说明：
 * - 只存储原始索引和批次信息，不存储类型索引
 * - 类型索引通过计算得出，避免数据冗余
 * - 单一数据源，保证一致性
 */
export interface MessageMarkMap {
  /** 原始索引数组（记录所有消息的原始位置） */
  originalIndices: number[];
  /** 批次边界数组（每个批次的起始索引） */
  batchBoundaries: number[];
  /** 边界到批次的映射 */
  boundaryToBatch: number[];
  /** 当前批次索引 */
  currentBatch: number;
}