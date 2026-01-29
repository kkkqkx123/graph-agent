/**
 * Hook处理器模块
 * 提供Hook执行的统一接口和注册机制
 */

import type { NodeHook } from '../../../../types/node';
import type { HookExecutionContext } from './hook-handler';
import type { NodeCustomEvent } from '../../../../types/events';

// 导入接口定义
import type {
  HookHandler,
  HookHandlerSpec,
  HookEvaluationContext,
  HookHandlerRegistry
} from './interfaces';

// 导出接口定义
export type {
  HookHandler,
  HookHandlerSpec,
  HookEvaluationContext,
  HookHandlerRegistry
} from './interfaces';

/**
 * Hook处理器映射
 */
export const hookHandlers: Record<string, HookHandler> = {} as Record<string, HookHandler>;

/**
 * 注册Hook处理器
 * @param hookName Hook名称
 * @param handler Hook处理器函数
 */
export function registerHookHandler(hookName: string, handler: HookHandler): void {
  hookHandlers[hookName] = handler;
}

/**
 * 获取Hook处理器
 * @param hookName Hook名称
 * @returns Hook处理器函数，如果未注册则返回默认处理器
 */
export function getHookHandler(hookName: string): HookHandler {
  const handler = hookHandlers[hookName];
  if (!handler) {
    // 返回默认处理器
    return defaultHookHandler;
  }
  return handler;
}

/**
 * 默认Hook处理器
 * 执行标准的Hook逻辑：条件评估 -> 事件载荷生成 -> 事件触发
 */
async function defaultHookHandler(
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  const { conditionEvaluator } = await import('../../../../utils/evalutor/condition-evaluator');
  const {
    buildHookEvaluationContext,
    convertToEvaluationContext,
    generateHookEventData,
    emitHookEvent
  } = await import('./utils');

  try {
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
          `Hook condition evaluation failed for hook "${hook.hookName}" on node "${context.node.id}":`,
          error
        );
        return;
      }

      if (!result) {
        // 条件不满足，不触发事件
        return;
      }
    }

    // 生成事件载荷
    const eventData = generateHookEventData(hook, evalContext);

    // 触发自定义事件
    await emitHookEvent(context, hook.eventName, eventData, emitEvent);
  } catch (error) {
    // Hook执行失败不应影响节点正常执行，记录错误日志
    console.error(
      `Hook execution failed for hook "${hook.hookName}" on node "${context.node.id}":`,
      error
    );
  }
}

// 导出主执行函数
export { executeHook } from './hook-handler';
export type { HookExecutionContext } from './hook-handler';

// 导出各个Hook处理器
export { customHookHandler } from './custom-hook-handler';
export { notificationHookHandler } from './notification-hook-handler';
export { validationHookHandler } from './validation-hook-handler';

// 导出工具函数
export * from './utils';