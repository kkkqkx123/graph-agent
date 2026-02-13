/**
 * Hook处理器模块
 * 提供通用的Hook执行函数
 * 执行时机由上层有状态模块（如ThreadExecutor）管理
 */

import type { Node, NodeHook } from '@modular-agent/types/node';
import { HookType } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import type { NodeExecutionResult } from '@modular-agent/types/thread';
import type { NodeCustomEvent } from '@modular-agent/types/events';
import type { CheckpointDependencies } from '../checkpoint-handlers/checkpoint-utils';
import { createCheckpoint } from '../checkpoint-handlers/checkpoint-utils';
import { ValidationError, ExecutionError, ErrorSeverity } from '@modular-agent/types/errors';

/**
 * Hook执行上下文接口
 */
export interface HookExecutionContext {
  /** Thread实例 */
  thread: Thread;
  /** 节点定义 */
  node: Node;
  /** 节点执行结果（AFTER_EXECUTE时可用） */
  result?: NodeExecutionResult;
  /** 检查点依赖项（可选） */
  checkpointDependencies?: CheckpointDependencies;
}

/**
 * 执行指定类型的Hook
 * @param context Hook执行上下文
 * @param hookType Hook类型（BEFORE_EXECUTE 或 AFTER_EXECUTE）
 * @param emitEvent 事件发射函数
 */
export async function executeHook(
  context: HookExecutionContext,
  hookType: HookType,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  const { node } = context;

  // 检查节点是否有Hook配置
  if (!node.hooks || node.hooks.length === 0) {
    return;
  }

  // 筛选指定类型的Hook，并按权重排序（权重高的先执行）
  const hooks = node.hooks
    .filter((hook: NodeHook) => hook.hookType === hookType && (hook.enabled !== false))
    .sort((a: NodeHook, b: NodeHook) => (b.weight || 0) - (a.weight || 0));

  // 异步执行所有Hook，不阻塞节点执行
  const promises = hooks.map((hook: NodeHook) => executeSingleHook(context, hook, hookType, emitEvent));
  await Promise.allSettled(promises);
}

/**
 * 执行单个Hook
 * @param context Hook执行上下文
 * @param hook Hook配置
 * @param emitEvent 事件发射函数
 */
async function executeSingleHook(
  context: HookExecutionContext,
  hook: NodeHook,
  hookType: HookType,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  try {
    const { conditionEvaluator } = await import('@modular-agent/common-utils');
    const {
      buildHookEvaluationContext,
      convertToEvaluationContext,
      generateHookEventData,
      emitHookEvent
    } = await import('./utils');

    // 构建评估上下文
    const evalContext = buildHookEvaluationContext(context);

    // 评估触发条件（如果有）
    if (hook.condition) {
      let result: boolean;
      try {
        result = conditionEvaluator.evaluate(
          hook.condition,
          convertToEvaluationContext(evalContext)
        );
      } catch (error) {
        // 抛出验证错误，标记为警告级别
        throw new ValidationError(
          `Hook condition evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
          'hook.condition',
          hook.condition,
          {
            eventName: hook.eventName,
            nodeId: context.node.id,
            operation: 'hook_condition_evaluation',
            severity: 'warning'
          }
        );
      }

      if (!result) {
        return;
      }
    }

    // Hook触发前创建检查点（如果配置了）
    if (hook.createCheckpoint && context.checkpointDependencies) {
      try {
        await createCheckpoint(
          {
            threadId: context.thread.id,
            nodeId: context.node.id,
            description: hook.checkpointDescription || `Hook: ${hook.eventName}`
          },
          context.checkpointDependencies
        );
      } catch (error) {
        // 抛出执行错误，标记为警告级别（检查点创建失败不影响主流程）
        throw new ExecutionError(
          'Failed to create checkpoint for hook',
          context.node.id,
          context.thread.workflowId,
          {
            eventName: hook.eventName,
            nodeId: context.node.id,
            operation: 'checkpoint_creation'
          },
          error instanceof Error ? error : new Error(String(error)),
          ErrorSeverity.WARNING
        );
      }
    }

    // 生成事件载荷
    const eventData = generateHookEventData(hook, evalContext);

    // 如果eventPayload中有handler，执行自定义处理函数
    const customHandler = hook.eventPayload?.['handler'];
    if (customHandler && typeof customHandler === 'function') {
      try {
        await customHandler(context, hook, eventData);
      } catch (error) {
        // 抛出执行错误，标记为错误级别（自定义处理程序执行失败）
        throw new ExecutionError(
          'Custom handler execution failed',
          context.node.id,
          context.thread.workflowId,
          {
            eventName: hook.eventName,
            nodeId: context.node.id,
            operation: 'custom_handler_execution'
          },
          error instanceof Error ? error : new Error(String(error)),
          ErrorSeverity.ERROR
        );
      }
    }

    // 触发自定义事件
    await emitHookEvent(context, hook.eventName, eventData, emitEvent);
  } catch (error) {
    // 抛出执行错误，标记为错误级别（Hook执行失败）
    throw new ExecutionError(
      'Hook execution failed',
      context.node.id,
      context.thread.workflowId,
      {
        eventName: hook.eventName,
        nodeId: context.node.id,
        hookType,
        operation: 'hook_execution'
      },
      error instanceof Error ? error : new Error(String(error)),
      ErrorSeverity.ERROR
    );
  }
}

// 导出工具函数
export * from './utils';