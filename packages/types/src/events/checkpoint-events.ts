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