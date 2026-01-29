/**
 * 自定义Hook处理器
 * 负责执行自定义逻辑的Hook
 */

import type { NodeHook } from '../../../../types/node';
import type { HookExecutionContext } from './index';
import type { NodeCustomEvent } from '../../../../types/events';

/**
 * 自定义Hook处理器
 * 支持通过handler参数传入自定义处理函数
 */
async function customHookHandler(
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
          `Custom hook condition evaluation failed for hook "${hook.hookName}" on node "${context.node.id}":`,
          error
        );
        return;
      }

      if (!result) {
        return;
      }
    }

    // 检查是否有自定义处理函数
    const customHandler = (hook.eventPayload as any)?.handler;
    if (customHandler && typeof customHandler === 'function') {
      // 执行自定义处理函数
      await customHandler(context, hook);
    }

    // 生成事件载荷
    const eventData = generateHookEventData(hook, evalContext);

    // 触发自定义事件
    await emitHookEvent(context, hook.eventName, eventData, emitEvent);
  } catch (error) {
    console.error(
      `Custom hook execution failed for hook "${hook.hookName}" on node "${context.node.id}":`,
      error
    );
  }
}

export { customHookHandler };