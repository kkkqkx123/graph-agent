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