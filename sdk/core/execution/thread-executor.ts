/**
 * ThreadExecutor - Thread 执行器
 * 负责执行单个 thread 实例，管理 thread 的完整执行生命周期
 * 同时支持从 workflow 创建 thread
 */

import type { WorkflowDefinition } from '../../types/workflow';
import type { Thread, ThreadOptions, ThreadResult, ThreadStatus } from '../../types/thread';
import type { Node } from '../../types/node';
import type { NodeExecutionResult } from '../../types/thread';
import { ThreadRegistry } from './thread-registry';
import { ThreadBuilder } from './thread-builder';
import { ThreadLifecycleManager } from './thread-lifecycle-manager';
import { WorkflowContext } from './workflow-context';
import { Router } from './router';
import { NodeExecutorFactory } from './executors/node-executor-factory';
import { NodeType } from '../../types/node';
import { EventManager } from './event-manager';
import { ThreadCoordinator } from './thread-coordinator';
import { ExecutionError, TimeoutError, NotFoundError, ValidationError as SDKValidationError } from '../../types/errors';
import { EventType } from '../../types/events';
import type { NodeStartedEvent, NodeCompletedEvent, NodeFailedEvent, TokenLimitExceededEvent, ErrorEvent } from '../../types/events';
import { LLMWrapper } from '../llm/wrapper';
import { ToolService } from '../tools/tool-service';
import { Conversation } from '../llm/conversation';
import { TriggerManager } from './trigger-manager';

/**
 * ThreadExecutor - Thread 执行器
 */
export class ThreadExecutor {
  private threadRegistry: ThreadRegistry;
  private threadBuilder: ThreadBuilder;
  private lifecycleManager: ThreadLifecycleManager;
  private router: Router;
  private eventManager: EventManager;
  private threadCoordinator: ThreadCoordinator;
  private workflowContexts: Map<string, WorkflowContext> = new Map();
  private llmWrapper: LLMWrapper;
  private toolService: ToolService;
  private triggerManager: TriggerManager;

  constructor() {
    this.threadRegistry = new ThreadRegistry();
    this.llmWrapper = new LLMWrapper();
    this.toolService = new ToolService();
    this.threadBuilder = new ThreadBuilder(this.llmWrapper, this.toolService);
    this.router = new Router();
    this.eventManager = new EventManager();
    this.lifecycleManager = new ThreadLifecycleManager(this.eventManager);
    this.threadCoordinator = new ThreadCoordinator(this.threadRegistry, this.threadBuilder, this, this.eventManager);

    // 初始化 TriggerManager
    this.triggerManager = new TriggerManager(this.eventManager, this);
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
   * 执行工作流（从 workflow 创建 thread）
   * @param workflow 工作流定义
   * @param options 线程选项
   * @returns 线程执行结果
   */
  async execute(workflow: WorkflowDefinition, options?: ThreadOptions): Promise<ThreadResult>;

  /**
   * 执行 thread
   * @param thread Thread 实例
   * @param options 线程选项
   * @returns 线程执行结果
   */
  async execute(thread: Thread, options?: ThreadOptions): Promise<ThreadResult>;

  /**
   * 执行 thread（重载实现）
   */
  async execute(workflowOrThread: WorkflowDefinition | Thread, options: ThreadOptions = {}): Promise<ThreadResult> {
    // 判断是 workflow 还是 thread
    if ('nodes' in workflowOrThread) {
      // 是 workflow，创建 thread
      const workflow = workflowOrThread as WorkflowDefinition;
      const thread = await this.createThreadFromWorkflow(workflow, options);
      return this.executeThread(thread, options);
    } else {
      // 是 thread，直接执行
      const thread = workflowOrThread as Thread;
      // 注册到 ThreadRegistry
      this.threadRegistry.register(thread);
      return this.executeThread(thread, options);
    }
  }

  /**
   * 从 workflow 创建 thread
   * @param workflow 工作流定义
   * @param options 线程选项
   * @returns Thread 实例
   */
  private async createThreadFromWorkflow(workflow: WorkflowDefinition, options: ThreadOptions = {}): Promise<Thread> {
    // 步骤1：验证 workflow 定义
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new SDKValidationError('Workflow must have at least one node', 'workflow.nodes');
    }

    const startNode = workflow.nodes.find(n => n.type === NodeType.START);
    if (!startNode) {
      throw new SDKValidationError('Workflow must have a START node', 'workflow.nodes');
    }

    const endNode = workflow.nodes.find(n => n.type === NodeType.END);
    if (!endNode) {
      throw new SDKValidationError('Workflow must have an END node', 'workflow.nodes');
    }

    // 步骤2：使用 ThreadBuilder 创建 thread 实例
    const thread = await this.threadBuilder.build(workflow, options);

    // 步骤3：注册到 ThreadRegistry
    this.threadRegistry.register(thread);

    // 步骤4：复制 workflow 配置
    if (workflow.config) {
      thread.metadata = {
        ...thread.metadata,
        ...workflow.config
      };
    }

    // 步骤5：缓存 workflow context
    this.workflowContexts.set(workflow.id, new WorkflowContext(workflow));

    return thread;
  }

  /**
   * 获取 LLMWrapper
   * @returns LLMWrapper 实例
   */
  getLLMWrapper(): LLMWrapper {
    return this.llmWrapper;
  }

  /**
   * 获取 ToolService
   * @returns ToolService 实例
   */
  getToolService(): ToolService {
    return this.toolService;
  }

