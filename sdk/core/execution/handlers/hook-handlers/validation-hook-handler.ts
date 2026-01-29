/**
 * 验证Hook处理器
 * 负责执行验证类Hook，如数据验证、权限检查等
 */

import type { NodeHook } from '../../../../types/node';
import type { HookExecutionContext } from './index';
import type { NodeCustomEvent } from '../../../../types/events';

/**
 * 验证Hook处理器
 * 专门用于处理验证相关的Hook
 */
async function validationHookHandler(
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
          `Validation hook condition evaluation failed for hook "${hook.hookName}" on node "${context.node.id}":`,
          error
        );
        return;
      }

      if (!result) {
        return;
      }
    }

    // 执行验证逻辑
    const validationRules = (hook.eventPayload as any)?.validationRules;
    let validationResult = { valid: true, errors: [] as string[] };

    if (validationRules && Array.isArray(validationRules)) {
      // 执行验证规则
      for (const rule of validationRules) {
        try {
          const isValid = conditionEvaluator.evaluate(
            { expression: rule.expression },
            convertToEvaluationContext(evalContext)
          );
          if (!isValid) {
            validationResult.valid = false;
            validationResult.errors.push(rule.message || 'Validation failed');
          }
        } catch (error) {
          validationResult.valid = false;
          validationResult.errors.push(`Validation rule error: ${error}`);
        }
      }
    }

    // 生成事件载荷
    const eventData = generateHookEventData(hook, evalContext);

    // 添加验证结果
    eventData['validationResult'] = validationResult;

    // 触发自定义事件
    await emitHookEvent(context, hook.eventName, eventData, emitEvent);

    console.log(
      `Validation hook "${hook.hookName}" executed for node "${context.node.id}", valid: ${validationResult.valid}`
    );
  } catch (error) {
    console.error(
      `Validation hook execution failed for hook "${hook.hookName}" on node "${context.node.id}":`,
      error
    );
  }
}

export { validationHookHandler };