/**
 * Hook上下文构建工具
 * 负责构建Hook执行所需的评估上下文
 */

import type { HookExecutionContext } from '../index';
import type { EvaluationContext } from '../../../../../types/condition';

/**
 * Hook评估上下文（内部使用）
 */
export interface HookEvaluationContext {
  /** 节点执行结果 */
  output: any;
  /** 节点状态 */
  status: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 错误信息（如果有） */
  error?: any;
  /** 当前变量状态 */
  variables: Record<string, any>;
  /** 节点配置 */
  config: any;
  /** 节点元数据 */
  metadata?: Record<string, any>;
}

/**
 * 构建Hook评估上下文
 * @param context Hook执行上下文
 * @returns 评估上下文
 */
export function buildHookEvaluationContext(context: HookExecutionContext): HookEvaluationContext {
  const { thread, node, result } = context;

  return {
    output: result?.data,
    status: result?.status || 'PENDING',
    executionTime: result?.executionTime || 0,
    error: result?.error,
    variables: thread.variableValues,
    config: node.config,
    metadata: node.metadata
  };
}

/**
 * 转换为 EvaluationContext
 * @param hookContext Hook评估上下文
 * @returns EvaluationContext
 */
export function convertToEvaluationContext(hookContext: HookEvaluationContext): EvaluationContext {
  return {
    input: {},
    output: {
      result: hookContext.output,
      status: hookContext.status,
      executionTime: hookContext.executionTime,
      error: hookContext.error
    },
    variables: hookContext.variables
  };
}