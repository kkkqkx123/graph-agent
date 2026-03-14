/**
 * 启动线程处理函数
 * 负责执行启动新线程的触发动作
 *
 * 职责：
 * - 启动新的工作流线程
 * - 支持同步和异步执行模式
 * - 支持从现有线程触发（作为子线程）或独立启动
 * - 使用 ThreadBuilder 创建线程实体
 *
 * 注意：
 * - 与 execute_triggered_subgraph 不同，start_thread 启动的是普通工作流
 * - 不需要特殊的 START_FROM_TRIGGER 节点
 * - 如果有当前线程，会建立父子关系
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import type { StartThreadActionParameters } from '@modular-agent/types';
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
      message: `Thread execution completed: ${data.graphId}`,
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
      message: `Thread submitted: ${data.graphId}`,
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
 * 启动线程处理函数
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @param threadRegistry 线程注册表
 * @param eventManager 事件管理器
 * @param threadBuilder 线程构建器
 * @param taskQueueManager 任务队列管理器
 * @param currentThreadId 当前线程ID（可选）
 * @returns 执行结果
 */
export async function startThreadHandler(
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
    if (action.type !== 'start_thread') {
      throw new RuntimeValidationError('Action type must be start_thread', { operation: 'handle', field: 'type' });
    }

    const parameters = action.parameters as StartThreadActionParameters;
    const { graphId, input = {}, waitForCompletion = true } = parameters;

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

    // 获取主线程实体（如果存在）
    let mainThreadEntity: ThreadEntity | null = null;
    if (currentThreadId) {
      mainThreadEntity = threadRegistry.get(currentThreadId);
    }

    // 准备输入数据
    const threadInput: Record<string, any> = {
      triggerId,
      ...input,
    };

    // 如果有主线程，传递主线程的输出
    if (mainThreadEntity) {
      threadInput['parentOutput'] = mainThreadEntity.getOutput();
      threadInput['parentInput'] = mainThreadEntity.getInput();
    }

    // 创建线程实体
    const threadEntity = await threadBuilder.build(graphId, {
      input: threadInput,
    });

    // 注册到线程注册表
    threadRegistry.register(threadEntity);

    const threadId = threadEntity.getThreadId();

    // 建立父子关系（如果有主线程）
    if (mainThreadEntity && currentThreadId) {
      mainThreadEntity.registerChildThread(threadId);
      threadEntity.setParentThreadId(currentThreadId);
      threadEntity.setThreadType('DYNAMIC_CHILD');
    }

    // 获取线程池服务和任务注册表
    const threadPoolService = container.get(Identifiers.ThreadPoolService) as ThreadPoolService;
    const taskRegistry = container.get(Identifiers.TaskRegistry) as TaskRegistry;

    // 获取超时配置
    const timeout = threadPoolService.getConfig().defaultTimeout;

    // 根据执行模式选择执行方式
    if (waitForCompletion) {
      // 同步执行
      const result = await executeSync(
        threadEntity,
        taskRegistry,
        taskQueueManager,
        threadPoolService,
        timeout
      );

      // 注销父子关系
      if (mainThreadEntity) {
        mainThreadEntity.unregisterChildThread(threadId);
        // Note: setParentThreadId requires a string, so we don't reset it to undefined
      }

      return createSyncSuccessResult(
        triggerId,
        action,
        {
          graphId,
          threadId,
          input: threadInput,
          output: result.output,
          executionTime: result.executionTime,
        },
        diffTimestamp(startTime, now())
      );
    } else {
      // 异步执行
      const result = executeAsync(
        threadEntity,
        taskRegistry,
        taskQueueManager,
        threadPoolService,
        timeout
      );

      return createAsyncSuccessResult(
        triggerId,
        action,
        {
          graphId,
          threadId,
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
 */
function executeAsync(
  threadEntity: ThreadEntity,
  taskRegistry: TaskRegistry,
  taskQueueManager: TaskQueueManager,
  threadPoolService: ThreadPoolService,
  timeout: number
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

  return {
    threadId,
    status: 'QUEUED',
  };
}
