/**
 * 创建线程处理器
 * 提供无状态的动态线程创建功能
 *
 * 职责：
 * - 接收工具调用请求
 * - 解析参数并创建 DynamicThreadManager
 * - 调用 DynamicThreadManager 创建动态线程
 * - 处理返回结果并转换为 ToolExecutionResult
 *
 * 设计原则：
 * - 无状态函数式设计
 * - 职责单一，每个函数只做一件事
 * - 与其他工具处理函数保持一致
 * - 支持同步和异步执行模式
 */

import type { ThreadEntity } from '../../../entities/thread-entity.js';
import type { ThreadRegistry } from '../../../services/thread-registry.js';
import type { TaskRegistry } from '../../../services/task-registry.js';
import type { EventManager } from '../../../services/event-manager.js';
import type { ThreadBuilder } from '../../thread-builder.js';
import type { TaskQueueManager } from '../../managers/task-queue-manager.js';
import type { ThreadExecutor } from '../../thread-executor.js';
import { DynamicThreadManager } from '../../managers/dynamic-thread-manager.js';
import { ThreadPoolService } from '../../../services/thread-pool-service.js';
import {
  type CreateDynamicThreadRequest,
  type ExecutedThreadResult,
  type ThreadSubmissionResult,
  type DynamicThreadConfig
} from '../../types/dynamic-thread.types.js';
import { getErrorMessage, getErrorOrNew, now, diffTimestamp } from '@modular-agent/common-utils';
import { ToolError } from '@modular-agent/types';
import { getContainer } from '../../../di/index.js';
import * as Identifiers from '../../../di/service-identifiers.js';

/**
 * 工具执行结果接口
 */
export interface ToolExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 创建线程请求参数接口
 */
export interface CreateThreadRequest {
  /** 工作流 ID */
  workflowId: string;
  /** 输入数据 */
  input?: Record<string, any>;
  /** 触发器 ID */
  triggerId?: string;
  /** 配置选项 */
  config?: DynamicThreadConfig;
}

/**
 * 创建动态线程
 * @param action 工具调用动作
 * @param triggerId 触发器 ID
 * @param executionContext 执行上下文
 * @returns 工具执行结果
 */
export async function createThreadHandler(
  action: CreateThreadRequest,
  triggerId: string,
  threadRegistry: ThreadRegistry,
  taskRegistry: TaskRegistry,
  eventManager: EventManager,
  threadBuilder: ThreadBuilder,
  taskQueueManager: TaskQueueManager,
  currentThreadId?: string
): Promise<ToolExecutionResult> {
  const startTime = now();

  try {
    // 验证参数
    if (!action.workflowId) {
      throw new ToolError('workflowId is required', 'create-thread');
    }

    // 获取主线程 ThreadEntity
    if (!currentThreadId) {
      throw new ToolError('Current thread ID not provided', 'create-thread');
    }
    const mainThreadEntity = threadRegistry.get(currentThreadId);

    if (!mainThreadEntity) {
      throw new ToolError('Main thread entity not found', 'create-thread');
    }

    // 准备输入数据
    const input = action.input || {};

    // 创建 DynamicThreadManager
    const container = getContainer();
    const threadPoolService = container.get(Identifiers.ThreadPoolService);
    const dynamicThreadManager = new DynamicThreadManager(
      threadRegistry,
      threadBuilder,
      taskRegistry,
      taskQueueManager,
      eventManager,
      threadPoolService
    );

    // 创建线程请求
    const request: CreateDynamicThreadRequest = {
      workflowId: action.workflowId,
      input,
      triggerId: action.triggerId || triggerId,
      mainThreadEntity,
      config: action.config
    };

    // 调用 DynamicThreadManager 创建线程
    const result = await dynamicThreadManager.createDynamicThread(request);

    // 处理返回结果
    const executionTime = diffTimestamp(startTime, now());

    // 判断是同步执行还是异步执行
    if ('threadEntity' in result) {
      // 同步执行结果
      const syncResult = result as ExecutedThreadResult;
      return {
        success: true,
        result: {
          message: 'Dynamic thread execution completed',
          workflowId: action.workflowId,
          input,
          output: syncResult.threadEntity.getOutput(),
          waitForCompletion: true,
          executed: true,
          completed: true,
          executionTime: syncResult.executionTime
        },
        executionTime
      };
    } else {
      // 异步执行结果
      const asyncResult = result as ThreadSubmissionResult;
      return {
        success: true,
        result: {
          message: 'Dynamic thread submitted',
          workflowId: action.workflowId,
          threadId: asyncResult.threadId,
          status: asyncResult.status,
          waitForCompletion: false,
          executed: true,
          completed: false,
          executionTime
        },
        executionTime
      };
    }
  } catch (error) {
    const executionTime = diffTimestamp(startTime, now());
    const errorMessage = getErrorMessage(error);

    return {
      success: false,
      error: errorMessage,
      executionTime
    };
  }
}

