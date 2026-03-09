/**
 * 通用 Trigger 类型定义
 *
 * 提供可被 Graph 和 Agent 模块复用的 Trigger 基础类型。
 */

import type { Metadata } from '@modular-agent/types';

/**
 * 通用触发条件（基础接口）
 */
export interface BaseTriggerCondition {
  /** 事件类型 */
  eventType: string;
  /** 自定义事件名称（可选） */
  eventName?: string;
  /** 条件元数据 */
  metadata?: Metadata;
}

/**
 * 通用触发动作（基础接口）
 */
export interface BaseTriggerAction {
  /** 动作类型 */
  type: string;
  /** 动作参数 */
  parameters: Record<string, any>;
  /** 动作元数据 */
  metadata?: Metadata;
}

/**
 * 通用触发器定义（基础接口）
 */
export interface BaseTriggerDefinition {
  /** 触发器 ID */
  id: string;
  /** 触发器名称 */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 触发条件 */
  condition: BaseTriggerCondition;
  /** 触发动作 */
  action: BaseTriggerAction;
  /** 是否启用 */
  enabled?: boolean;
  /** 最大触发次数（0 表示无限制） */
  maxTriggers?: number;
  /** 已触发次数 */
  triggerCount?: number;
  /** 触发器元数据 */
  metadata?: Metadata;
}

/**
 * 触发器执行结果
 */
export interface TriggerExecutionResult {
  /** 触发器 ID */
  triggerId: string;
  /** 是否成功 */
  success: boolean;
  /** 执行的动作 */
  action: BaseTriggerAction;
  /** 执行时间 */
  executionTime: number;
  /** 结果数据 */
  result?: any;
  /** 错误信息 */
  error?: string | Error;
}

/**
 * 触发器状态
 */
export type TriggerStatus =
  | 'idle'       // 空闲
  | 'active'     // 活跃
  | 'triggered'  // 已触发
  | 'disabled'   // 已禁用
  | 'expired';   // 已过期（达到最大触发次数）

/**
 * 事件数据（基础接口）
 */
export interface BaseEventData {
  /** 事件类型 */
  type: string;
  /** 事件名称（可选） */
  eventName?: string;
  /** 事件数据 */
  data?: any;
  /** 时间戳 */
  timestamp: number;
  /** 来源 ID */
  sourceId?: string;
}

/**
 * 触发器处理器函数类型
 */
export type TriggerHandler<TTrigger extends BaseTriggerDefinition = BaseTriggerDefinition> = (
  trigger: TTrigger,
  eventData: BaseEventData
) => Promise<TriggerExecutionResult>;

/**
 * 触发器匹配器函数类型
 */
export type TriggerMatcher = (
  condition: BaseTriggerCondition,
  event: BaseEventData
) => boolean;
