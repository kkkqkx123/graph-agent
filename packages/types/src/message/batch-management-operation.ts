/**
 * 批次管理操作类型定义
 * 定义批次管理相关的操作配置
 */

import type { MessageOperationConfig } from './message-operations';

/**
 * 批次管理操作类型
 */
export type BatchManagementOperationType = 
  | 'START_NEW_BATCH'    // 开始新批次
  | 'ROLLBACK_TO_BATCH'; // 回退到指定批次

/**
 * 批次管理操作配置
 */
export interface BatchManagementOperation extends MessageOperationConfig {
  operation: 'BATCH_MANAGEMENT';
  /** 批次管理操作类型 */
  batchOperation: BatchManagementOperationType;
  /** 目标批次索引（用于 ROLLBACK_TO_BATCH） */
  targetBatch?: number;
  /** 边界索引（用于 START_NEW_BATCH） */
  boundaryIndex?: number;
}