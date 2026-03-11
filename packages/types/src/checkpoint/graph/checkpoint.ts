/**
 * Graph 检查点类型定义
 */

import type { ID, Timestamp } from '../../common.js';
import type { ThreadStateSnapshot } from './snapshot.js';
import type { CheckpointMetadata } from './config.js';
import type { ThreadStatus } from '../../thread/index.js';
import type { NodeExecutionResult } from '../../thread/index.js';
import type { CheckpointType } from '../base.js';

/**
 * 增量数据结构
 */
export interface CheckpointDelta {
  /** 新增的消息 */
  addedMessages?: any[];
  /** 消息变更（索引 -> 新消息） */
  modifiedMessages?: Map<number, any>;
  /** 删除的消息索引 */
  deletedMessageIndices?: number[];
  /** 新增的变量 */
  addedVariables?: any[];
  /** 修改的变量 */
  modifiedVariables?: Map<string, any>;
  /** 新增的节点结果 */
  addedNodeResults?: Record<string, NodeExecutionResult>;
  /** 状态变更 */
  statusChange?: {
    from: ThreadStatus;
    to: ThreadStatus;
  };
  /** 当前节点变更 */
  currentNodeChange?: {
    from: ID;
    to: ID;
  };
  /** 其他状态差异 */
  otherChanges?: Record<string, { from: any; to: any }>;
}

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
  /** 检查点类型 */
  type?: CheckpointType;
  /** 基线检查点ID（增量检查点需要） */
  baseCheckpointId?: ID;
  /** 前一检查点ID（增量检查点需要） */
  previousCheckpointId?: ID;
  /** 增量数据（增量检查点使用） */
  delta?: CheckpointDelta;
  /** 线程状态快照（完整检查点使用，向后兼容） */
  threadState?: ThreadStateSnapshot;
  /** 检查点元数据 */
  metadata?: CheckpointMetadata;
}