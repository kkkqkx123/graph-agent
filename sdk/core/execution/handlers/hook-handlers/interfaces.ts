/**
 * Hook处理器接口定义
 * 定义Hook处理器的统一接口规范
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import type { NodeHook } from '../../../../types/node';
import type { NodeCustomEvent } from '../../../../types/events';
import type { NodeExecutionResult } from '../../../../types/thread';

/**
 * Hook执行上下文接口
 */
export interface HookExecutionContext {
  /** Thread实例 */
  thread: Thread;
  /** 节点定义 */
  node: Node;
  /** 节点执行结果（AFTER_EXECUTE时可用） */
  result?: NodeExecutionResult;
}

/**
 * Hook处理器类型
 * @param context Hook执行上下文
 * @param hook Hook配置
 * @param emitEvent 事件发射函数
 */
export type HookHandler = (
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
) => Promise<void>;

/**
 * Hook处理器接口规范
 * 所有Hook处理器应遵循以下规范：
 * 1. 构建评估上下文
 * 2. 评估触发条件（如果有）
 * 3. 生成事件载荷
 * 4. 触发自定义事件
 * 5. 错误隔离（不影响主流程）
 */
export interface HookHandlerSpec {
  /** 处理器名称 */
  name: string;
  /** 处理器函数 */
  handler: HookHandler;
  /** 支持的Hook类型 */
  hookTypes: string[];
  /** 描述 */
  description?: string;
}

/**
 * Hook评估上下文接口
 */
export interface HookEvaluationContext {
  /** 节点执行结果 */
  output: any;
  /** 节点状态 */
  status: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 错误信息（如果有） */
  error?: any;
  /** 当前变量状态 */
  variables: Record<string, any>;
  /** 节点配置 */
  config: any;
  /** 节点元数据 */
  metadata?: Record<string, any>;
}

/**
 * Hook处理器注册器接口
 *
 * 注意：这是静态注册机制，用于注册无状态的处理函数
 * - 注册时机：模块加载时自动注册
 * - 生命周期：与应用程序生命周期一致
 * - 状态管理：无状态，纯函数式实现
 */
export interface HookHandlerRegistry {
  /** 注册处理器 */
  register(hookName: string, handler: HookHandler): void;
  /** 获取处理器 */
  get(hookName: string): HookHandler;
  /** 检查处理器是否存在 */
  has(hookName: string): boolean;
  /** 获取所有处理器 */
  getAll(): Record<string, HookHandler>;
}