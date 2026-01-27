/**
 * ThreadExecutor - Thread 执行器
 * 负责执行单个 ThreadContext 实例，管理 thread 的完整执行生命周期
 *
 * 通过事件驱动机制与 ThreadCoordinator 解耦，避免循环依赖
 */

import type { ThreadOptions, ThreadResult } from '../../types/thread';
import type { Node } from '../../types/node';
import type { NodeExecutionResult } from '../../types/thread';
import { ThreadRegistry } from './registrys/thread-registry';
import { ThreadBuilder } from './thread-builder';
import { ThreadLifecycleManager } from './thread-lifecycle-manager';
import { ThreadContext } from './context/thread-context';
import { Router } from './router';
import { NodeExecutorFactory } from './executors/node-executor-factory';
import { NodeType } from '../../types/node';
import { EventManager } from './managers/event-manager';
import { ExecutionError, TimeoutError, NotFoundError } from '../../types/errors';
import { EventType } from '../../types/events';
import type { NodeStartedEvent, NodeCompletedEvent, NodeFailedEvent, ErrorEvent } from '../../types/events';
import { TriggerManager } from './managers/trigger-manager';
import { WorkflowRegistry } from './registrys/workflow-registry';
import { ExecutionSingletons } from './singletons';
import { InternalEventType } from '../../types/internal-events';
import type { ForkCompletedEvent, ForkFailedEvent, JoinCompletedEvent, JoinFailedEvent } from '../../types/internal-events';

/**
 * ThreadExecutor - Thread 执行器
 *
 * 通过事件驱动机制与 ThreadCoordinator 解耦，避免循环依赖
 * 使用 ExecutionSingletons 获取全局单例组件
 */
export class ThreadExecutor {
  private threadRegistry: ThreadRegistry;
  private threadBuilder: ThreadBuilder;
  private lifecycleManager: ThreadLifecycleManager;
  private router: Router;
  private eventManager: EventManager;
  private triggerManager: TriggerManager;
  private workflowRegistry: WorkflowRegistry;

  constructor(workflowRegistry?: WorkflowRegistry) {
    // 使用 ExecutionSingletons 获取单例组件
    this.workflowRegistry = workflowRegistry || ExecutionSingletons.getWorkflowRegistry();
    this.threadRegistry = ExecutionSingletons.getThreadRegistry();
    this.eventManager = ExecutionSingletons.getEventManager();

    // 创建非单例组件
    this.threadBuilder = new ThreadBuilder(this.workflowRegistry);
    this.router = new Router();
    this.lifecycleManager = new ThreadLifecycleManager(this.eventManager);

    // 初始化 TriggerManager（已移除对 ThreadExecutor 的依赖）
    this.triggerManager = new TriggerManager(this.eventManager, this.threadBuilder);
  }

  /**
   * 获取事件管理器
   * @returns 事件管理器
   */
  getEventManager(): EventManager {
    return this.eventManager;
  }

  /**
   * 获取触发器管理器
   * @returns 触发器管理器
   */
  getTriggerManager(): TriggerManager {
    return this.triggerManager;
  }

  /**
   * 执行 ThreadContext
   * @param threadContext ThreadContext 实例
   * @param options 线程选项
   * @returns 线程执行结果
   */
  async execute(threadContext: ThreadContext, options: ThreadOptions = {}): Promise<ThreadResult> {
    // 注册到 ThreadRegistry
    this.threadRegistry.register(threadContext);
    return this.executeThread(threadContext, options);
  }

