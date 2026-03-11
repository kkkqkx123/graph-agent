/**
 * Agent Hook 类型定义
 *
 * 基于 sdk/core/hooks 通用框架，定义 Agent 特定的 Hook 类型。
 * 参考 NodeHook 的设计模式。
 */

import type { Condition } from '../graph/condition.js';

/**
 * Agent Hook 类型
 *
 * 定义 Agent 执行过程中的 Hook 触发点
 */
export type AgentHookType =
  /** 迭代开始前触发 */
  'BEFORE_ITERATION' |
  /** 迭代结束后触发 */
  'AFTER_ITERATION' |
  /** 工具调用开始前触发 */
  'BEFORE_TOOL_CALL' |
  /** 工具调用结束后触发 */
  'AFTER_TOOL_CALL' |
  /** LLM 调用开始前触发 */
  'BEFORE_LLM_CALL' |
  /** LLM 调用结束后触发 */
  'AFTER_LLM_CALL';

/**
 * Agent Hook 配置
 *
 * 扩展自 BaseHookDefinition，添加 Agent 特定属性
 */
export interface AgentHook {
  /** Hook 类型 */
  hookType: AgentHookType;
  /** 触发条件表达式（可选） */
  condition?: Condition;
  /** 要触发的自定义事件名称 */
  eventName: string;
  /** 事件载荷生成逻辑（可选） */
  eventPayload?: Record<string, any>;
  /** 是否启用（默认 true） */
  enabled?: boolean;
  /** 权重（数字越大优先级越高） */
  weight?: number;
  /** Hook 触发时是否创建检查点 */
  createCheckpoint?: boolean;
  /** 检查点描述 */
  checkpointDescription?: string;
}