  /**
   * 获取 thread 的 Conversation 实例
   * @param thread Thread 实例
   * @returns Conversation 实例
   */
  getConversation(thread: Thread): Conversation {
    const conversation = thread.contextData?.['conversation'] as Conversation;
    if (!conversation) {
      throw new Error('Conversation not found in thread context data');
    }
    return conversation;
  }

  /**
   * 执行 thread
   * @param thread Thread 实例
   * @param options 线程选项
   * @returns 线程执行结果
   */
  private async executeThread(thread: Thread, options: ThreadOptions = {}): Promise<ThreadResult> {
    // 步骤1：验证 thread 状态
    if (thread.status !== 'CREATED' && thread.status !== 'PAUSED') {
      throw new ExecutionError(`Thread is not in a valid state for execution: ${thread.status}`, undefined, thread.workflowId);
    }

    // 步骤2：使用 ThreadLifecycleManager 启动 thread
    await this.lifecycleManager.startThread(thread);

    // 步骤3：开始执行循环
    try {
      await this.executeLoop(thread, options);
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
   * @param thread Thread 实例
   * @param options 线程选项
   */
  private async executeLoop(thread: Thread, options: ThreadOptions = {}): Promise<void> {
    const maxSteps = options.maxSteps || 1000;
    const timeout = options.timeout || 60000;
    const startTime = Date.now();
    let stepCount = 0;

    // 获取 workflow context
    const workflowContext = this.workflowContexts.get(thread.workflowId);
    if (!workflowContext) {
      throw new NotFoundError(`Workflow context not found: ${thread.workflowId}`, 'Workflow', thread.workflowId);
    }

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
      const result = await this.executeNode(thread, currentNode);

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
   * @param thread Thread 实例
   * @param node 节点定义
   * @returns 节点执行结果
   */
  private async executeNode(thread: Thread, node: Node): Promise<NodeExecutionResult> {
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
        result = await this.handleForkNode(thread, node);
      } else if (node.type === NodeType.JOIN) {
        result = await this.handleJoinNode(thread, node);
      } else {
        // 执行普通节点
        const executor = NodeExecutorFactory.createExecutor(node.type);
        result = await executor.execute(thread, node);
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
   * @param thread Thread 实例
   * @param node Fork 节点定义
   * @returns 节点执行结果
   */
  private async handleForkNode(thread: Thread, node: Node): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    // 获取 Fork 配置
    const forkConfig = node.config as any;
    if (!forkConfig || !forkConfig.forkId) {
      throw new ExecutionError('Fork node must have forkId config', node.id, thread.workflowId);
    }

    // 调用 ThreadCoordinator.fork
    const childThreadIds = await this.threadCoordinator.fork(thread.id, forkConfig.forkId, forkConfig.forkStrategy || 'serial');

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
   * @param thread Thread 实例
   * @param node Join 节点定义
   * @returns 节点执行结果
   */
  private async handleJoinNode(thread: Thread, node: Node): Promise<NodeExecutionResult> {
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

    // 调用 ThreadCoordinator.join
    const joinResult = await this.threadCoordinator.join(thread.id, childThreadIds, joinConfig.joinStrategy, joinConfig.timeout);

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
    const thread = this.threadRegistry.get(threadId);
    if (!thread) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    if (thread.status !== 'RUNNING') {
      throw new ExecutionError(`Thread is not running: ${threadId}`, undefined, thread.workflowId);
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
    const thread = this.threadRegistry.get(threadId);
    if (!thread) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    if (thread.status !== 'PAUSED') {
      throw new ExecutionError(`Thread is not paused: ${threadId}`, undefined, thread.workflowId);
    }

    await this.lifecycleManager.resumeThread(thread);

    // 继续执行
    return this.executeThread(thread, options);
  }

  /**
   * 取消执行
   * @param threadId 线程ID
   */
  async cancel(threadId: string): Promise<void> {
    const thread = this.threadRegistry.get(threadId);
    if (!thread) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    if (thread.status !== 'RUNNING' && thread.status !== 'PAUSED') {
      throw new ExecutionError(`Thread is not running or paused: ${threadId}`, undefined, thread.workflowId);
    }

    await this.lifecycleManager.cancelThread(thread);

    // 取消子 thread（如果有）
    const childThreadIds = thread.metadata?.childThreadIds as string[] || [];
    for (const childThreadId of childThreadIds) {
      await this.cancel(childThreadId);
    }
  }

  /**
   * 获取 Thread
   * @param threadId 线程ID
   * @returns Thread 实例
   */
  getThread(threadId: string): Thread | null {
    return this.threadRegistry.get(threadId);
  }

  /**
   * 获取所有 Thread
   * @returns Thread 数组
   */
  getAllThreads(): Thread[] {
    return this.threadRegistry.getAll();
  }

  /**
   * 跳过节点
   * @param threadId 线程ID
   * @param nodeId 节点ID
   */
  async skipNode(threadId: string, nodeId: string): Promise<void> {
    const thread = this.threadRegistry.get(threadId);
    if (!thread) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

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
      workflowId: thread.workflowId,
      threadId: thread.id,
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
    const thread = this.threadRegistry.get(threadId);
    if (!thread) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    // 使用Thread的setVariable方法设置变量
    for (const [name, value] of Object.entries(variables)) {
      thread.setVariable(name, value, typeof value as any, 'local', false);
    }
  }
}