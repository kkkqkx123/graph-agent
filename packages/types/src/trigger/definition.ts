/**
 * 触发器定义类型
 */

import type { ID, Timestamp, Metadata } from '../common';
import { EventType } from '../events';
import type { TriggerType, TriggerStatus } from './state';
import type { TriggerCondition, TriggerAction } from './config';

/**
 * 触发器定义接口
 */
export interface Trigger {
  /** 触发器唯一标识符 */
  id: ID;
  /** 触发器名称 */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 触发器类型 */
  type: TriggerType;
  /** 触发条件 */
  condition: TriggerCondition;
  /** 触发动作 */
  action: TriggerAction;
  /** 触发器状态 */
  status: TriggerStatus;
  /** 关联的工作流 ID（可选） */
  workflowId?: ID;
  /** 关联的线程 ID（可选） */
  threadId?: ID;
  /** 触发次数限制（0 表示无限制） */
  maxTriggers?: number;
  /** 已触发次数 */
  triggerCount: number;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 触发器元数据 */
  metadata?: Metadata;
  /** 触发时是否创建检查点（新增） */
  createCheckpoint?: boolean;
  /** 检查点描述（新增） */
  checkpointDescription?: string;
}

/**
 * Workflow触发器定义
 * 在workflow定义阶段声明，用于静态检查和类型安全
 */
export interface WorkflowTrigger {
  /** 触发器唯一标识符 */
  id: ID;
  /** 触发器名称 */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 触发条件 */
  condition: TriggerCondition;
  /** 触发动作 */
  action: TriggerAction;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 触发次数限制（0表示无限制） */
  maxTriggers?: number;
  /** 触发器元数据 */
  metadata?: Metadata;
  /** 触发时是否创建检查点（新增） */
  createCheckpoint?: boolean;
  /** 检查点描述（新增） */
  checkpointDescription?: string;
}