/**
 * 启动动态子线程处理函数
 * 负责执行启动动态子线程的触发动作
 *
 * 职责：
 * - 启动新的动态子线程（DYNAMIC_CHILD类型）
 * - 建立父子线程关系
 * - 支持同步和异步执行模式
 * - 传递父线程的输入输出数据
 * - 使用 ThreadBuilder 创建线程实体
 *
 * 注意：
 * - 与 execute_triggered_subgraph 不同，start_dynamic_child 启动的是普通工作流
 * - 不需要特殊的 START_FROM_TRIGGER 节点
 * - 建立父子关系，支持级联取消和回调机制
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import type { StartDynamicChildActionParameters } from '@modular-agent/types';
import { RuntimeValidationError, ThreadContextNotFoundError, WorkflowNotFoundError } from '@modular-agent/types';
import type { ThreadRegistry } from '../../../services/thread-registry.js';
import type { EventManager } from '../../../../core/managers/event-manager.js';
import type { ThreadBuilder } from '../../thread-builder.js';
import type { TaskQueueManager } from '../../managers/task-queue-manager.js';
import type { ThreadEntity } from '../../../entities/thread-entity.js';
import { getErrorMessage, now, diffTimestamp } from '@modular-agent/common-utils';
import { getContainer } from '../../../../core/di/index.js';
import * as Identifiers from '../../../../core/di/service-identifiers.js';
import { ThreadPoolService } from '../../../services/thread-pool-service.js';
import { TaskRegistry, type TaskManager } from '../../../services/task-registry.js';

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
      message: `Dynamic child thread execution completed: ${data.graphId}`,
      graphId: data.graphId,
      threadId: data.threadId,
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
      message: `Dynamic child thread submitted: ${data.graphId}`,
      graphId: data.graphId,
      threadId: data.threadId,
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
 * 启动动态子线程处理函数
 *
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @param threadRegistry 线程注册表
 * @param eventManager 事件管理器
 * @param threadBuilder 线程构建器
 * @param taskQueueManager 任务队列管理器
 * @param currentThreadId 当前线程ID（必需，用于建立父子关系）
 * @returns 执行结果
 */
export async function startDynamicChildHandler(
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
    // 验证动作类型
    if (action.type !== 'start_dynamic_child') {
      throw new RuntimeValidationError('Action type must be start_dynamic_child', { operation: 'handle', field: 'type' });
    }

    // 验证当前线程ID（必需，用于建立父子关系）
    if (!currentThreadId) {
      throw new ThreadContextNotFoundError('Current thread ID is required for start_dynamic_child', 'current');
    }

    const parameters = action.parameters as StartDynamicChildActionParameters;
    const { graphId, input = {}, waitForCompletion = true, timeout: customTimeout } = parameters;

    // 验证必需参数
    if (!graphId) {
      throw new RuntimeValidationError('Missing required parameter: graphId', { operation: 'handle', field: 'graphId' });
    }

    // 从 graph-registry 获取已预处理的图
    const container = getContainer();
    const graphRegistry = container.get(Identifiers.GraphRegistry);
    const processedGraph = graphRegistry.get(graphId);

    if (!processedGraph) {
      throw new WorkflowNotFoundError(`Graph not found or not preprocessed: ${graphId}`, graphId);
    }

    // 获取主线程实体
    const mainThreadEntity = threadRegistry.get(currentThreadId);
    if (!mainThreadEntity) {
      throw new ThreadContextNotFoundError(`Main thread entity not found: ${currentThreadId}`, currentThreadId);
    }

    // 准备输入数据（包含父线程的输入输出）
    const threadInput: Record<string, any> = {
      triggerId,
      parentOutput: mainThreadEntity.getOutput(),
      parentInput: mainThreadEntity.getInput(),
      ...input,
    };

    // 创建子线程实体
    const childThreadEntity = await threadBuilder.build(graphId, {
      input: threadInput,
    });

    // 设置线程类型为 DYNAMIC_CHILD
    childThreadEntity.setThreadType('DYNAMIC_CHILD');

    // 注册到线程注册表
    threadRegistry.register(childThreadEntity);

    const childThreadId = childThreadEntity.getThreadId();

    // 建立父子关系
    mainThreadEntity.registerChildThread(childThreadId);
    childThreadEntity.setParentThreadId(currentThreadId);

    // 获取线程池服务和任务注册表
    const threadPoolService = container.get(Identifiers.ThreadPoolService) as ThreadPoolService;
    const taskRegistry = container.get(Identifiers.TaskRegistry) as TaskRegistry;

    // 获取超时配置
    const timeout = customTimeout || threadPoolService.getConfig().defaultTimeout;

    // 根据执行模式选择执行方式
    if (waitForCompletion) {
      // 同步执行
      const result = await executeSync(
        childThreadEntity,
        taskRegistry,
        taskQueueManager,
        threadPoolService,
        timeout
      );

      // 注销父子关系
      mainThreadEntity.unregisterChildThread(childThreadId);

      return createSyncSuccessResult(
        triggerId,
        action,
        {
          graphId,
          threadId: childThreadId,
          input: threadInput,
          output: result.output,
          executionTime: result.executionTime,
        },
        diffTimestamp(startTime, now())
      );
    } else {
      // 异步执行
      const result = executeAsync(
        childThreadEntity,
        taskRegistry,
        taskQueueManager,
        threadPoolService,
        timeout,
        threadRegistry,
        mainThreadEntity,
        childThreadId
      );

      return createAsyncSuccessResult(
        triggerId,
        action,
        {
          graphId,
          threadId: childThreadId,
          status: result.status,
          executionTime: diffTimestamp(startTime, now()),
        },
        diffTimestamp(startTime, now())
      );
    }
  } catch (error) {
    const executionTime = diffTimestamp(startTime, now());
    return createFailureResult(triggerId, action, error, executionTime);
  }
}

