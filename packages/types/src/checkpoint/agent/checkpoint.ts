/**
 * Agent Loop 检查点类型定义
 */

import type { ID, Timestamp } from '../../common.js';
import type { Message } from '../../message/index.js';
import type { IterationRecord } from '../../agent/records.js';
import { AgentLoopStatus } from '../../agent/status.js';
import type {
  CheckpointType,
  CheckpointMetadata,
} from '../base.js';
import type { AgentLoopStateSnapshot } from './snapshot.js';

/**
 * Agent Loop 增量数据结构
 */
export interface AgentLoopDelta {
  /** 新增的消息 */
  addedMessages?: Message[];

  /** 新增的迭代记录 */
  addedIterations?: IterationRecord[];

  /** 修改的变量 */
  modifiedVariables?: Map<string, any>;

  /** 状态变更 */
  statusChange?: {
    from: AgentLoopStatus;
    to: AgentLoopStatus;
  };

  /** 其他状态差异 */
  otherChanges?: Record<string, { from: any; to: any }>;
}

/**
 * Agent Loop 检查点
 */
export interface AgentLoopCheckpoint {
  /** 检查点 ID */
  id: ID;

  /** Agent Loop ID */
  agentLoopId: ID;

  /** 创建时间戳 */
  timestamp: Timestamp;

  /** 检查点类型 */
  type: CheckpointType;

  /** 基线检查点 ID（增量检查点需要） */
  baseCheckpointId?: ID;

  /** 前一检查点 ID（增量检查点需要） */
  previousCheckpointId?: ID;

  /** 增量数据（增量检查点使用） */
  delta?: AgentLoopDelta;

  /** 完整状态快照（完整检查点使用） */
  snapshot?: AgentLoopStateSnapshot;

  /** 检查点元数据 */
  metadata?: CheckpointMetadata;
}