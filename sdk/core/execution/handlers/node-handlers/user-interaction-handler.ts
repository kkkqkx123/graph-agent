/**
 * 用户交互节点处理器
 * 负责执行USER_INTERACTION节点，处理用户输入和变量更新/消息添加
 * 
 * 设计原则：
 * - 只包含核心执行逻辑，不包含事件触发
 * - 接收已验证的配置
 * - 返回执行结果
 */

import type { Node, UserInteractionNodeConfig } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import type { UserInteractionHandler as AppUserInteractionHandler, UserInteractionRequest } from '@modular-agent/types';
import type { VariableScope } from '@modular-agent/types/common';
import { ExecutionError } from '@modular-agent/types/errors';
import { generateId, now } from '@modular-agent/common-utils';

/**
 * 用户交互执行上下文
 */
export interface UserInteractionHandlerContext {
  /** 用户交互处理器 */
  userInteractionHandler: AppUserInteractionHandler;
  /** 对话管理器 */
  conversationManager?: any; // 简化类型，实际应该使用具体的ConversationManager类型
  /** 超时时间 */
  timeout?: number;
}

/**
 * 用户交互执行结果
 */
export interface UserInteractionExecutionResult {
  /** 交互ID */
  interactionId: string;
  /** 操作类型 */
  operationType: string;
  /** 处理结果 */
  results: any;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 创建交互请求
 */
function createInteractionRequest(
  config: UserInteractionNodeConfig,
  interactionId: string
): UserInteractionRequest {
  return {
    interactionId,
    operationType: config.operationType as any,
    variables: config.variables,
    message: config.message,
    prompt: config.prompt,
    timeout: config.timeout || 30000,
    metadata: config.metadata
  };
}

/**
 * 创建交互上下文
 */
function createInteractionContext(
  thread: Thread,
  node: Node,
  timeout: number,
  conversationManager?: any
): any {
  const cancelToken = {
    cancelled: false,
    cancel: () => { cancelToken.cancelled = true; }
  };

  return {
    threadId: thread.id,
    workflowId: thread.workflowId,
    nodeId: node.id,
    getVariable: (variableName: string, scope?: VariableScope) => {
      // 简化实现，实际应该从thread中获取变量
      return thread.variableScopes.thread?.[variableName];
    },
    setVariable: async (variableName: string, value: any, scope?: VariableScope) => {
      // 简化实现，实际应该更新thread中的变量
      if (!thread.variableScopes.thread) {
        thread.variableScopes.thread = {};
      }
      thread.variableScopes.thread[variableName] = value;
    },
    getVariables: (scope?: VariableScope) => {
      return thread.variableScopes.thread || {};
    },
    timeout,
    cancelToken
  };
}

/**
 * 获取用户输入
 */
async function getUserInput(
  request: UserInteractionRequest,
  context: any,
  handler: AppUserInteractionHandler
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
 */
function replaceInputPlaceholder(template: string, inputData: any): string {
  if (typeof template !== 'string') {
    return String(template);
  }

  // 替换 {{input}} 占位符
  return template.replace(/\{\{input\}\}/g, String(inputData));
}

/**
 * 计算表达式值（简单实现）
 */
function evaluateExpression(expression: string, inputData: any): any {
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
 */
async function processVariableUpdate(
  config: UserInteractionNodeConfig,
  inputData: any,
  thread: Thread
): Promise<Record<string, any>> {
  if (!config.variables || config.variables.length === 0) {
    throw new ExecutionError(
      'No variables defined for UPDATE_VARIABLES operation',
      thread.id
    );
  }

  const results: Record<string, any> = {};

  for (const variableConfig of config.variables) {
    // 替换表达式中的 {{input}} 占位符
    const expression = replaceInputPlaceholder(variableConfig.expression, inputData);
    
    // 计算表达式值
    const value = evaluateExpression(expression, inputData);

    // 更新变量
    if (!thread.variableScopes.thread) {
      thread.variableScopes.thread = {};
    }
    thread.variableScopes.thread[variableConfig.variableName] = value;

    results[variableConfig.variableName] = value;
  }

  return results;
}

/**
 * 处理消息添加
 */
function processMessageAdd(
  config: UserInteractionNodeConfig,
  inputData: any,
  conversationManager?: any
): { role: string; content: string } {
  if (!config.message) {
    throw new ExecutionError(
      'No message defined for ADD_MESSAGE operation'
    );
  }

  // 替换内容模板中的 {{input}} 占位符
  const content = replaceInputPlaceholder(config.message.contentTemplate, inputData);

  // 添加消息到对话管理器
  if (conversationManager) {
    conversationManager.addMessage({
      role: config.message.role,
      content
    });
  }

  return {
    role: config.message.role,
    content
  };
}

/**
 * 处理用户输入
 */
async function processUserInput(
  config: UserInteractionNodeConfig,
  inputData: any,
  thread: Thread,
  conversationManager?: any
): Promise<any> {
  switch (config.operationType) {
    case 'UPDATE_VARIABLES':
      return await processVariableUpdate(config, inputData, thread);

    case 'ADD_MESSAGE':
      return processMessageAdd(config, inputData, conversationManager);

    default:
      throw new ExecutionError(
        `Unknown operation type: ${config.operationType}`
      );
  }
}

/**
 * 用户交互节点处理器
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文
 * @returns 执行结果
 */
export async function userInteractionHandler(
  thread: Thread,
  node: Node,
  context: UserInteractionHandlerContext
): Promise<UserInteractionExecutionResult> {
  const config = node.config as UserInteractionNodeConfig;
  const interactionId = generateId();
  const startTime = Date.now();

  try {
    // 1. 创建交互请求
    const request = createInteractionRequest(config, interactionId);

    // 2. 创建交互上下文
    const interactionContext = createInteractionContext(thread, node, request.timeout, context.conversationManager);

    // 3. 获取用户输入
    const inputData = await getUserInput(request, interactionContext, context.userInteractionHandler);

    // 4. 处理用户输入
    const results = await processUserInput(config, inputData, thread, context.conversationManager);

    const executionTime = Date.now() - startTime;

    return {
      interactionId,
      operationType: config.operationType,
      results,
      executionTime
    };
  } catch (error) {
    throw error;
  }
}