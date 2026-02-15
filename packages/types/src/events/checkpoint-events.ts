/**
 * 检查点相关事件类型定义
 */

import type { ID } from '../common';
import type { BaseEvent, EventType } from './base';

/**
 * 检查点创建事件类型
 */
export interface CheckpointCreatedEvent extends BaseEvent {
  type: EventType.CHECKPOINT_CREATED;
  /** 检查点ID */
  checkpointId: ID;
  /** 检查点描述 */
  description?: string;
}

/**
 * 检查点恢复事件类型
 */
export interface CheckpointRestoredEvent extends BaseEvent {
  type: EventType.CHECKPOINT_RESTORED;
  /** 检查点ID */
  checkpointId: ID;
  /** 恢复的线程ID */
  threadId: ID;
  /** 检查点描述 */
  description?: string;
}

/**
 * 检查点删除事件类型
 */
export interface CheckpointDeletedEvent extends BaseEvent {
  type: EventType.CHECKPOINT_DELETED;
  /** 检查点ID */
  checkpointId: ID;
  /** 删除原因 */
  reason?: 'manual' | 'cleanup' | 'policy';
}

/**
 * 检查点失败事件类型
 */
export interface CheckpointFailedEvent extends BaseEvent {
  type: EventType.CHECKPOINT_FAILED;
  /** 检查点ID（如果已生成） */
  checkpointId?: ID;
  /** 失败的操作类型 */
  operation: 'create' | 'restore' | 'delete';
  /** 错误信息 */
  error: string;
}