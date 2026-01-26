/**
 * ThreadExecutor - Thread 执行器
 * 负责执行单个 thread 实例，管理 thread 的完整执行生命周期
 * 同时支持从 workflow 创建 thread
 */

import type { WorkflowDefinition } from '../../types/workflow';
import type { Thread, ThreadOptions, ThreadResult, ThreadStatus } from '../../types/thread';
import type { Node } from '../../types/node';
import type { NodeExecutionResult } from '../../types/thread';
import { ThreadStateManager } from '../state/thread-state';
import { WorkflowContext } from '../state/workflow-context';
import { HistoryManager } from '../state/history-manager';
import { Router } from './router';
import { NodeExecutor } from './executors/node/base-node-executor';
import { NodeType } from '../../types/node';
import { EventManager } from './event-manager';
import { ThreadCoordinator } from './thread-coordinator';
import { ExecutionError, TimeoutError, NotFoundError, ValidationError as SDKValidationError } from '../../types/errors';
import { EventType } from '../../types/events';
import type { ThreadStartedEvent, ThreadCompletedEvent, ThreadFailedEvent, ThreadPausedEvent, ThreadResumedEvent, NodeStartedEvent, NodeCompletedEvent, NodeFailedEvent, TokenLimitExceededEvent } from '../../types/events';
import { LLMWrapper } from '../llm/wrapper';
import { ToolService } from '../tools/tool-service';
import { Conversation } from '../llm/conversation';

/**
 * ThreadExecutor - Thread 执行器
 */
export class ThreadExecutor {
  private stateManager: ThreadStateManager;
  private historyManager: HistoryManager;
  private router: Router;
  private nodeExecutors: Map<NodeType, NodeExecutor>;
  private eventManager: EventManager;
  private threadCoordinator: ThreadCoordinator;
  private workflowContexts: Map<string, WorkflowContext> = new Map();
  private llmWrapper: LLMWrapper;
  private toolService: ToolService;

  constructor() {
    this.stateManager = new ThreadStateManager();
    this.historyManager = new HistoryManager();
    this.router = new Router();
    this.nodeExecutors = new Map();
    this.eventManager = new EventManager();
    this.threadCoordinator = new ThreadCoordinator(this.stateManager, this, this.eventManager);
    this.llmWrapper = new LLMWrapper();
    this.toolService = new ToolService();
  }

  /**
   * 注册节点执行器
   * @param nodeType 节点类型
   * @param executor 节点执行器
   */
  registerNodeExecutor(nodeType: NodeType, executor: NodeExecutor): void {
    this.nodeExecutors.set(nodeType, executor);
  }

