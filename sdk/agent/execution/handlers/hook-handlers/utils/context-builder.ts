/**
 * Agent Hook 上下文构建工具
 *
 * 负责构建 Agent Hook 执行所需的评估上下文
 * 参考 Graph 模块的 context-builder.ts 设计
 */

import type { AgentLoopEntity } from '../../../../entities/agent-loop-entity.js';
import type { EvaluationContext } from '@modular-agent/types';

/**
 * Agent Hook 评估上下文（内部使用）
 */
export interface AgentHookEvaluationContext {
  /** 当前迭代次数 */
  iteration: number;
  /** 最大迭代次数 */
  maxIterations: number;
  /** 工具调用次数 */
  toolCallCount: number;
  /** 当前状态 */
  status: string;
  /** 最后一次错误（如果有） */
  error?: any;
  /** 当前变量状态 */
  variables: Record<string, any>;
  /** 配置信息 */
  config: {
    profileId?: string;
    systemPrompt?: string;
    tools?: string[];
  };
  /** 当前工具调用信息（BEFORE/AFTER_TOOL_CALL 时可用） */
  toolCall?: {
    id: string;
    name: string;
    arguments: any;
    result?: any;
    error?: string;
  };
}

/**
 * 构建 Agent Hook 评估上下文
 *
 * @param entity Agent Loop 实体
 * @param toolCallInfo 工具调用信息（可选）
 * @returns 评估上下文
 */
export function buildAgentHookEvaluationContext(
  entity: AgentLoopEntity,
  toolCallInfo?: {
    id: string;
    name: string;
    arguments: any;
    result?: any;
    error?: string;
  }
): AgentHookEvaluationContext {
  const { config, state } = entity;

  return {
    iteration: state.currentIteration,
    maxIterations: config.maxIterations ?? 10,
    toolCallCount: state.toolCallCount,
    status: state.status,
    error: state.error,
    variables: entity.getAllVariables(),
    config: {
      profileId: config.profileId,
      systemPrompt: config.systemPrompt,
      tools: config.tools
    },
    toolCall: toolCallInfo
  };
}

/**
 * 转换为 EvaluationContext
 *
 * @param hookContext Agent Hook 评估上下文
 * @returns EvaluationContext
 */
export function convertToEvaluationContext(hookContext: AgentHookEvaluationContext): EvaluationContext {
  return {
    input: {
      iteration: hookContext.iteration,
      maxIterations: hookContext.maxIterations,
      toolCallCount: hookContext.toolCallCount
    },
    output: {
      status: hookContext.status,
      error: hookContext.error
    },
    variables: hookContext.variables
  };
}
