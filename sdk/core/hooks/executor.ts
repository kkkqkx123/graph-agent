/**
 * 通用 Hook 执行器
 *
 * 提供无状态的 Hook 执行逻辑，可被 Graph 和 Agent 模块复用。
 * 包括：
 * - Hook 筛选和排序
 * - 条件表达式评估
 * - 并行/串行执行
 * - 错误处理
 */

import type {
  BaseHookDefinition,
  BaseHookContext,
  HookExecutionResult,
  HookExecutorConfig,
  HookHandler,
  EventEmitter,
  ContextBuilder
} from './types.js';
import type { EvaluationContext } from '@modular-agent/types';
import { conditionEvaluator } from '@modular-agent/common-utils';
import { getErrorMessage, now } from '@modular-agent/common-utils';

/**
 * 默认执行器配置
 */
const DEFAULT_CONFIG: Required<HookExecutorConfig> = {
  parallel: true,
  continueOnError: true,
  warnOnConditionFailure: true
};

/**
 * 筛选并排序 Hook
 *
 * @param hooks Hook 定义列表
 * @param hookType 目标 Hook 类型
 * @returns 筛选并排序后的 Hook 列表
 */
export function filterAndSortHooks<T extends BaseHookDefinition>(
  hooks: T[],
  hookType: string
): T[] {
  return hooks
    .filter(hook => hook.hookType === hookType && hook.enabled !== false)
    .sort((a, b) => (b.weight || 0) - (a.weight || 0));
}

/**
 * 评估 Hook 条件
 *
 * @param hook Hook 定义
 * @param evalContext 评估上下文
 * @param warnOnFailure 失败时是否记录警告
 * @returns 条件是否满足（无条件时返回 true）
 */
export function evaluateHookCondition(
  hook: BaseHookDefinition,
  evalContext: Record<string, any>,
  warnOnFailure: boolean = true
): boolean {
  if (!hook.condition) {
    return true;
  }

  try {
    // 将通用上下文转换为 EvaluationContext
    const evaluationContext: EvaluationContext = {
      variables: evalContext['variables'] || {},
      input: evalContext['input'] || {},
      output: evalContext['output'] || {}
    };
    return conditionEvaluator.evaluate(hook.condition, evaluationContext);
  } catch (error) {
    if (warnOnFailure) {
      console.warn(
        `Hook condition evaluation failed for "${hook.eventName}": ${getErrorMessage(error)}`
      );
    }
    return false;
  }
}

/**
 * 执行单个 Hook
 *
 * @param hook Hook 定义
 * @param context 执行上下文
 * @param buildEvalContext 上下文构建器
 * @param handlers 处理器列表
 * @param emitEvent 事件发射函数
 * @param config 执行器配置
 * @returns 执行结果
 */
export async function executeSingleHook<TContext extends BaseHookContext>(
  hook: BaseHookDefinition,
  context: TContext,
  buildEvalContext: ContextBuilder<TContext>,
  handlers: HookHandler<TContext>[],
  emitEvent: EventEmitter,
  config: Required<HookExecutorConfig> = DEFAULT_CONFIG
): Promise<HookExecutionResult> {
  const startTime = now();

  try {
    // 构建评估上下文
    const evalContext = buildEvalContext(context);

    // 评估条件
    if (!evaluateHookCondition(hook, evalContext, config.warnOnConditionFailure)) {
      return {
        success: true,
        eventName: hook.eventName,
        executionTime: now() - startTime,
        data: { skipped: true, reason: 'condition_not_met' }
      };
    }

    // 生成事件数据
    const eventData = resolvePayloadTemplate(hook.eventPayload || {}, evalContext);

    // 执行所有处理器
    for (const handler of handlers) {
      await handler(context, hook, eventData);
    }

    // 发送事件
    if (emitEvent) {
      await emitEvent({
        type: 'HOOK_EXECUTED',
        eventName: hook.eventName,
        data: eventData,
        timestamp: now()
      });
    }

    return {
      success: true,
      eventName: hook.eventName,
      executionTime: now() - startTime,
      data: eventData
    };
  } catch (error) {
    return {
      success: false,
      eventName: hook.eventName,
      executionTime: now() - startTime,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * 执行多个 Hook
 *
 * @param hooks Hook 定义列表
 * @param context 执行上下文
 * @param buildEvalContext 上下文构建器
 * @param handlers 处理器列表
 * @param emitEvent 事件发射函数
 * @param config 执行器配置
 * @returns 所有 Hook 的执行结果
 */
export async function executeHooks<TContext extends BaseHookContext>(
  hooks: BaseHookDefinition[],
  context: TContext,
  buildEvalContext: ContextBuilder<TContext>,
  handlers: HookHandler<TContext>[],
  emitEvent: EventEmitter,
  config: HookExecutorConfig = {}
): Promise<HookExecutionResult[]> {
  const resolvedConfig = { ...DEFAULT_CONFIG, ...config };

  if (resolvedConfig.parallel) {
    // 并行执行
    const promises = hooks.map(hook =>
      executeSingleHook(hook, context, buildEvalContext, handlers, emitEvent, resolvedConfig)
    );
    const results = await Promise.allSettled(promises);
    return results.map(r =>
      r.status === 'fulfilled' ? r.value : {
        success: false,
        eventName: 'unknown',
        executionTime: 0,
        error: r.reason instanceof Error ? r.reason : new Error(String(r.reason))
      }
    );
  } else {
    // 串行执行
    const results: HookExecutionResult[] = [];
    for (const hook of hooks) {
      const result = await executeSingleHook(
        hook,
        context,
        buildEvalContext,
        handlers,
        emitEvent,
        resolvedConfig
      );
      results.push(result);

      // 如果不继续执行且失败，则中断
      if (!resolvedConfig.continueOnError && !result.success) {
        break;
      }
    }
    return results;
  }
}

/**
 * 解析载荷模板
 *
 * 支持变量替换，如 {{output.result}} -> 实际值
 *
 * @param payload 载荷模板
 * @param context 评估上下文
 * @returns 解析后的载荷
 */
export function resolvePayloadTemplate(
  payload: Record<string, any>,
  context: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'handler') {
      // 跳过 handler 字段，不进行解析
      continue;
    }

    if (typeof value === 'string') {
      result[key] = resolveTemplateVariable(value, context);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = resolvePayloadTemplate(value, context);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 解析模板变量
 *
 * @param template 模板字符串
 * @param context 评估上下文
 * @returns 解析后的值
 */
function resolveTemplateVariable(template: string, context: Record<string, any>): any {
  // 匹配 {{variable}} 模式
  const match = template.match(/^\s*\{\{([^}]+)\}\}\s*$/);

  if (match) {
    // 整个字符串是一个变量引用
    const path = match[1]?.trim();
    if (!path) {
      return '';
    }
    const value = getNestedValue(context, path);

    // 如果值是 undefined，返回空字符串
    return value !== undefined ? value : '';
  }

  // 替换字符串中的变量引用
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const trimmedPath = path?.trim();
    if (!trimmedPath) {
      return '';
    }
    const value = getNestedValue(context, trimmedPath);
    return value !== undefined ? String(value) : '';
  });

  // 替换字符串中的变量引用
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = getNestedValue(context, path.trim());
    return value !== undefined ? String(value) : '';
  });
}

/**
 * 获取嵌套对象的值
 *
 * @param obj 对象
 * @param path 路径（如 "output.result"）
 * @returns 值
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}
