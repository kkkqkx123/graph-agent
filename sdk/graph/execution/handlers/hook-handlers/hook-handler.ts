/**
 * Graph Hook 处理器模块
 *
 * 基于 sdk/core/hooks 通用框架实现 Graph 特定的 Hook 执行逻辑。
 * 执行时机由上层有状态模块（如 ThreadExecutor）管理。
 */

import type { Node, NodeHook, Thread, NodeExecutionResult, NodeCustomEvent } from '@modular-agent/types';
import { HookType, ExecutionError } from '@modular-agent/types';
import type { CheckpointDependencies } from '../checkpoint-handlers/checkpoint-utils.js';
import { createCheckpoint } from '../checkpoint-handlers/checkpoint-utils.js';
import {
  filterAndSortHooks,
  executeHooks,
  resolvePayloadTemplate,
  type BaseHookDefinition,
  type BaseHookContext,
  type HookHandler
} from '../../../../core/hooks/index.js';
import { getErrorOrNew } from '@modular-agent/common-utils';
import { createContextualLogger } from '../../../../utils/contextual-logger.js';
import {
  buildHookEvaluationContext,
  convertToEvaluationContext,
  emitHookEvent
} from './utils/index.js';

const logger = createContextualLogger();

/**
 * Graph Hook 执行上下文
 *
 * 扩展 BaseHookContext，添加 Graph 特定的上下文数据。
 */
export interface HookExecutionContext extends BaseHookContext {
  /** Thread 实例 */
  thread: Thread;
  /** 节点定义 */
  node: Node;
  /** 节点执行结果（AFTER_EXECUTE 时可用） */
  result?: NodeExecutionResult;
  /** 检查点依赖项（可选） */
  checkpointDependencies?: CheckpointDependencies;
}

/**
 * Graph Hook 定义
 *
 * NodeHook 扩展 BaseHookDefinition。
 */
export type GraphHookDefinition = NodeHook & BaseHookDefinition;

/**
 * 构建 Graph Hook 评估上下文
 */
function buildGraphEvalContext(context: HookExecutionContext): Record<string, any> {
  const hookEvalContext = buildHookEvaluationContext(context);
  return convertToEvaluationContext(hookEvalContext);
}

/**
 * 创建检查点处理器
 */
function createCheckpointHandler(): HookHandler<HookExecutionContext> {
  return async (context, hook, eventData) => {
    // 将 hook 转换为 NodeHook 以访问 Graph 特定属性
    const nodeHook = hook as NodeHook;
    if (!nodeHook.createCheckpoint || !context.checkpointDependencies) {
      return;
    }

    try {
      await createCheckpoint(
        {
          threadId: context.thread.id,
          nodeId: context.node.id,
          description: nodeHook.checkpointDescription || `Hook: ${hook.eventName}`
        },
        context.checkpointDependencies
      );
    } catch (error) {
      logger.warn(
        'Failed to create checkpoint for hook',
        {
          eventName: hook.eventName,
          nodeId: context.node.id,
          threadId: context.thread.id,
          workflowId: context.thread.workflowId,
          operation: 'checkpoint_creation'
        },
        undefined,
        getErrorOrNew(error)
      );
    }
  };
}

/**
 * 创建自定义处理器
 */
function createCustomHandler(): HookHandler<HookExecutionContext> {
  return async (context, hook, eventData) => {
    const customHandler = hook.eventPayload?.['handler'];
    if (customHandler && typeof customHandler === 'function') {
      try {
        await customHandler(context, hook as NodeHook, eventData);
      } catch (error) {
        throw new ExecutionError(
          'Custom handler execution failed',
          context.node.id,
          context.thread.workflowId,
          {
            eventName: hook.eventName,
            nodeId: context.node.id,
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
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): HookHandler<HookExecutionContext> {
  return async (context, hook, eventData) => {
    await emitHookEvent(context, hook.eventName, eventData, emitEvent);
  };
}

/**
 * 执行指定类型的 Hook
 *
 * @param context Hook 执行上下文
 * @param hookType Hook 类型（BEFORE_EXECUTE 或 AFTER_EXECUTE）
 * @param emitEvent 事件发射函数
 */
export async function executeHook(
  context: HookExecutionContext,
  hookType: HookType,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  const { node } = context;

  // 检查节点是否有 Hook 配置
  if (!node.hooks || node.hooks.length === 0) {
    return;
  }

  // 使用通用框架筛选和排序 Hook
  const hooks = filterAndSortHooks(node.hooks as GraphHookDefinition[], hookType);

  if (hooks.length === 0) {
    return;
  }

  // 创建处理器链
  const handlers: HookHandler<HookExecutionContext>[] = [
    createCheckpointHandler(),
    createCustomHandler(),
    createEventEmitterHandler(emitEvent)
  ];

  // 使用通用框架执行 Hook
  await executeHooks(
    hooks,
    context,
    buildGraphEvalContext,
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
