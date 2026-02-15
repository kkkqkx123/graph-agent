/**
 * HumanRelay 处理函数
 * 提供无状态的人工中继执行功能
 *
 * 职责：
 * - 解析节点配置，创建 HumanRelay 请求
 * - 触发 HumanRelay 事件
 * - 调用应用层处理器获取人工输入
 * - 将人工输入转换为 LLM 消息
 * - 触发处理完成或失败事件
 *
 * 设计原则：
 * - 无状态函数式设计
 * - 职责单一，每个函数只做一件事
 * - 通过参数传递依赖
 * - 与其他 handler 保持一致
 * 
 * 注意：
 * human relay是llm client的替代品，目的在于以人的输入代替llm api调用，与人工审核无关
 */

import type { LLMMessage } from '@modular-agent/types';
import type { HumanRelayRequest, HumanRelayResponse, HumanRelayExecutionResult, HumanRelayHandler, HumanRelayContext } from '@modular-agent/types';
import type { EventManager } from '../../services/event-manager';
import type { ThreadContext } from '../context/thread-context';
import { EventType, MessageRole } from '@modular-agent/types';
import { generateId, now, getErrorMessage, getErrorOrNew } from '@modular-agent/common-utils';

/**
 * HumanRelay 任务接口
 */
export interface HumanRelayTask {
  /** 消息数组（包含对话历史） */
  messages: LLMMessage[];
  /** 提示信息 */
  prompt: string;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 线程上下文 */
  threadContext: ThreadContext;
  /** 请求ID */
  requestId: string;
  /** 节点ID */
  nodeId: string;
}

/**
 * 创建 HumanRelay 请求
 * @param task HumanRelay 任务
 * @returns HumanRelay 请求
 */
export function createHumanRelayRequest(task: HumanRelayTask): HumanRelayRequest {
  return {
    requestId: task.requestId,
    messages: task.messages,
    prompt: task.prompt,
    timeout: task.timeout,
    metadata: {
      workflowId: task.threadContext.getWorkflowId(),
      threadId: task.threadContext.getThreadId(),
      nodeId: task.nodeId
    }
  };
}

/**
 * 创建 HumanRelay 上下文
 * @param task HumanRelay 任务
 * @param eventManager 事件管理器
 * @returns HumanRelay 上下文
 */
export function createHumanRelayContext(
  task: HumanRelayTask,
  eventManager: EventManager
): HumanRelayContext {
  const cancelToken = {
    cancelled: false,
    cancel: () => { cancelToken.cancelled = true; }
  };

  return {
    threadId: task.threadContext.getThreadId(),
    workflowId: task.threadContext.getWorkflowId(),
    nodeId: task.nodeId,
    getVariable: (variableName: string, scope?: string) => {
      return task.threadContext.getVariable(variableName);
    },
    setVariable: async (variableName: string, value: any, scope?: string) => {
      await task.threadContext.updateVariable(variableName, value);
    },
    getVariables: (scope?: string) => {
      return task.threadContext.getAllVariables();
    },
    timeout: task.timeout,
    cancelToken
  };
}

/**
 * 触发 HUMAN_RELAY_REQUESTED 事件
 * @param task HumanRelay 任务
 * @param request HumanRelay 请求
 * @param eventManager 事件管理器
 */
export async function emitHumanRelayRequestedEvent(
  task: HumanRelayTask,
  request: HumanRelayRequest,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.HUMAN_RELAY_REQUESTED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    nodeId: task.nodeId,
    requestId: request.requestId,
    prompt: request.prompt,
    messageCount: request.messages.length,
    timeout: request.timeout
  });
}

/**
 * 触发 HUMAN_RELAY_RESPONDED 事件
 * @param task HumanRelay 任务
 * @param response HumanRelay 响应
 * @param eventManager 事件管理器
 */
export async function emitHumanRelayRespondedEvent(
  task: HumanRelayTask,
  response: HumanRelayResponse,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.HUMAN_RELAY_RESPONDED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    requestId: response.requestId,
    content: response.content
  });
}

/**
 * 触发 HUMAN_RELAY_PROCESSED 事件
 * @param task HumanRelay 任务
 * @param message LLM 消息
 * @param executionTime 执行时间
 * @param eventManager 事件管理器
 */