/**
 * 同步执行线程
 */
async function executeSync(
  threadEntity: ThreadEntity,
  taskRegistry: TaskRegistry,
  taskQueueManager: TaskQueueManager,
  threadPoolService: ThreadPoolService,
  timeout: number
): Promise<{ output: any; executionTime: number }> {
  const threadId = threadEntity.getThreadId();
  const startTime = now();

  // 创建任务管理器适配器
  const taskManager: TaskManager = {
    cancelTask: async (taskId: string) => {
      return taskQueueManager.cancelTask(taskId);
    },
    getTaskStatus: (taskId: string) => {
      return taskRegistry.get(taskId);
    }
  };

  // 注册任务
  const taskId = taskRegistry.register(threadEntity, taskManager, timeout);

  // 提交到任务队列
  taskQueueManager.submitSync(taskId, threadEntity, timeout);

  // 等待线程完成
  return new Promise((resolve, reject) => {
    const checkCompletion = () => {
      const status = threadEntity.getStatus();
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
        if (status === 'COMPLETED') {
          resolve({
            output: threadEntity.getOutput(),
            executionTime: diffTimestamp(startTime, now()),
          });
        } else {
          reject(new Error(`Thread execution failed with status: ${status}`));
        }
      } else {
        // 继续检查
        setTimeout(checkCompletion, 100);
      }
    };
    checkCompletion();
  });
}

/**
 * 异步执行线程
 * 注册完成回调以清理父子关系
 */
function executeAsync(
  threadEntity: ThreadEntity,
  taskRegistry: TaskRegistry,
  taskQueueManager: TaskQueueManager,
  threadPoolService: ThreadPoolService,
  timeout: number,
  threadRegistry: ThreadRegistry,
  parentThreadEntity: ThreadEntity,
  childThreadId: string
): { threadId: string; status: string } {
  const threadId = threadEntity.getThreadId();

  // 创建任务管理器适配器
  const taskManager: TaskManager = {
    cancelTask: async (taskId: string) => {
      return taskQueueManager.cancelTask(taskId);
    },
    getTaskStatus: (taskId: string) => {
      return taskRegistry.get(taskId);
    }
  };

  // 注册任务
  const taskId = taskRegistry.register(threadEntity, taskManager, timeout);

  // 提交到任务队列（异步）
  taskQueueManager.submitAsync(taskId, threadEntity, timeout);

  // 设置完成回调以清理父子关系
  const checkCompletion = () => {
    const status = threadEntity.getStatus();
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
      // 清理父子关系
      parentThreadEntity.unregisterChildThread(childThreadId);
    } else {
      // 继续检查
      setTimeout(checkCompletion, 100);
    }
  };
  // 开始检查
  setTimeout(checkCompletion, 100);

  return {
    threadId,
    status: 'QUEUED',
  };
}
