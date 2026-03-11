/**
 * Agent Hook 处理器模块
 *
 * 基于 sdk/core/hooks 通用框架实现 Agent 特定的 Hook 执行逻辑。
 * 参考 Graph 模块的 hook-handler.ts 设计。
 *
 * 支持的 Hook 类型：
 * - BEFORE_ITERATION: 迭代开始前
 * - AFTER_ITERATION: 迭代结束后
 * - BEFORE_TOOL_CALL: 工具调用开始前
 * - AFTER_TOOL_CALL: 工具调用结束后
 * - BEFORE_LLM_CALL: LLM 调用开始前
 * - AFTER_LLM_CALL: LLM 调用结束后
 */

import type { AgentLoopEntity } from '../../../entities/agent-loop-entity.js';
import type { AgentHook, AgentHookType, AgentCustomEvent } from '@modular-agent/types';
import { ExecutionError } from '@modular-agent/types';
import {
  filterAndSortHooks,
  executeHooks,
  type BaseHookDefinition,
  type BaseHookContext,
  type HookHandler
} from '../../../../core/hooks/index.js';
import { getErrorOrNew } from '@modular-agent/common-utils';
import { createContextualLogger } from '../../../../utils/contextual-logger.js';
import {
  buildAgentHookEvaluationContext,
  convertToEvaluationContext,
  emitAgentHookEvent
} from './utils/index.js';

const logger = createContextualLogger({ component: 'AgentHookHandler' });

/**
 * Agent Hook 执行上下文
 *
 * 扩展 BaseHookContext，添加 Agent 特定的上下文数据
 */
export interface AgentHookExecutionContext extends BaseHookContext {
  /** Agent Loop 实体 */
  entity: AgentLoopEntity;
  /** 当前工具调用信息（BEFORE/AFTER_TOOL_CALL 时可用） */
  toolCall?: {
    id: string;
    name: string;
    arguments: any;
    result?: any;
    error?: string;
  };
  /** LLM 响应信息（AFTER_LLM_CALL 时可用） */
  llmResponse?: {
    content: string;
    toolCalls?: any[];
  };
}

/**
 * Agent Hook 定义
 *
 * AgentHook 扩展 BaseHookDefinition
 */
export type AgentHookDefinition = AgentHook & BaseHookDefinition;

/**
 * 构建 Agent Hook 评估上下文
 */
function buildAgentEvalContext(context: AgentHookExecutionContext): Record<string, any> {
  const hookEvalContext = buildAgentHookEvaluationContext(context.entity, context.toolCall);
  return convertToEvaluationContext(hookEvalContext);
}

/**
 * 创建自定义处理器
 */
function createCustomHandler(): HookHandler<AgentHookExecutionContext> {
  return async (context, hook, eventData) => {
    const customHandler = hook.eventPayload?.['handler'];
    if (customHandler && typeof customHandler === 'function') {
      try {
        await customHandler(context, hook as AgentHook, eventData);
      } catch (error) {
        throw new ExecutionError(
          'Agent custom handler execution failed',
          context.entity.nodeId,
          undefined,
          {
            eventName: hook.eventName,
            agentLoopId: context.entity.id,
            operation: 'custom_handler_execution'
          },
          getErrorOrNew(error),
          'error'
        );
      }
    }
  };
}

/**
 * 创建事件发射处理器
 */
function createEventEmitterHandler(
  emitEvent: (event: AgentCustomEvent) => Promise<void>
): HookHandler<AgentHookExecutionContext> {
  return async (context, hook, eventData) => {
    await emitAgentHookEvent(context.entity, hook.eventName, eventData, emitEvent);
  };
}

/**
 * 执行指定类型的 Agent Hook
 *
 * @param entity Agent Loop 实体
 * @param hookType Hook 类型
 * @param emitEvent 事件发射函数
 * @param toolCallInfo 工具调用信息（可选）
 * @param llmResponse LLM 响应信息（可选）
 */
export async function executeAgentHook(
  entity: AgentLoopEntity,
  hookType: AgentHookType,
  emitEvent: (event: AgentCustomEvent) => Promise<void>,
  toolCallInfo?: {
    id: string;
    name: string;
    arguments: any;
    result?: any;
    error?: string;
  },
  llmResponse?: {
    content: string;
    toolCalls?: any[];
  }
): Promise<void> {
  const config = entity.config;

  // 检查配置是否有 Hook
  if (!config.hooks || config.hooks.length === 0) {
    return;
  }

  // 使用通用框架筛选和排序 Hook
  const hooks = filterAndSortHooks(config.hooks as AgentHookDefinition[], hookType);

  if (hooks.length === 0) {
    return;
  }

  // 构建执行上下文
  const context: AgentHookExecutionContext = {
    executionId: entity.id,
    entity,
    toolCall: toolCallInfo,
    llmResponse
  };

  // 创建处理器链
  const handlers: HookHandler<AgentHookExecutionContext>[] = [
    createCustomHandler(),
    createEventEmitterHandler(emitEvent)
  ];

  // 使用通用框架执行 Hook
  await executeHooks(
    hooks,
    context,
    buildAgentEvalContext,
    handlers,
    async (event) => {
      // 事件已通过 createEventEmitterHandler 处理
    },
    {
      parallel: true,
      continueOnError: true,
      warnOnConditionFailure: true
    }
  );
}

// 导出工具函数
export * from './utils/index.js';
