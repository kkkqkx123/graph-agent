/**
 * 触发器执行相关类型定义
 */

import type { ID, Timestamp, Metadata } from '../common.js';
import type { TriggerAction } from './config.js';
import type { Trigger } from './definition.js';

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
 * 将定义时的 Trigger 转换为运行时的 Trigger
 * 补充运行时字段（status, triggerCount, createdAt, updatedAt, workflowId）
 * @param trigger 触发器定义
 * @param workflowId 工作流ID
 * @returns 运行时触发器实例
 */
export function convertToTrigger(
  trigger: Trigger,
  workflowId: ID
): Trigger {
  return {
    ...trigger,
    status: trigger.enabled !== false ? 'enabled' : 'disabled',
    workflowId: workflowId,
    triggerCount: trigger.triggerCount ?? 0,
    createdAt: trigger.createdAt ?? Date.now(),
    updatedAt: trigger.updatedAt ?? Date.now()
  };
}