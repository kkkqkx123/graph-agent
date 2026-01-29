/**
 * 通知Hook处理器
 * 负责执行通知类Hook，如发送邮件、消息等
 */

import type { NodeHook } from '../../../../types/node';
import type { HookExecutionContext } from './hook-handler';
import type { NodeCustomEvent } from '../../../../types/events';

/**
 * 通知Hook处理器
 * 专门用于处理通知相关的Hook
 */
async function notificationHookHandler(
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
          `Notification hook condition evaluation failed for hook "${hook.hookName}" on node "${context.node.id}":`,
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

    // 添加通知特定的元数据
    eventData['notificationType'] = (hook.eventPayload as any)?.notificationType || 'default';
    eventData['priority'] = (hook.eventPayload as any)?.priority || 'normal';

    // 触发自定义事件
    await emitHookEvent(context, hook.eventName, eventData, emitEvent);

    console.log(
      `Notification hook "${hook.hookName}" triggered for node "${context.node.id}"`
    );
  } catch (error) {
    console.error(
      `Notification hook execution failed for hook "${hook.hookName}" on node "${context.node.id}":`,
      error
    );
  }
}

export { notificationHookHandler };