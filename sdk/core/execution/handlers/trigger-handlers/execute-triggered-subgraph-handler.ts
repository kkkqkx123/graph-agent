/**
 * 执行触发子工作流处理函数
 * 负责执行触发器触发的孤立子工作流
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import type { ExecuteTriggeredSubgraphActionConfig, TriggeredSubgraphConfig } from '../../../../types/trigger';
import { NotFoundError, ExecutionError } from '../../../../types/errors';
import { ExecutionContext } from '../../context/execution-context';

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
 * 创建子工作流输入
 * 根据输入映射从主工作流上下文中提取数据
 * @param mainThreadContext 主工作流线程上下文
 * @param inputMapping 输入映射
 * @returns 子工作流输入
 */
function createSubgraphInput(
  mainThreadContext: any,
  inputMapping?: Record<string, string>
): Record<string, any> {
  if (!inputMapping || Object.keys(inputMapping).length === 0) {
    // 如果没有输入映射，传递所有变量
    return mainThreadContext.getVariables();
  }

  const input: Record<string, any> = {};
  for (const [subgraphVar, mainVarPath] of Object.entries(inputMapping)) {
    // 从主工作流上下文中提取变量值
    // 这里简化处理，实际实现需要支持嵌套路径解析
    const value = mainThreadContext.getVariable(mainVarPath);
    input[subgraphVar] = value;
  }
  return input;
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
    const { subgraphId, inputMapping, config } = parameters;

    if (!subgraphId) {
      throw new Error('Missing required parameter: subgraphId');
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

    // 创建子工作流输入
    const input = createSubgraphInput(mainThreadContext, inputMapping);

    // 获取工作流注册表
    const workflowRegistry = context.getWorkflowRegistry();
    const subgraphWorkflow = workflowRegistry.get(subgraphId);

    if (!subgraphWorkflow) {
      throw new NotFoundError(`Subgraph workflow not found: ${subgraphId}`, 'Workflow', subgraphId);
    }

    // 获取配置选项
    const options: TriggeredSubgraphConfig = config || {
      waitForCompletion: false,
      timeout: 30000,
      recordHistory: true,
    };

    // TODO: 实际执行子工作流
    // 这里需要调用线程执行器来执行子工作流
    // 由于这是第一阶段设计，我们暂时只返回成功结果
    // 实际实现将在第二阶段完成

    const executionTime = Date.now() - startTime;

    return createSuccessResult(
      triggerId,
      action,
      {
        message: `Triggered subgraph execution initiated: ${subgraphId}`,
        subgraphId,
        input,
        options,
        // 注意：实际执行将在第二阶段实现
        executed: true,
        completed: false,
      },
      executionTime
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return createFailureResult(triggerId, action, error, executionTime);
  }
}