/**
 * 取消动态线程
 * @param action 工具调用动作
 * @param triggerId 触发器 ID
 * @param executionContext 执行上下文
 * @returns 工具执行结果
 */
export async function cancelThreadHandler(
  action: { threadId: string },
  triggerId: string,
  threadRegistry: ThreadRegistry,
  taskRegistry: TaskRegistry,
  eventManager: EventManager,
  threadBuilder: ThreadBuilder,
  taskQueueManager: TaskQueueManager
): Promise<ToolExecutionResult> {
  const startTime = now();

  try {
    // 验证参数
    if (!action.threadId) {
      throw new ToolError('threadId is required', 'cancel-thread');
    }

    // 创建 DynamicThreadManager
    const container = getContainer();
    const threadPoolService = container.get(Identifiers.ThreadPoolService);
    const dynamicThreadManager = new DynamicThreadManager(
      threadRegistry,
      threadBuilder,
      taskRegistry,
      taskQueueManager,
      eventManager,
      threadPoolService
    );

    // 取消线程
    const success = dynamicThreadManager.cancelDynamicThread(action.threadId);

    const executionTime = diffTimestamp(startTime, now());

    return {
      success,
      result: {
        message: success ? 'Thread cancelled successfully' : 'Failed to cancel thread',
        threadId: action.threadId,
        cancelled: success
      },
      executionTime
    };
  } catch (error) {
    const executionTime = diffTimestamp(startTime, now());
    const errorMessage = getErrorMessage(error);

    return {
      success: false,
      error: errorMessage,
      executionTime
    };
  }
}

/**
 * 查询动态线程状态
 * @param action 工具调用动作
 * @param triggerId 触发器 ID
 * @param executionContext 执行上下文
 * @returns 工具执行结果
 */
export async function getThreadStatusHandler(
  action: { threadId: string },
  triggerId: string,
  threadRegistry: ThreadRegistry,
  taskRegistry: TaskRegistry,
  eventManager: EventManager,
  threadBuilder: ThreadBuilder,
  taskQueueManager: TaskQueueManager
): Promise<ToolExecutionResult> {
  const startTime = now();

  try {
    // 验证参数
    if (!action.threadId) {
      throw new ToolError('threadId is required', 'get-thread-status');
    }

    // 创建 DynamicThreadManager
    const container = getContainer();
    const threadPoolService = container.get(Identifiers.ThreadPoolService);
    const dynamicThreadManager = new DynamicThreadManager(
      threadRegistry,
      threadBuilder,
      taskRegistry,
      taskQueueManager,
      eventManager,
      threadPoolService
    );

    // 查询线程状态
    const threadStatus = dynamicThreadManager.getThreadStatus(action.threadId);

    const executionTime = diffTimestamp(startTime, now());

    if (!threadStatus) {
      return {
        success: false,
        error: 'Thread not found',
        executionTime
      };
    }

    return {
      success: true,
      result: {
        threadId: threadStatus.id,
        status: threadStatus.status,
        submitTime: threadStatus.submitTime,
        startTime: threadStatus.startTime,
        completeTime: threadStatus.completeTime,
        parentThreadId: threadStatus.parentThreadId,
        hasResult: !!threadStatus.result,
        hasError: !!threadStatus.error
      },
      executionTime
    };
  } catch (error) {
    const executionTime = diffTimestamp(startTime, now());
    const errorMessage = getErrorMessage(error);

    return {
      success: false,
      error: errorMessage,
      executionTime
    };
  }
}
