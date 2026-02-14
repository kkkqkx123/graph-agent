/**
 * 检查点类型定义
 */

import type { ID, Timestamp, Metadata } from '../common';
import type { ThreadStateSnapshot } from './snapshot';
import type { CheckpointMetadata } from './config';

/**
 * 检查点类型
 */
export interface Checkpoint {
  /** 检查点唯一标识符 */
  id: ID;
  /** 关联的线程ID */
  threadId: ID;
  /** 关联的工作流ID */
  workflowId: ID;
  /** 创建时间戳 */
  timestamp: Timestamp;
  /** 线程状态快照 */
  threadState: ThreadStateSnapshot;
  /** 检查点元数据 */
  metadata?: CheckpointMetadata;
}