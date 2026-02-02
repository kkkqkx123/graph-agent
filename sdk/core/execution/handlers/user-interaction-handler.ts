/**
 * 用户交互处理函数
 * 提供无状态的用户交互执行功能
 *
 * 职责：
 * - 解析节点配置，创建交互请求
 * - 触发用户交互事件
 * - 调用应用层处理器获取用户输入
 * - 根据 operationType 处理用户输入（更新变量或添加消息）
 * - 触发处理完成或失败事件
 *
 * 设计原则：
 * - 无状态函数式设计
 * - 职责单一，每个函数只做一件事
 * - 通过参数传递依赖
 * - 与其他 handler 保持一致
 */

import type { Node } from '../../../types/node';
import type { UserInteractionNodeConfig } from '../../../types/node';
import type {
  UserInteractionRequest,
  UserInteractionOperationType
} from '../../../types/interaction';
import type { VariableScope } from '../../../types/common';
import type { UserInteractionHandler, UserInteractionContext } from '../../../api/core/user-interaction-api';
import type { EventManager } from '../../services/event-manager';
import type { ThreadContext } from '../context/thread-context';
import { EventType } from '../../../types/events';
import { generateId, now } from '../../../utils';
import { ExecutionError } from '../../../types/errors';

/**
 * 用户交互任务接口
 */
export interface UserInteractionTask {
  /** 节点定义 */
  node: Node;
  /** 节点配置 */
  config: UserInteractionNodeConfig;
  /** 线程上下文 */
  threadContext: ThreadContext;
  /** 交互ID */
  interactionId: string;
}

/**
 * 用户交互执行结果
 */
export interface UserInteractionExecutionResult {
  /** 交互ID */
  interactionId: string;
  /** 操作类型 */
  operationType: UserInteractionOperationType;
  /** 处理结果 */
  results: any;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 创建交互请求
 * @param task 用户交互任务
 * @returns 交互请求
 */
export function createInteractionRequest(task: UserInteractionTask): UserInteractionRequest {
  return {
    interactionId: task.interactionId,
    operationType: task.config.operationType as UserInteractionOperationType,
    variables: task.config.variables,
    message: task.config.message,
    prompt: task.config.prompt,
    timeout: task.config.timeout || 30000,
    metadata: task.config.metadata
  };
}

/**
 * 创建交互上下文
 * @param task 用户交互任务
 * @param eventManager 事件管理器
 * @returns 交互上下文
 */
export function createInteractionContext(
  task: UserInteractionTask,
  eventManager: EventManager
): UserInteractionContext {
  const cancelToken = {
    cancelled: false,
    cancel: () => { cancelToken.cancelled = true; }
  };

  return {
    threadId: task.threadContext.getThreadId(),
    workflowId: task.threadContext.getWorkflowId(),
    nodeId: task.node.id,
    getVariable: (variableName: string, scope?: VariableScope) => {
      return task.threadContext.getVariable(variableName);
    },
    setVariable: async (variableName: string, value: any, scope?: VariableScope) => {
      await task.threadContext.updateVariable(variableName, value, scope);
    },
    getVariables: (scope?: VariableScope) => {
      return task.threadContext.getAllVariables();
    },
    timeout: task.config.timeout || 30000,
    cancelToken
  };
}

/**
 * 触发 USER_INTERACTION_REQUESTED 事件
 * @param task 用户交互任务
 * @param request 交互请求
 * @param eventManager 事件管理器
 */
export async function emitRequestedEvent(
  task: UserInteractionTask,
  request: UserInteractionRequest,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.USER_INTERACTION_REQUESTED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    nodeId: task.node.id,
    interactionId: request.interactionId,
    operationType: request.operationType,
    prompt: request.prompt,
    timeout: request.timeout
  });
}

/**
 * 触发 USER_INTERACTION_RESPONDED 事件
 * @param task 用户交互任务
 * @param inputData 用户输入数据
 * @param eventManager 事件管理器
 */
export async function emitRespondedEvent(
  task: UserInteractionTask,
  inputData: any,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.USER_INTERACTION_RESPONDED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    interactionId: task.interactionId,
    inputData
  });
}

/**
 * 触发 USER_INTERACTION_PROCESSED 事件
 * @param task 用户交互任务
 * @param operationType 操作类型
 * @param results 处理结果
 * @param eventManager 事件管理器
 */
export async function emitProcessedEvent(
  task: UserInteractionTask,
  operationType: UserInteractionOperationType,
  results: any,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.USER_INTERACTION_PROCESSED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    interactionId: task.interactionId,
    operationType,
    results
  });
}

/**
 * 触发 USER_INTERACTION_FAILED 事件
 * @param task 用户交互任务
 * @param error 错误信息
 * @param eventManager 事件管理器
 */
export async function emitFailedEvent(
  task: UserInteractionTask,
  error: Error | string,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.USER_INTERACTION_FAILED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    interactionId: task.interactionId,
    reason: error instanceof Error ? error.message : error
  });
}

/**
 * 获取用户输入
 * @param task 用户交互任务
 * @param request 交互请求
 * @param context 交互上下文
 * @param handler 用户交互处理器
 * @returns 用户输入数据
 */
export async function getUserInput(
  task: UserInteractionTask,
  request: UserInteractionRequest,
  context: UserInteractionContext,
  handler: UserInteractionHandler
): Promise<any> {
  // 实现超时控制
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`User interaction timeout after ${request.timeout}ms`));
    }, request.timeout);
  });

  // 取消控制
  const cancelPromise = new Promise((_, reject) => {
    const checkCancel = setInterval(() => {
      if (context.cancelToken.cancelled) {
        clearInterval(checkCancel);
        reject(new Error('User interaction cancelled'));
      }
    }, 100);
  });

  try {
    // 竞争：用户输入、超时、取消
    return await Promise.race([
      handler.handle(request, context),
      timeoutPromise,
      cancelPromise
    ]);
  } finally {
    // 清理取消检查
    context.cancelToken.cancel();
  }
}