  /**
   * 执行 ThreadContext
   * @param threadContext ThreadContext 实例
   * @param options 线程选项
   * @returns 线程执行结果
   */
  private async executeThread(threadContext: ThreadContext, options: ThreadOptions = {}): Promise<ThreadResult> {
    const thread = threadContext.thread;

    // 步骤1：验证 thread 状态
    if (thread.status !== 'CREATED' && thread.status !== 'PAUSED') {
      throw new ExecutionError(`Thread is not in a valid state for execution: ${thread.status}`, undefined, thread.workflowId);
    }

    // 步骤2：使用 ThreadLifecycleManager 启动 thread
    await this.lifecycleManager.startThread(thread);

    // 步骤3：开始执行循环
    try {
      await this.executeLoop(threadContext, options);
    } catch (error) {
      // 处理执行错误
      await this.lifecycleManager.failThread(thread, error instanceof Error ? error : new Error(String(error)));

      // 触发 ERROR 事件（全局错误事件）
      const errorEvent: ErrorEvent = {
        type: EventType.ERROR,
        timestamp: Date.now(),
        workflowId: thread.workflowId,
        threadId: thread.id,
        error: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined
      };
      await this.eventManager.emit(errorEvent);

      return {
        threadId: thread.id,
        success: false,
        output: thread.output,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - thread.startTime,
        nodeResults: Array.from(thread.nodeResults.values()),
        metadata: thread.metadata
      };
    }

    // 步骤4：处理执行完成
    const executionTime = Date.now() - thread.startTime;
    const result: ThreadResult = {
      threadId: thread.id,
      success: true,
      output: thread.output,
      executionTime,
      nodeResults: Array.from(thread.nodeResults.values()),
      metadata: thread.metadata
    };

    await this.lifecycleManager.completeThread(thread, result);

    return result;
  }

  /**
   * 执行循环
   * @param threadContext ThreadContext 实例
   * @param options 线程选项
   */
  private async executeLoop(threadContext: ThreadContext, options: ThreadOptions = {}): Promise<void> {
    const thread = threadContext.thread;
    const workflowContext = threadContext.workflowContext;

    const maxSteps = options.maxSteps || 1000;
    const timeout = options.timeout || 60000;
    const startTime = Date.now();
    let stepCount = 0;

    while (stepCount < maxSteps) {
      // 检查超时
      if (Date.now() - startTime > timeout) {
        throw new TimeoutError('Thread execution timeout', timeout);
      }

      // 检查 thread 状态
      if (thread.status !== 'RUNNING') {
        break;
      }

      // 获取当前节点
      const currentNodeId = thread.currentNodeId;
      if (!currentNodeId) {
        break;
      }

      const currentNode = workflowContext.getNode(currentNodeId);
      if (!currentNode) {
        throw new NotFoundError(`Node not found: ${currentNodeId}`, 'Node', currentNodeId);
      }

      // 检查是否为 END 节点
      if (currentNode.type === NodeType.END) {
        break;
      }

      // 执行节点
      const result = await this.executeNode(threadContext, currentNode);

      // 记录执行结果到Thread.executionHistory
      thread.nodeResults.push(result);

      // 调用回调
      if (options.onNodeExecuted) {
        await options.onNodeExecuted(result);
      }

      // 路由到下一个节点
      const edges = workflowContext.getOutgoingEdges(currentNodeId);
      const nextNodeId = this.router.selectNextNode(currentNode, edges, thread);

      if (!nextNodeId) {
        // 没有可用的路由，检查是否为 END 节点
        // 注意：这里不需要检查，因为已经在前面检查过了
        break;
      }

      // 更新当前节点
      thread.currentNodeId = nextNodeId;

      // 更新步数
      stepCount++;
    }

    if (stepCount >= maxSteps) {
      throw new ExecutionError(
        'Maximum execution steps exceeded',
        thread.currentNodeId,
        thread.workflowId
      );
    }
  }

