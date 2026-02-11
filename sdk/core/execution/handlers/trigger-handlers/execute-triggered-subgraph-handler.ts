/**
 * 执行触发子工作流处理函数
 * 负责执行触发器触发的孤立子工作流
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types/trigger';
import type { ExecuteTriggeredSubgraphActionConfig } from '@modular-agent/types/trigger';
import { NotFoundError, ValidationError } from '@modular-agent/types/errors';
import { ExecutionContext } from '../../context/execution-context';
import {
  executeSingleTriggeredSubgraph,
  type TriggeredSubgraphTask,
  type ExecutedSubgraphResult
} from '../triggered-subgraph-handler';
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
    const { triggeredWorkflowId, waitForCompletion = true } = parameters;

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
    
    // 确保triggered子工作流已完整预处理（包括引用展开）
    const processedTriggeredWorkflow = await workflowRegistry.ensureProcessed(triggeredWorkflowId);

    if (!processedTriggeredWorkflow) {
      throw new NotFoundError(`Triggered workflow not found: ${triggeredWorkflowId}`, 'Workflow', triggeredWorkflowId);
    }

    // 从主线程上下文获取执行上下文
    const input: Record<string, any> = {
      output: mainThreadContext.getOutput(),
      input: mainThreadContext.getInput()
    };

    // 根据mergeOptions配置选择性传递变量
    if (parameters.mergeOptions?.includeVariables) {
      const allVariables = mainThreadContext.getAllVariables();
      input['variables'] = {};
      for (const varName of parameters.mergeOptions.includeVariables) {
        if (varName in allVariables) {
          input['variables'][varName] = allVariables[varName];
        }
      }
    } else {
      // 未配置includeVariables时，传递所有变量（保持向后兼容）
      // 未配置includeVariables时，传递所有变量（保持向后兼容）
      input['variables'] = mainThreadContext.getAllVariables();
    }

    // 根据mergeOptions配置选择性传递对话历史
    if (parameters.mergeOptions?.includeConversationHistory) {
      input['conversationHistory'] = mainThreadContext.getConversationHistory();
    }

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