/**
 * 替换 {{input}} 占位符
 * @param template 模板字符串
 * @param inputData 用户输入数据
 * @returns 替换后的字符串
 */
export function replaceInputPlaceholder(template: string, inputData: any): string {
  if (typeof template !== 'string') {
    return String(template);
  }

  // 替换 {{input}} 占位符
  return template.replace(/\{\{input\}\}/g, String(inputData));
}

/**
 * 计算表达式值（简单实现）
 * @param expression 表达式
 * @param inputData 用户输入数据
 * @returns 计算结果
 */
export function evaluateExpression(expression: string, inputData: any): any {
  // 如果表达式就是 {{input}}，直接返回输入
  if (expression === '{{input}}') {
    return inputData;
  }

  // 如果表达式包含 {{input}}，替换后返回
  if (expression.includes('{{input}}')) {
    return replaceInputPlaceholder(expression, inputData);
  }

  // 否则直接返回表达式（可能是常量值）
  return expression;
}

/**
 * 处理变量更新
 * @param task 用户交互任务
 * @param request 交互请求
 * @param inputData 用户输入数据
 * @returns 更新结果
 */
export async function processVariableUpdate(
  task: UserInteractionTask,
  request: UserInteractionRequest,
  inputData: any
): Promise<Record<string, any>> {
  if (!request.variables || request.variables.length === 0) {
    throw new ExecutionError(
      'No variables defined for UPDATE_VARIABLES operation',
      task.threadContext.getThreadId()
    );
  }

  const results: Record<string, any> = {};

  for (const variableConfig of request.variables) {
    // 替换表达式中的 {{input}} 占位符
    const expression = replaceInputPlaceholder(variableConfig.expression, inputData);
    
    // 计算表达式值
    const value = evaluateExpression(expression, inputData);

    // 更新变量
    await task.threadContext.updateVariable(
      variableConfig.variableName,
      value,
      variableConfig.scope as VariableScope
    );

    results[variableConfig.variableName] = value;
  }

  return results;
}

/**
 * 处理消息添加
 * @param task 用户交互任务
 * @param request 交互请求
 * @param inputData 用户输入数据
 * @returns 添加的消息
 */
export function processMessageAdd(
  task: UserInteractionTask,
  request: UserInteractionRequest,
  inputData: any
): { role: string; content: string } {
  if (!request.message) {
    throw new ExecutionError(
      'No message defined for ADD_MESSAGE operation',
      task.threadContext.getThreadId()
    );
  }

  // 替换内容模板中的 {{input}} 占位符
  const content = replaceInputPlaceholder(request.message.contentTemplate, inputData);

  // 添加消息到对话管理器
  task.threadContext.conversationManager.addMessage({
    role: request.message.role,
    content
  });

  return {
    role: request.message.role,
    content
  };
}

/**
 * 处理用户输入
 * @param task 用户交互任务
 * @param request 交互请求
 * @param inputData 用户输入数据
 * @returns 处理结果
 */
export async function processUserInput(
  task: UserInteractionTask,
  request: UserInteractionRequest,
  inputData: any
): Promise<any> {
  switch (request.operationType) {
    case 'UPDATE_VARIABLES':
      return await processVariableUpdate(task, request, inputData);

    case 'ADD_MESSAGE':
      return processMessageAdd(task, request, inputData);

    default:
      throw new ExecutionError(
        `Unknown operation type: ${task.config.operationType}`,
        task.threadContext.getThreadId()
      );
  }
}

/**
 * 执行用户交互
 * @param node 节点定义
 * @param threadContext 线程上下文
 * @param eventManager 事件管理器
 * @param userInteractionHandler 用户交互处理器
 * @returns 执行结果
 */
export async function executeUserInteraction(
  node: Node,
  threadContext: ThreadContext,
  eventManager: EventManager,
  userInteractionHandler: UserInteractionHandler
): Promise<UserInteractionExecutionResult> {
  const config = node.config as UserInteractionNodeConfig;
  const interactionId = generateId();
  const startTime = Date.now();

  const task: UserInteractionTask = {
    node,
    config,
    threadContext,
    interactionId
  };

  try {
    // 1. 创建交互请求
    const request = createInteractionRequest(task);

    // 2. 触发 USER_INTERACTION_REQUESTED 事件
    await emitRequestedEvent(task, request, eventManager);

    // 3. 创建交互上下文
    const context = createInteractionContext(task, eventManager);

    // 4. 调用应用层处理器获取用户输入
    const inputData = await getUserInput(task, request, context, userInteractionHandler);

    // 5. 触发 USER_INTERACTION_RESPONDED 事件
    await emitRespondedEvent(task, inputData, eventManager);

    // 6. 处理用户输入
    const results = processUserInput(task, request, inputData);

    // 7. 触发 USER_INTERACTION_PROCESSED 事件
    await emitProcessedEvent(task, request.operationType, results, eventManager);

    const executionTime = Date.now() - startTime;

    return {
      interactionId,
      operationType: request.operationType,
      results,
      executionTime
    };
  } catch (error) {
    // 触发 USER_INTERACTION_FAILED 事件
    await emitFailedEvent(
      task,
      error instanceof Error ? error : new Error(String(error)),
      eventManager
    );
    throw error;
  }
}