  /**
   * 执行节点
   * @param threadContext ThreadContext 实例
   * @param node 节点定义
   * @returns 节点执行结果
   */
  private async executeNode(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
    const thread = threadContext.thread;

    // 触发 NODE_STARTED 事件
    const startedEvent: NodeStartedEvent = {
      type: EventType.NODE_STARTED,
      timestamp: Date.now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      nodeId: node.id,
      nodeType: node.type
    };
    await this.eventManager.emit(startedEvent);

    let result: NodeExecutionResult;

    try {
      // 检查节点类型
      if (node.type === NodeType.FORK) {
        result = await this.handleForkNode(threadContext, node);
      } else if (node.type === NodeType.JOIN) {
        result = await this.handleJoinNode(threadContext, node);
      } else {
        // 执行普通节点
        const executor = NodeExecutorFactory.createExecutor(node.type);
        // 传递事件发射函数给 NodeExecutor，用于 Hook 执行
        result = await executor.execute(thread, node, (event) => this.eventManager.emit(event));
      }

      // 触发 NODE_COMPLETED 事件
      const completedEvent: NodeCompletedEvent = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: thread.workflowId,
        threadId: thread.id,
        nodeId: node.id,
        output: result.output,
        executionTime: result.executionTime || 0
      };
      await this.eventManager.emit(completedEvent);

      return result;
    } catch (error) {
      // 触发 ERROR 事件（全局错误事件）
      const errorEvent: ErrorEvent = {
        type: EventType.ERROR,
        timestamp: Date.now(),
        workflowId: thread.workflowId,
        threadId: thread.id,
        nodeId: node.id,
        error: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined
      };
      await this.eventManager.emit(errorEvent);

      // 触发 NODE_FAILED 事件
      const failedEvent: NodeFailedEvent = {
        type: EventType.NODE_FAILED,
        timestamp: Date.now(),
        workflowId: thread.workflowId,
        threadId: thread.id,
        nodeId: node.id,
        error: error instanceof Error ? error.message : String(error)
      };
      await this.eventManager.emit(failedEvent);

      throw error;
    }
  }

  /**
   * 处理 Fork 节点
   * 通过事件驱动机制调用 ThreadCoordinator，避免循环依赖
   * @param threadContext ThreadContext 实例
   * @param node Fork 节点定义
   * @returns 节点执行结果
   */
  private async handleForkNode(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
    const thread = threadContext.thread;
    const startTime = Date.now();

    // 获取 Fork 配置
    const forkConfig = node.config as any;
    if (!forkConfig || !forkConfig.forkId) {
      throw new ExecutionError('Fork node must have forkId config', node.id, thread.workflowId);
    }

    // 发布 Fork 请求事件
    const requestId = `fork-${thread.id}-${node.id}-${Date.now()}`;

    // 监听 Fork 完成事件
    const completedPromise = new Promise<string[]>((resolve, reject) => {
      const unregister = this.eventManager.onInternal(
        InternalEventType.FORK_COMPLETED,
        (event: ForkCompletedEvent) => {
          if (event.threadId === thread.id) {
            unregister();
            resolve(event.childThreadIds);
          }
        }
      );

      // 监听 Fork 失败事件
      const unregisterFailed = this.eventManager.onInternal(
        InternalEventType.FORK_FAILED,
        (event: ForkFailedEvent) => {
          if (event.threadId === thread.id) {
            unregister();
            unregisterFailed();
            reject(new ExecutionError(event.error, node.id, thread.workflowId));
          }
        }
      );
    });

    // 发布 Fork 请求事件
    await this.eventManager.emitInternal({
      type: InternalEventType.FORK_REQUEST,
      timestamp: Date.now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      parentThreadContext: threadContext,
      forkId: forkConfig.forkId,
      forkStrategy: forkConfig.forkStrategy || 'serial'
    });

    // 等待 Fork 完成
    const childThreadIds = await completedPromise;

    // 更新 thread 元数据
    if (!thread.metadata) {
      thread.metadata = {};
    }
    thread.metadata.childThreadIds = childThreadIds;

    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      step: thread.nodeResults.length + 1,
      output: { childThreadIds },
      executionTime: Date.now() - startTime,
      startTime,
      endTime: Date.now()
    };
  }

  /**
   * 处理 Join 节点
   * 通过事件驱动机制调用 ThreadCoordinator，避免循环依赖
   * @param threadContext ThreadContext 实例
   * @param node Join 节点定义
   * @returns 节点执行结果
   */
  private async handleJoinNode(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
    const thread = threadContext.thread;
    const startTime = Date.now();

    // 获取 Join 配置
    const joinConfig = node.config as any;
    if (!joinConfig || !joinConfig.joinId) {
      throw new ExecutionError('Join node must have joinId config', node.id, thread.workflowId);
    }

    // 获取子 thread ID
    const childThreadIds = thread.metadata?.childThreadIds as string[] || [];
    if (childThreadIds.length === 0) {
      throw new ExecutionError('No child threads to join', node.id, thread.workflowId);
    }

    // 监听 Join 完成事件
    const completedPromise = new Promise<any>((resolve, reject) => {
      const unregister = this.eventManager.onInternal(
        InternalEventType.JOIN_COMPLETED,
        (event: JoinCompletedEvent) => {
          if (event.threadId === thread.id) {
            unregister();
            resolve(event.result);
          }
        }
      );

      // 监听 Join 失败事件
      const unregisterFailed = this.eventManager.onInternal(
        InternalEventType.JOIN_FAILED,
        (event: JoinFailedEvent) => {
          if (event.threadId === thread.id) {
            unregister();
            unregisterFailed();
            reject(new ExecutionError(event.error, node.id, thread.workflowId));
          }
        }
      );
    });

    // 发布 Join 请求事件
    await this.eventManager.emitInternal({
      type: InternalEventType.JOIN_REQUEST,
      timestamp: Date.now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      parentThreadContext: threadContext,
      childThreadIds,
      joinStrategy: joinConfig.joinStrategy,
      timeout: joinConfig.timeout || 60
    });

    // 等待 Join 完成
    const joinResult = await completedPromise;

    // 更新 thread 输出
    thread.output = joinResult.output;

    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      step: thread.nodeResults.length + 1,
      output: joinResult.output,
      executionTime: Date.now() - startTime,
      startTime,
      endTime: Date.now()
    };
  }

  /**
   * 暂停执行
   * @param threadId 线程ID
   */
  async pause(threadId: string): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;
    if (threadContext.getStatus() !== 'RUNNING') {
      throw new ExecutionError(`Thread is not running: ${threadId}`, undefined, threadContext.getWorkflowId());
    }

    await this.lifecycleManager.pauseThread(thread);
  }

  /**
   * 恢复执行
   * @param threadId 线程ID
   * @param options 线程选项
   * @returns 线程执行结果
   */
  async resume(threadId: string, options: ThreadOptions = {}): Promise<ThreadResult> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;
    if (threadContext.getStatus() !== 'PAUSED') {
      throw new ExecutionError(`Thread is not paused: ${threadId}`, undefined, threadContext.getWorkflowId());
    }

    await this.lifecycleManager.resumeThread(thread);

    // 继续执行
    return this.executeThread(threadContext, options);
  }

  /**
   * 取消执行
   * @param threadId 线程ID
   */
  async cancel(threadId: string): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;
    const status = threadContext.getStatus();
    if (status !== 'RUNNING' && status !== 'PAUSED') {
      throw new ExecutionError(`Thread is not running or paused: ${threadId}`, undefined, threadContext.getWorkflowId());
    }

    await this.lifecycleManager.cancelThread(thread);

    // 取消子 thread（如果有）
    const childThreadIds = threadContext.getMetadata()?.childThreadIds as string[] || [];
    for (const childThreadId of childThreadIds) {
      await this.cancel(childThreadId);
    }
  }

  /**
   * 获取 ThreadContext
   * @param threadId 线程ID
   * @returns ThreadContext 实例
   */
  getThreadContext(threadId: string): ThreadContext | null {
    return this.threadRegistry.get(threadId);
  }

  /**
   * 获取所有 ThreadContext
   * @returns ThreadContext 数组
   */
  getAllThreadContexts(): ThreadContext[] {
    return this.threadRegistry.getAll();
  }

  /**
   * 跳过节点
   * @param threadId 线程ID
   * @param nodeId 节点ID
   */
  async skipNode(threadId: string, nodeId: string): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;

    // 标记节点为跳过状态
    const result: NodeExecutionResult = {
      nodeId,
      nodeType: 'UNKNOWN',
      status: 'SKIPPED',
      step: thread.nodeResults.length + 1,
      executionTime: 0
    };

    thread.nodeResults.push(result);

    // 触发 NODE_COMPLETED 事件（状态为 SKIPPED）
    const completedEvent: NodeCompletedEvent = {
      type: EventType.NODE_COMPLETED,
      timestamp: Date.now(),
      workflowId: threadContext.getWorkflowId(),
      threadId: threadContext.getThreadId(),
      nodeId,
      output: null,
      executionTime: 0
    };
    await this.eventManager.emit(completedEvent);
  }

  /**
   * 设置变量
   * @param threadId 线程ID
   * @param variables 变量对象
   */
  async setVariables(threadId: string, variables: Record<string, any>): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    // 使用ThreadContext的setVariable方法设置变量
    for (const [name, value] of Object.entries(variables)) {
      threadContext.setVariable(name, value, typeof value as any, 'local', false);
    }
  }
}