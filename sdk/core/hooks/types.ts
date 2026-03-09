/**
 * 通用 Hook 类型定义
 *
 * 提供可被 Graph 和 Agent 模块复用的 Hook 基础类型。
 * 具体模块通过扩展这些类型来实现特定场景的 Hook。
 */

import type { Condition } from '@modular-agent/types';

/**
 * 通用 Hook 定义（基础接口）
 *
 * 所有 Hook 定义都应扩展此接口。
 * Graph 模块使用 NodeHook，Agent 模块使用 AgentHook。
 */
export interface BaseHookDefinition {
  /** Hook 类型标识符 */
  hookType: string;
  /** 触发条件表达式（可选） */
  condition?: Condition;
  /** 事件名称，用于标识和日志 */
  eventName: string;
  /** 事件载荷模板，支持变量替换 */
  eventPayload?: Record<string, any>;
  /** 是否启用（默认 true） */
  enabled?: boolean;
  /** 权重，数字越大优先级越高，越先执行 */
  weight?: number;
}

/**
 * 通用 Hook 执行上下文（基础接口）
 *
 * 具体模块需要扩展此接口，添加特定于场景的上下文数据。
 * 例如：
 * - Graph: 添加 thread, node, result 等
 * - Agent: 添加 messageHistory, toolCall, iteration 等
 */
export interface BaseHookContext {
  /** 执行 ID（用于追踪） */
  executionId?: string;
  /** 自定义数据（扩展用） */
  [key: string]: any;
}

/**
 * 通用 Hook 执行结果
 */
export interface HookExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 事件名称 */
  eventName: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 结果数据 */
  data?: Record<string, any>;
  /** 错误信息 */
  error?: Error;
}

/**
 * Hook 执行器配置
 */
export interface HookExecutorConfig {
  /** 是否并行执行（默认 true） */
  parallel?: boolean;
  /** 是否在错误时继续执行后续 Hook（默认 true） */
  continueOnError?: boolean;
  /** 条件评估失败时是否记录警告（默认 true） */
  warnOnConditionFailure?: boolean;
}

/**
 * Hook 处理器函数类型
 *
 * 用于处理 Hook 执行过程中的特定逻辑，如：
 * - 创建检查点
 * - 发送事件
 * - 执行自定义处理函数
 */
export type HookHandler<TContext extends BaseHookContext = BaseHookContext> = (
  context: TContext,
  hook: BaseHookDefinition,
  eventData: Record<string, any>
) => Promise<void>;

/**
 * 事件发射函数类型
 */
export type EventEmitter<TEvent = any> = (event: TEvent) => Promise<void>;

/**
 * 上下文构建器函数类型
 *
 * 用于将特定场景的上下文转换为通用评估上下文
 */
export type ContextBuilder<TContext extends BaseHookContext = BaseHookContext> = (
  context: TContext
) => Record<string, any>;
