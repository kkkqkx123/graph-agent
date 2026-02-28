/**
 * 执行触发子工作流处理函数
 * 负责执行触发器触发的孤立子工作流
 *
 * 职责：
 * - 触发子工作流执行
 * - 传递触发事件相关的输入数据
 * - 支持同步和异步执行模式
 * - 使用任务队列和线程池管理执行
 *
 * 注意：
 * - 数据传递（变量、对话历史）由节点处理器处理
 * - START_FROM_TRIGGER节点负责接收输入数据
 * - CONTINUE_FROM_TRIGGER节点负责回调数据到主线程
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import type { ExecuteTriggeredSubgraphActionConfig } from '@modular-agent/types';
import { RuntimeValidationError, ThreadContextNotFoundError, WorkflowNotFoundError } from '@modular-agent/types';
import type { ThreadRegistry } from '../../../services/thread-registry.js';
import type { EventManager } from '../../../services/event-manager.js';
import type { ThreadBuilder } from '../../thread-builder.js';
import type { TaskQueueManager } from '../../managers/task-queue-manager.js';
import { getErrorMessage, now, diffTimestamp } from '@modular-agent/common-utils';
import { TriggeredSubworkflowManager } from '../../../services/triggered-subworkflow-manager.js';
import type { TriggeredSubgraphTask } from '../../types/triggered-subgraph.types.js';
import { getContainer } from '../../../di/index.js';
import * as Identifiers from '../../../di/service-identifiers.js';

/**
 * 创建成功结果（同步执行）
 */
function createSyncSuccessResult(
  triggerId: string,
  action: TriggerAction,
  data: any,
  executionTime: number
): TriggerExecutionResult {
  return {
    triggerId,
    success: true,
    action,
    executionTime,
    result: {
      message: `Triggered subgraph execution completed: ${data.triggeredWorkflowId}`,
      triggeredWorkflowId: data.triggeredWorkflowId,
      input: data.input,
      output: data.output,
      waitForCompletion: true,
      executed: true,
      completed: true,
      executionTime: data.executionTime,
    },
  };
}

/**
 * 创建成功结果（异步执行）
 */
function createAsyncSuccessResult(
  triggerId: string,
  action: TriggerAction,
  data: any,
  executionTime: number
): TriggerExecutionResult {
  return {
    triggerId,
    success: true,
    action,
    executionTime,
    result: {
      message: `Triggered subgraph submitted: ${data.triggeredWorkflowId}`,
      triggeredWorkflowId: data.triggeredWorkflowId,
      taskId: data.taskId,
      status: data.status,
      waitForCompletion: false,
      executed: true,
      completed: false,
      executionTime: data.executionTime,
    },
  };
}

/**
 * 创建失败结果
 */
function createFailureResult(
  triggerId: string,
  action: TriggerAction,
  error: any,
  executionTime: number
): TriggerExecutionResult {
  return {
    triggerId,
    success: false,
    action,
    executionTime,
    error: getErrorMessage(error),
  };
}

/**
 * 执行触发子工作流处理函数
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @param executionContext 执行上下文
 * @returns 执行结果
 */
export async function executeTriggeredSubgraphHandler(
  action: TriggerAction,
  triggerId: string,
  threadRegistry: ThreadRegistry,
  eventManager: EventManager,
  threadBuilder: ThreadBuilder,
  taskQueueManager: TaskQueueManager,
  currentThreadId?: string
): Promise<TriggerExecutionResult> {
  const startTime = now();

  try {
    const parameters = action.parameters as ExecuteTriggeredSubgraphActionConfig;
    const { triggeredWorkflowId, waitForCompletion = true } = parameters;
    const timeout = parameters.timeout;
    const recordHistory = parameters.recordHistory;

    if (!triggeredWorkflowId) {
      throw new RuntimeValidationError('Missing required parameter: triggeredWorkflowId', { operation: 'handle', field: 'triggeredWorkflowId' });
    }

    // 获取主工作流线程实体
    const threadId = currentThreadId;

    if (!threadId) {
      throw new ThreadContextNotFoundError('Current thread ID not provided', 'current');
    }

    const mainThreadEntity = threadRegistry.get(threadId);

    if (!mainThreadEntity) {
      throw new ThreadContextNotFoundError(`Main thread entity not found: ${threadId}`, threadId);
    }

    // 从 graph-registry 获取已预处理的图
    const container = getContainer();
    const graphRegistry = container.get(Identifiers.GraphRegistry);
    const processedTriggeredWorkflow = graphRegistry.get(triggeredWorkflowId);

    if (!processedTriggeredWorkflow) {
      throw new WorkflowNotFoundError(`Triggered workflow not found or not preprocessed: ${triggeredWorkflowId}`, triggeredWorkflowId);
    }

    // 准备输入数据（仅包含触发事件相关的数据）
    const input: Record<string, any> = {
      triggerId,
      output: mainThreadEntity.getOutput(),
      input: mainThreadEntity.getInput()
    };

    // 从 DI 容器获取共享的 TriggeredSubworkflowManager 实例
    // 避免每次调用都创建新的 Manager 实例,防止资源浪费和资源耗尽
    const manager = container.get(Identifiers.TriggeredSubworkflowManager);

    // 创建触发子工作流任务
    const task: TriggeredSubgraphTask = {
      subgraphId: triggeredWorkflowId,
      input,
      triggerId,
      mainThreadEntity,
      config: {
        waitForCompletion,
        timeout,
        recordHistory,
      }
    };

    // 执行触发子工作流
    const result = await manager.executeTriggeredSubgraph(task);

    const executionTime = diffTimestamp(startTime, now());

    // 根据执行模式返回不同的结果
    if (waitForCompletion) {
      // 同步执行
      const syncResult = result as any; // ExecutedSubgraphResult
      return createSyncSuccessResult(
        triggerId,
        action,
        {
          triggeredWorkflowId,
          input,
          output: syncResult.subgraphEntity.getOutput(),
          executionTime: syncResult.executionTime,
        },
        executionTime
      );
    } else {
      // 异步执行
      const asyncResult = result as any; // TaskSubmissionResult
      return createAsyncSuccessResult(
        triggerId,
        action,
        {
          triggeredWorkflowId,
          taskId: asyncResult.taskId,
          status: asyncResult.status,
          executionTime: diffTimestamp(startTime, now()),
        },
        executionTime
      );
    }
  } catch (error) {
    const executionTime = diffTimestamp(startTime, now());
    return createFailureResult(triggerId, action, error, executionTime);
  }
}