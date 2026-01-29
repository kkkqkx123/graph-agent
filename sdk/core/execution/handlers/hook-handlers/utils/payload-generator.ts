/**
 * Hook事件载荷生成工具
 * 负责生成Hook触发时的事件载荷数据
 */

import type { NodeHook } from '../../../../../types/node';
import type { HookEvaluationContext } from './context-builder';

/**
 * 生成事件载荷
 * @param hook Hook配置
 * @param evalContext 评估上下文
 * @returns 事件载荷
 */
export function generateHookEventData(
  hook: NodeHook,
  evalContext: HookEvaluationContext
): Record<string, any> {
  // 如果Hook配置了eventPayload，使用它
  if (hook.eventPayload) {
    return resolvePayloadTemplate(hook.eventPayload, evalContext);
  }

  // 否则，使用默认的事件数据
  return {
    output: evalContext.output,
    status: evalContext.status,
    executionTime: evalContext.executionTime,
    error: evalContext.error,
    variables: evalContext.variables,
    config: evalContext.config,
    metadata: evalContext.metadata
  };
}

/**
 * 解析载荷模板（支持变量替换）
 * @param payload 载荷模板
 * @param evalContext 评估上下文
 * @returns 解析后的载荷
 */
export function resolvePayloadTemplate(
  payload: Record<string, any>,
  evalContext: HookEvaluationContext
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') {
      // 处理模板变量，如 {{output.result}}
      result[key] = resolveTemplateVariable(value, evalContext);
    } else if (typeof value === 'object' && value !== null) {
      // 递归处理嵌套对象
      result[key] = resolvePayloadTemplate(value, evalContext);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 解析模板变量
 * @param template 模板字符串
 * @param evalContext 评估上下文
 * @returns 解析后的值
 */
export function resolveTemplateVariable(template: string, evalContext: HookEvaluationContext): any {
  // 匹配 {{variable}} 格式的模板变量
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = template.matchAll(regex);

  let result = template;
  for (const match of matches) {
    if (match[1]) {
      const variablePath = match[1].trim();
      const value = getVariableValue(variablePath, evalContext);
      result = result.replace(match[0], String(value ?? ''));
    }
  }

  // 尝试将结果转换为数字或布尔值
  if (result === 'true') return true;
  if (result === 'false') return false;
  if (/^-?\d+\.?\d*$/.test(result)) return parseFloat(result);

  return result;
}

/**
 * 获取变量值
 * @param path 变量路径
 * @param evalContext 评估上下文
 * @returns 变量值
 */
export function getVariableValue(path: string, evalContext: HookEvaluationContext): any {
  const parts = path.split('.');
  let value: any = evalContext;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[part];
  }

  return value;
}