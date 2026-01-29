/**
 * Hook处理器模块
 * 提供通用的Hook执行函数
 * 执行时机由上层有状态模块（如ThreadExecutor）管理
 */

import type { Node, NodeHook } from '../../../../types/node';
import { HookType } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import type { NodeExecutionResult } from '../../../../types/thread';
import type { NodeCustomEvent } from '../../../../types/events';
import { getHookHandler } from './index';

/**
 * Hook执行上下文
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
 * 执行指定类型的Hook
 * @param context Hook执行上下文
 * @param hookType Hook类型（BEFORE_EXECUTE 或 AFTER_EXECUTE）
 * @param emitEvent 事件发射函数
 */
export async function executeHook(
  context: HookExecutionContext,
  hookType: HookType,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  const { node } = context;

  // 检查节点是否有Hook配置
  if (!node.hooks || node.hooks.length === 0) {
    return;
  }

  // 筛选指定类型的Hook，并按权重排序（权重高的先执行）
  const hooks = node.hooks
    .filter((hook: NodeHook) => hook.hookType === hookType && (hook.enabled !== false))
    .sort((a: NodeHook, b: NodeHook) => (b.weight || 0) - (a.weight || 0));

  // 异步执行所有Hook，不阻塞节点执行
  const promises = hooks.map((hook: NodeHook) => executeSingleHook(context, hook, emitEvent));
  await Promise.allSettled(promises);
}

/**
 * 执行单个Hook
 * @param context Hook执行上下文
 * @param hook Hook配置
 * @param emitEvent 事件发射函数
 */
async function executeSingleHook(
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  try {
    // 获取对应的Hook处理器
    const handler = getHookHandler(hook.hookName);
    
    // 执行Hook处理器
    await handler(context, hook, emitEvent);
  } catch (error) {
    // Hook执行失败不应影响节点正常执行，记录错误日志
    console.error(
      `Hook execution failed for hook "${hook.hookName}" on node "${context.node.id}":`,
      error
    );
  }
}