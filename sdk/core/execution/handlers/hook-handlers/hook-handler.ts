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
    const { conditionEvaluator } = await import('../../../../utils/evalutor/condition-evaluator');
    const {
      buildHookEvaluationContext,
      convertToEvaluationContext,
      generateHookEventData,
      emitHookEvent
    } = await import('./utils');

    // 构建评估上下文
    const evalContext = buildHookEvaluationContext(context);

    // 评估触发条件（如果有）
    if (hook.condition) {
      let result: boolean;
      try {
        result = conditionEvaluator.evaluate(
          { expression: hook.condition },
          convertToEvaluationContext(evalContext)
        );
      } catch (error) {
        console.warn(
          `Hook condition evaluation failed for event "${hook.eventName}" on node "${context.node.id}":`,
          error
        );
        return;
      }

      if (!result) {
        return;
      }
    }

    // 生成事件载荷
    const eventData = generateHookEventData(hook, evalContext);

    // 如果eventPayload中有handler，执行自定义处理函数
    const customHandler = hook.eventPayload?.['handler'];
    if (customHandler && typeof customHandler === 'function') {
      try {
        await customHandler(context, hook, eventData);
      } catch (error) {
        console.error(
          `Custom handler execution failed for event "${hook.eventName}" on node "${context.node.id}":`,
          error
        );
      }
    }

    // 触发自定义事件
    await emitHookEvent(context, hook.eventName, eventData, emitEvent);

    console.log(
      `Hook triggered for event "${hook.eventName}" on node "${context.node.id}"`
    );
  } catch (error) {
    // Hook执行失败不应影响节点正常执行，记录错误日志
    console.error(
      `Hook execution failed for event "${hook.eventName}" on node "${context.node.id}":`,
      error
    );
  }
}

// 导出工具函数
export * from './utils';