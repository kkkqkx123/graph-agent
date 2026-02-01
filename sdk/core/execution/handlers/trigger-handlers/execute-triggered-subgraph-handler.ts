/**
 * 执行触发子工作流处理函数
 * 负责执行触发器触发的孤立子工作流
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import type { ExecuteTriggeredSubgraphActionConfig } from '../../../../types/trigger';
import { NotFoundError, ValidationError } from '../../../../types/errors';
import { ExecutionContext } from '../../context/execution-context';
import { executeSingleTriggeredSubgraph, type TriggeredSubgraphTask } from '../triggered-subgraph-handler';
import type { EventManager } from '../../../services/event-manager';
import { eventManager } from '../../../services/event-manager';
import { ThreadExecutor } from '../../thread-executor';

/**
 * 创建成功结果
 */
function createSuccessResult(
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
    result: data,
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
    error: error instanceof Error ? error.message : String(error),
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
  executionContext?: ExecutionContext
): Promise<TriggerExecutionResult> {
  const startTime = Date.now();
  const context = executionContext || ExecutionContext.createDefault();

  try {
    const parameters = action.parameters as ExecuteTriggeredSubgraphActionConfig;
    const { triggeredWorkflowId, waitForCompletion = false } = parameters;

    if (!triggeredWorkflowId) {
      throw new ValidationError('Missing required parameter: triggeredWorkflowId', 'triggeredWorkflowId');
    }

    // 获取主工作流线程上下文
    const threadRegistry = context.getThreadRegistry();
    const threadId = context.getCurrentThreadId();

    if (!threadId) {
      throw new NotFoundError('Current thread ID not found in execution context', 'ThreadContext', 'current');
    }

    const mainThreadContext = threadRegistry.get(threadId);

    if (!mainThreadContext) {
      throw new NotFoundError(`Main thread context not found: ${threadId}`, 'ThreadContext', threadId);
    }

    // 获取工作流注册表
    const workflowRegistry = context.getWorkflowRegistry();
    const triggeredWorkflow = workflowRegistry.get(triggeredWorkflowId);

    if (!triggeredWorkflow) {
      throw new NotFoundError(`Triggered workflow not found: ${triggeredWorkflowId}`, 'Workflow', triggeredWorkflowId);
    }

    // 从主线程上下文获取所有执行上下文
    const input = {
      variables: mainThreadContext.getAllVariables(),
      output: mainThreadContext.getOutput(),
      input: mainThreadContext.getInput()
    };

    // 获取事件管理器
    const eventManagerInstance = context.getEventManager() || eventManager;

    // 创建 ThreadExecutor 实例（作为 SubgraphContextFactory 和 SubgraphExecutor）
    const threadExecutor = new ThreadExecutor(
      eventManagerInstance,
      workflowRegistry
    );

    // 创建触发子工作流任务
    const task: TriggeredSubgraphTask = {
      subgraphId: triggeredWorkflowId,
      input,
      triggerId,
      mainThreadContext,
      config: {
        waitForCompletion,
        timeout: 30000,
        recordHistory: true,
      }
    };

    // 执行触发子工作流
    await executeSingleTriggeredSubgraph(
      task,
      threadExecutor, // 作为 SubgraphContextFactory
      threadExecutor, // 作为 SubgraphExecutor
      eventManagerInstance
    );

    const executionTime = Date.now() - startTime;

    return createSuccessResult(
      triggerId,
      action,
      {
        message: `Triggered subgraph execution initiated: ${triggeredWorkflowId}`,
        triggeredWorkflowId,
        input,
        waitForCompletion,
        executed: true,
        completed: waitForCompletion,
      },
      executionTime
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return createFailureResult(triggerId, action, error, executionTime);
  }
}