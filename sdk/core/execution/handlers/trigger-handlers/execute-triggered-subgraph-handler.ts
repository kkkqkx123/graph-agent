/**
 * 执行触发子工作流处理函数
 * 负责执行触发器触发的孤立子工作流
 *
 * 职责：
 * - 触发子工作流执行
 * - 传递触发事件相关的输入数据
 * - 等待子工作流完成（如果配置了waitForCompletion）
 *
 * 注意：
 * - 数据传递（变量、对话历史）由节点处理器处理
 * - START_FROM_TRIGGER节点负责接收输入数据
 * - CONTINUE_FROM_TRIGGER节点负责回调数据到主线程
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import type { ExecuteTriggeredSubgraphActionConfig } from '@modular-agent/types';
import { NotFoundError, ValidationError, RuntimeValidationError, ThreadContextNotFoundError, WorkflowNotFoundError } from '@modular-agent/types';
import { ExecutionContext } from '../../context/execution-context';
import {
  executeSingleTriggeredSubgraph,
  type TriggeredSubgraphTask,
  type ExecutedSubgraphResult
} from '../triggered-subgraph-handler';
import { ThreadExecutor } from '../../thread-executor';
import { graphRegistry } from '../../../services/graph-registry';

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
    const { triggeredWorkflowId, waitForCompletion = true } = parameters;

    if (!triggeredWorkflowId) {
      throw new RuntimeValidationError('Missing required parameter: triggeredWorkflowId', { operation: 'handle', field: 'triggeredWorkflowId' });
    }

    // 获取主工作流线程上下文
    const threadRegistry = context.getThreadRegistry();
    const threadId = context.getCurrentThreadId();

    if (!threadId) {
      throw new ThreadContextNotFoundError('Current thread ID not found in execution context', 'current');
    }

    const mainThreadContext = threadRegistry.get(threadId);

    if (!mainThreadContext) {
      throw new ThreadContextNotFoundError(`Main thread context not found: ${threadId}`, threadId);
    }

    // 确保triggered子工作流已完整预处理（包括引用展开）
    const processedTriggeredWorkflow = await graphRegistry.ensureProcessed(triggeredWorkflowId);

    if (!processedTriggeredWorkflow) {
      throw new WorkflowNotFoundError(`Triggered workflow not found: ${triggeredWorkflowId}`, triggeredWorkflowId);
    }

    // 准备输入数据（仅包含触发事件相关的数据）
    // 数据传递（变量、对话历史）由节点处理器处理
    const input: Record<string, any> = {
      triggerId,
      output: mainThreadContext.getOutput(),
      input: mainThreadContext.getInput()
    };

    // 创建 ThreadExecutor 实例（作为 SubgraphContextFactory 和 SubgraphExecutor）
    const threadExecutor = new ThreadExecutor(context);

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
    const result = await executeSingleTriggeredSubgraph(
      task,
      threadExecutor, // 作为 SubgraphContextFactory
      threadExecutor, // 作为 SubgraphExecutor
      context.getEventManager()
    );

    const executionTime = Date.now() - startTime;

    return createSuccessResult(
      triggerId,
      action,
      {
        message: `Triggered subgraph execution completed: ${triggeredWorkflowId}`,
        triggeredWorkflowId,
        input,
        output: result.subgraphContext.getOutput(),
        waitForCompletion,
        executed: true,
        completed: true,
        executionTime: result.executionTime,
      },
      executionTime
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return createFailureResult(triggerId, action, error, executionTime);
  }
}