export async function emitHumanRelayProcessedEvent(
  task: HumanRelayTask,
  message: LLMMessage,
  executionTime: number,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.HUMAN_RELAY_PROCESSED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    requestId: task.requestId,
    message: {
      role: message.role,
      content: message.content
    },
    executionTime
  });
}

/**
 * 触发 HUMAN_RELAY_FAILED 事件
 * @param task HumanRelay 任务
 * @param error 错误信息
 * @param eventManager 事件管理器
 */
export async function emitHumanRelayFailedEvent(
  task: HumanRelayTask,
  error: Error | string,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.HUMAN_RELAY_FAILED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    requestId: task.requestId,
    reason: getErrorMessage(error)
  });
}

/**
 * 获取人工输入
 * @param task HumanRelay 任务
 * @param request HumanRelay 请求
 * @param context HumanRelay 上下文
 * @param handler HumanRelay 处理器
 * @returns HumanRelay 响应
 */
export async function getHumanInput(
  task: HumanRelayTask,
  request: HumanRelayRequest,
  context: HumanRelayContext,
  handler: HumanRelayHandler
): Promise<HumanRelayResponse> {
  // 实现超时控制
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`HumanRelay timeout after ${request.timeout}ms`));
    }, request.timeout);
  });

  // 取消控制
  const cancelPromise = new Promise<never>((_, reject) => {
    const checkCancel = setInterval(() => {
      if (context.cancelToken.cancelled) {
        clearInterval(checkCancel);
        reject(new Error('HumanRelay cancelled'));
      }
    }, 100);
  });

  try {
    // 竞争：人工输入、超时、取消
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
 * 将人工输入转换为 LLM 消息
 * @param task HumanRelay 任务
 * @param response HumanRelay 响应
 * @returns LLM 消息
 */
export function convertToLLMMessage(
  task: HumanRelayTask,
  response: HumanRelayResponse
): LLMMessage {
  return {
    role: MessageRole.USER,
    content: response.content
  };
}

/**
 * 执行 HumanRelay
 * @param messages 消息数组（包含对话历史）
 * @param prompt 提示信息
 * @param timeout 超时时间（毫秒）
 * @param threadContext 线程上下文
 * @param eventManager 事件管理器
 * @param humanRelayHandler HumanRelay 处理器
 * @param nodeId 节点ID
 * @returns 执行结果
 */
export async function executeHumanRelay(
  messages: LLMMessage[],
  prompt: string,
  timeout: number,
  threadContext: ThreadContext,
  eventManager: EventManager,
  humanRelayHandler: HumanRelayHandler,
  nodeId: string
): Promise<HumanRelayExecutionResult> {
  const requestId = generateId();
  const startTime = Date.now();

  const task: HumanRelayTask = {
    messages,
    prompt,
    timeout,
    threadContext,
    requestId,
    nodeId
  };

  try {
    // 1. 创建 HumanRelay 请求
    const request = createHumanRelayRequest(task);

    // 2. 触发 HUMAN_RELAY_REQUESTED 事件
    await emitHumanRelayRequestedEvent(task, request, eventManager);

    // 3. 创建 HumanRelay 上下文
    const context = createHumanRelayContext(task, eventManager);

    // 4. 调用应用层处理器获取人工输入
    const response = await getHumanInput(task, request, context, humanRelayHandler);

    // 5. 触发 HUMAN_RELAY_RESPONDED 事件
    await emitHumanRelayRespondedEvent(task, response, eventManager);

    // 6. 将人工输入转换为 LLM 消息
    const message = convertToLLMMessage(task, response);

    // 7. 触发 HUMAN_RELAY_PROCESSED 事件
    const executionTime = Date.now() - startTime;
    await emitHumanRelayProcessedEvent(task, message, executionTime, eventManager);

    return {
      requestId,
      message,
      executionTime
    };
  } catch (error) {
    // 触发 HUMAN_RELAY_FAILED 事件
    await emitHumanRelayFailedEvent(
      task,
      getErrorOrNew(error),
      eventManager
    );
    throw error;
  }
}