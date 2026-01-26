/**
 * CheckpointStorage 接口
 * 定义检查点存储的抽象接口
 */

import type { Checkpoint, CheckpointMetadata } from '../../../../types/checkpoint';
import type { ID, Timestamp } from '../../../../types/common';

/**
 * 检查点过滤器类型
 */
export interface CheckpointFilter {
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 标签数组 */
  tags?: string[];
  /** 开始时间 */
  startTime?: Timestamp;
  /** 结束时间 */
  endTime?: Timestamp;
}

/**
 * 检查点存储接口
 */
export interface CheckpointStorage {
  /**
   * 保存检查点
   * @param checkpoint 检查点对象
   */
  save(checkpoint: Checkpoint): Promise<void>;

  /**
   * 加载检查点
   * @param checkpointId 检查点ID
   * @returns 检查点对象，如果不存在则返回 null
   */
  load(checkpointId: string): Promise<Checkpoint | null>;

  /**
   * 查询检查点
   * @param filter 过滤条件
   * @returns 检查点数组
   */
  list(filter?: CheckpointFilter): Promise<Checkpoint[]>;

  /**
   * 删除检查点
   * @param checkpointId 检查点ID
   */
  delete(checkpointId: string): Promise<void>;

  /**
   * 检查检查点是否存在
   * @param checkpointId 检查点ID
   * @returns 是否存在
   */
  exists(checkpointId: string): Promise<boolean>;

  /**
   * 清空所有检查点
   */
  clear(): Promise<void>;
}