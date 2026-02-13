/**
 * 消息数组管理器接口
 * 定义消息数组管理的核心接口
 */

import type {
  Message,
  MessageArrayState,
  MessageOperationConfig,
  MessageOperationResult,
  MessageArrayStats,
  BatchSnapshot
} from '@modular-agent/types';

/**
 * 消息数组管理器接口
 */
export interface MessageArrayManager {
  /**
   * 执行消息操作
   * @param operation 操作配置
   * @returns 操作结果
   */
  execute(operation: MessageOperationConfig): MessageOperationResult;
  
  /**
   * 获取当前消息数组状态
   * @returns 消息数组状态
   */
  getState(): MessageArrayState;
  
  /**
   * 获取当前批次的消息
   * @returns 当前批次的消息数组
   */
  getCurrentMessages(): Message[];
  
  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): MessageArrayStats;
  
  /**
   * 回退到指定批次
   * @param batchIndex 批次索引
   * @returns 操作结果
   */
  rollback(batchIndex: number): MessageOperationResult;
  
  /**
   * 获取批次快照
   * @param batchIndex 批次索引
   * @returns 批次快照
   */
  getBatchSnapshot(batchIndex: number): BatchSnapshot | null;
}