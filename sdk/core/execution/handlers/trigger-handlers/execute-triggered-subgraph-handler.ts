/**
 * 执行触发子工作流处理函数
 * 负责执行触发器触发的孤立子工作流
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import type { ExecuteTriggeredSubgraphActionConfig, TriggeredSubgraphConfig } from '../../../../types/trigger';
import { NotFoundError } from '../../../../types/errors';
import { ExecutionContext } from '../../context/execution-context';
import { executeSingleTriggeredSubgraph, type TriggeredSubgraphTask } from '../triggered-subgraph-handler';
import { EventCoordinator } from '../../coordinators/event-coordinator';
import { eventManager } from '../../../services/event-manager';
import { ThreadExecutor } from '../../thread-executor';
import { VariableAccessor } from '../../managers/variable-accessor';

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
    return mainThreadContext.getAllVariables();
  }

  const input: Record<string, any> = {};
  const accessor = new VariableAccessor(mainThreadContext);

  for (const [subgraphVar, mainVarPath] of Object.entries(inputMapping)) {
    // 使用统一的变量访问器提取变量值
    // 支持嵌套路径解析，如 "user.profile.name"、"items[0].name"
    // 支持命名空间，如 "input.userName"、"output.result"
    const value = accessor.get(mainVarPath);
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

    // 创建事件协调器
    const eventCoordinator = new EventCoordinator(context.getEventManager() || eventManager);

    // 创建 ThreadExecutor 实例（作为 SubgraphContextFactory 和 SubgraphExecutor）
    const threadExecutor = new ThreadExecutor(
      context.getEventManager(),
      workflowRegistry
    );

    // 创建触发子工作流任务
    const task: TriggeredSubgraphTask = {
      subgraphId,
      input,
      triggerId,
      mainThreadContext,
      config: options
    };

    // 直接调用执行函数
    await executeSingleTriggeredSubgraph(
      task,
      threadExecutor, // 作为 SubgraphContextFactory
      threadExecutor, // 作为 SubgraphExecutor
      eventCoordinator
    );

    const executionTime = Date.now() - startTime;

    return createSuccessResult(
      triggerId,
      action,
      {
        message: `Triggered subgraph execution initiated: ${subgraphId}`,
        subgraphId,
        input,
        options,
        executed: true,
        completed: options.waitForCompletion || false,
      },
      executionTime
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return createFailureResult(triggerId, action, error, executionTime);
  }
}