  /**
   * 获取事件管理器
   * @returns 事件管理器
   */
  getEventManager(): EventManager {
    return this.eventManager;
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
      const thread = this.createThreadFromWorkflow(workflow, options);
      return this.executeThread(thread, options);
    } else {
      // 是 thread，直接执行
      const thread = workflowOrThread as Thread;
      return this.executeThread(thread, options);
    }
  }

  /**
   * 从 workflow 创建 thread
   * @param workflow 工作流定义
   * @param options 线程选项
   * @returns Thread 实例
   */
  private createThreadFromWorkflow(workflow: WorkflowDefinition, options: ThreadOptions = {}): Thread {
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

    // 步骤2：创建 thread 实例
    const thread = this.stateManager.createThread(
      workflow.id,
      workflow.version,
      options
    );

    // 步骤3：设置初始节点
    this.stateManager.setCurrentNode(thread.id, startNode.id);

    // 步骤4：复制 workflow 配置
    if (workflow.config) {
      thread.metadata = {
        ...thread.metadata,
        ...workflow.config
      };
    }

    // 步骤5：创建 Conversation 实例
    const conversation = new Conversation(
      this.llmWrapper,
      this.toolService,
      {
        tokenLimit: options.tokenLimit || 4000,
        eventCallbacks: {
          onTokenLimitExceeded: async (tokensUsed, tokenLimit) => {
            // 触发事件
            const event: TokenLimitExceededEvent = {
              type: EventType.TOKEN_LIMIT_EXCEEDED,
              timestamp: Date.now(),
              workflowId: thread.workflowId,
              threadId: thread.id,
              tokensUsed,
              tokenLimit
            };
            await this.eventManager.emit(event);
          }
        }
      }
    );

    // 存储 Conversation 到 thread.contextData
    thread.contextData = {
      conversation
    };

    // 步骤6：缓存 workflow context
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

    // 步骤2：更新 thread 状态为 RUNNING
    this.stateManager.updateThreadStatus(thread.id, 'RUNNING' as ThreadStatus);

    // 步骤3：触发 THREAD_STARTED 事件
    const startedEvent: ThreadStartedEvent = {
      type: EventType.THREAD_STARTED,
      timestamp: Date.now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      input: thread.input
    };
    await this.eventManager.emit(startedEvent);

    // 步骤4：开始执行循环
    try {
      await this.executeLoop(thread, options);
    } catch (error) {
      // 处理执行错误
      this.stateManager.updateThreadStatus(thread.id, 'FAILED' as ThreadStatus);
      thread.errors.push(error instanceof Error ? error.message : String(error));

      // 触发 THREAD_FAILED 事件
      const failedEvent: ThreadFailedEvent = {
        type: EventType.THREAD_FAILED,
        timestamp: Date.now(),
        workflowId: thread.workflowId,
        threadId: thread.id,
        error: error instanceof Error ? error.message : String(error)
      };
      await this.eventManager.emit(failedEvent);

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

    // 步骤5：处理执行完成
    this.stateManager.updateThreadStatus(thread.id, 'COMPLETED' as ThreadStatus);
    const executionTime = Date.now() - thread.startTime;

    // 触发 THREAD_COMPLETED 事件
    const completedEvent: ThreadCompletedEvent = {
      type: EventType.THREAD_COMPLETED,
      timestamp: Date.now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      output: thread.output,
      executionTime
    };
    await this.eventManager.emit(completedEvent);

    return {
      threadId: thread.id,
      success: true,
      output: thread.output,
      executionTime,
      nodeResults: Array.from(thread.nodeResults.values()),
      metadata: thread.metadata
    };
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
      const currentNodeId = this.stateManager.getCurrentNode(thread.id);
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

      // 记录执行结果
      thread.nodeResults.set(currentNodeId, result);
      this.historyManager.recordNodeExecution(
        thread.id,
        currentNodeId,
        currentNode.type,
        result
      );

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
      this.stateManager.setCurrentNode(thread.id, nextNodeId);

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
        const executor = this.nodeExecutors.get(node.type);
        if (!executor) {
          throw new ExecutionError(
            `No executor found for node type: ${node.type}`,
            node.id,
            thread.workflowId
          );
        }

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
    const thread = this.stateManager.getThread(threadId);
    if (!thread) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    if (thread.status !== 'RUNNING') {
      throw new ExecutionError(`Thread is not running: ${threadId}`, undefined, thread.workflowId);
    }

    this.stateManager.updateThreadStatus(threadId, 'PAUSED' as ThreadStatus);

    // 触发 THREAD_PAUSED 事件
    const pausedEvent: ThreadPausedEvent = {
      type: EventType.THREAD_PAUSED,
      timestamp: Date.now(),
      workflowId: thread.workflowId,
      threadId: thread.id
    };
    await this.eventManager.emit(pausedEvent);
  }

  /**
   * 恢复执行
   * @param threadId 线程ID
   * @param options 线程选项
   * @returns 线程执行结果
   */
  async resume(threadId: string, options: ThreadOptions = {}): Promise<ThreadResult> {
    const thread = this.stateManager.getThread(threadId);
    if (!thread) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    if (thread.status !== 'PAUSED') {
      throw new ExecutionError(`Thread is not paused: ${threadId}`, undefined, thread.workflowId);
    }

    // 触发 THREAD_RESUMED 事件
    const resumedEvent: ThreadResumedEvent = {
      type: EventType.THREAD_RESUMED,
      timestamp: Date.now(),
      workflowId: thread.workflowId,
      threadId: thread.id
    };
    await this.eventManager.emit(resumedEvent);

    // 继续执行
    return this.executeThread(thread, options);
  }

  /**
   * 取消执行
   * @param threadId 线程ID
   */
  async cancel(threadId: string): Promise<void> {
    const thread = this.stateManager.getThread(threadId);
    if (!thread) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    if (thread.status !== 'RUNNING' && thread.status !== 'PAUSED') {
      throw new ExecutionError(`Thread is not running or paused: ${threadId}`, undefined, thread.workflowId);
    }

    this.stateManager.updateThreadStatus(threadId, 'CANCELLED' as ThreadStatus);

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
    return this.stateManager.getThread(threadId);
  }

  /**
   * 获取所有 Thread
   * @returns Thread 数组
   */
  getAllThreads(): Thread[] {
    return this.stateManager.getAllThreads();
  }
}