/**
 * 触发器执行相关类型定义
 */

import type { ID, Timestamp, Metadata } from '../common';
import type { TriggerAction } from './config';
import type { Trigger, WorkflowTrigger } from './definition';
import { TriggerStatus, TriggerType } from './state';

/**
 * 触发器执行结果接口
 */
export interface TriggerExecutionResult {
  /** 触发器 ID */
  triggerId: ID;
  /** 是否成功执行 */
  success: boolean;
  /** 执行的动作 */
  action: TriggerAction;
  /** 执行时间 */
  executionTime: Timestamp;
  /** 执行结果数据 */
  result?: any;
  /** 错误信息（如果失败） */
  error?: any;
  /** 执行元数据 */
  metadata?: Metadata;
}

/**
 * 将WorkflowTrigger转换为Trigger
 * @param workflowTrigger workflow触发器定义
 * @param workflowId 工作流ID
 * @returns 运行时触发器实例
 */
export function convertToTrigger(
  workflowTrigger: WorkflowTrigger,
  workflowId: ID
): Trigger {
  return {
    id: workflowTrigger.id,
    name: workflowTrigger.name,
    description: workflowTrigger.description,
    type: TriggerType.EVENT,
    condition: workflowTrigger.condition,
    action: workflowTrigger.action,
    status: workflowTrigger.enabled !== false ? TriggerStatus.ENABLED : TriggerStatus.DISABLED,
    workflowId: workflowId,
    maxTriggers: workflowTrigger.maxTriggers,
    triggerCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: workflowTrigger.metadata
  };
}