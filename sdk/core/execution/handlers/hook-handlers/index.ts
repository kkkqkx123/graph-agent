/**
 * Hook处理器模块
 * 提供Hook执行的统一接口
 */

import type { NodeHook } from '../../../../types/node';
import { HookName } from '../../../../types/node';
import type { HookExecutionContext } from './hook-handler';
import type { NodeCustomEvent } from '../../../../types/events';

// 导入接口定义
import type { HookHandler } from './interfaces';

// 导出接口定义
export type { HookHandler } from './interfaces';

// 导入各个Hook处理器
import { customHookHandler } from './custom-hook-handler';
import { notificationHookHandler } from './notification-hook-handler';
import { validationHookHandler } from './validation-hook-handler';

/**
 * Hook处理器静态映射
 * 类似于节点处理器的静态映射，提供类型安全的处理器访问
 */
export const hookHandlers: Record<HookName, HookHandler> = {
  [HookName.CUSTOM]: customHookHandler,
  [HookName.NOTIFICATION]: notificationHookHandler,
  [HookName.VALIDATION]: validationHookHandler
} as Record<HookName, HookHandler>;

/**
 * 获取Hook处理器
 * @param hookName Hook名称
 * @returns Hook处理器函数
 * @throws 如果找不到对应的处理器则抛出错误
 */
export function getHookHandler(hookName: HookName): HookHandler {
  const handler = hookHandlers[hookName];
  if (!handler) {
    throw new Error(`No handler found for hook name: ${hookName}`);
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