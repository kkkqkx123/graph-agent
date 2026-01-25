/**
 * 工作流执行器
 * 负责整个工作流的执行流程
 */

import type { WorkflowDefinition } from '../../types/workflow';
import type { Thread, ThreadOptions, ThreadResult, ThreadStatus } from '../../types/thread';
import type { ExecutionContext } from '../../types/execution';
import { ThreadStateManager } from '../state/thread-state';
import { WorkflowContext } from '../state/workflow-context';
import { VariableManager } from '../state/variable-manager';
import { HistoryManager } from '../state/history-manager';
import { Router } from './router';
import { NodeExecutor } from './node-executor';
import { NodeType } from '../../types/node';
import { ExecutionError, TimeoutError, NotFoundError, ValidationError as SDKValidationError } from '../../types/errors';

/**
 * 工作流执行器
 */
export class WorkflowExecutor {
  private stateManager: ThreadStateManager;
  private variableManager: VariableManager;
  private historyManager: HistoryManager;
  private router: Router;
  private nodeExecutors: Map<NodeType, NodeExecutor>;

  constructor() {
    this.stateManager = new ThreadStateManager();
    this.variableManager = new VariableManager();
    this.historyManager = new HistoryManager();
    this.router = new Router();
    this.nodeExecutors = new Map();
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
   * 执行工作流
   * @param workflow 工作流定义
   * @param options 线程选项
   * @returns 线程执行结果
   */
  async execute(workflow: WorkflowDefinition, options: ThreadOptions = {}): Promise<ThreadResult> {
    // 步骤1：创建Thread实例
    const thread = this.stateManager.createThread(
      workflow.id,
      workflow.version,
      options
    );

    // 步骤2：初始化执行上下文
    const workflowContext = new WorkflowContext(workflow);
    const context: ExecutionContext = {
      workflow,
      thread,
      options: {
        workflow,
        threadOptions: options,
        enableEvents: false,
        enableLogging: false
      },
      metadata: {
        executionId: thread.id,
        workflowId: workflow.id,
        threadId: thread.id,
        startTime: thread.startTime,
        endTime: 0,
        duration: 0,
        steps: 0,
        nodesExecuted: 0,
        edgesTraversed: 0,
        usedCheckpoints: false,
        checkpointCount: 0
      },
      contextData: {}
    };

    // 步骤3：获取START节点
    const startNode = workflowContext.getStartNode();
    if (!startNode) {
      throw new SDKValidationError('Workflow must have a START node', 'workflow.nodes');
    }

    // 步骤4：设置当前节点为START节点
    this.stateManager.setCurrentNode(thread.id, startNode.id);

    // 步骤5：更新Thread状态为RUNNING
    this.stateManager.updateThreadStatus(thread.id, 'RUNNING' as ThreadStatus);

    // 步骤6：开始执行循环
    try {
      await this.executeLoop(context, workflowContext);
    } catch (error) {
      // 处理执行错误
      this.stateManager.updateThreadStatus(thread.id, 'FAILED' as ThreadStatus);
      thread.errors.push(error instanceof Error ? error.message : String(error));
      
      return {
        threadId: thread.id,
        success: false,
        output: thread.output,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - thread.startTime,
        nodeResults: Array.from(thread.nodeResults.values()),
        metadata: context.metadata
      };
    }

    // 步骤7：处理执行完成
    this.stateManager.updateThreadStatus(thread.id, 'COMPLETED' as ThreadStatus);
    const executionTime = Date.now() - thread.startTime;

    return {
      threadId: thread.id,
      success: true,
      output: thread.output,
      executionTime,
      nodeResults: Array.from(thread.nodeResults.values()),
      metadata: context.metadata
    };
  }

  /**
   * 执行循环
   * @param context 执行上下文
   * @param workflowContext 工作流上下文
   */
  private async executeLoop(
    context: ExecutionContext,
    workflowContext: WorkflowContext
  ): Promise<void> {
    const maxSteps = context.options.threadOptions?.maxSteps || 1000;
    const timeout = context.options.threadOptions?.timeout || 60000;
    const startTime = Date.now();
    let stepCount = 0;

    while (stepCount < maxSteps) {
      // 检查超时
      if (Date.now() - startTime > timeout) {
        throw new TimeoutError('Workflow execution timeout', timeout);
      }

      // 检查Thread状态
      if (context.thread.status !== 'RUNNING') {
        break;
      }

      // 获取当前节点
      const currentNodeId = this.stateManager.getCurrentNode(context.thread.id);
      if (!currentNodeId) {
        break;
      }

      const currentNode = workflowContext.getNode(currentNodeId);
      if (!currentNode) {
        throw new NotFoundError(`Node not found: ${currentNodeId}`, 'Node', currentNodeId);
      }

      // 检查是否为END节点
      if (currentNode.type === NodeType.END) {
        break;
      }

      // 执行节点
      const executor = this.nodeExecutors.get(currentNode.type);
      if (!executor) {
        throw new ExecutionError(
          `No executor found for node type: ${currentNode.type}`,
          currentNodeId,
          context.workflow.id
        );
      }

      const result = await executor.execute(context);

      // 记录执行结果
      context.thread.nodeResults.set(currentNodeId, result);
      this.historyManager.recordNodeExecution(
        context.thread.id,
        currentNodeId,
        currentNode.type,
        result
      );

      // 调用回调
      if (context.options.threadOptions?.onNodeExecuted) {
        await context.options.threadOptions.onNodeExecuted(result);
      }

      // 路由到下一个节点
      const edges = workflowContext.getOutgoingEdges(currentNodeId);
      const nextNodeId = this.router.selectNextNode(currentNode, edges, context);

      if (!nextNodeId) {
        // 没有可用的路由，检查是否为END节点
        const node = workflowContext.getNode(currentNodeId);
        if (node && node.type !== NodeType.END) {
          throw new ExecutionError(
            `No available route from node: ${currentNodeId}`,
            currentNodeId,
            context.workflow.id
          );
        }
        break;
      }

      // 更新当前节点
      this.stateManager.setCurrentNode(context.thread.id, nextNodeId);

      // 更新步数
      stepCount++;
      context.metadata.steps++;
      context.metadata.nodesExecuted++;
    }

    if (stepCount >= maxSteps) {
      throw new ExecutionError(
        'Maximum execution steps exceeded',
        context.thread.currentNodeId,
        context.workflow.id
      );
    }
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
  }

  /**
   * 恢复执行
   * @param threadId 线程ID
   * @param workflow 工作流定义
   * @returns 线程执行结果
   */
  async resume(threadId: string, workflow: WorkflowDefinition): Promise<ThreadResult> {
    const thread = this.stateManager.getThread(threadId);
    if (!thread) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    if (thread.status !== 'PAUSED') {
      throw new ExecutionError(`Thread is not paused: ${threadId}`, undefined, thread.workflowId);
    }

    // 更新Thread状态为RUNNING
    this.stateManager.updateThreadStatus(threadId, 'RUNNING' as ThreadStatus);

    // 初始化执行上下文
    const workflowContext = new WorkflowContext(workflow);
    const context: ExecutionContext = {
      workflow,
      thread,
      options: {
        workflow,
        threadOptions: {},
        enableEvents: false,
        enableLogging: false
      },
      metadata: {
        executionId: thread.id,
        workflowId: workflow.id,
        threadId: thread.id,
        startTime: thread.startTime,
        endTime: 0,
        duration: 0,
        steps: this.historyManager.getCurrentStep(threadId),
        nodesExecuted: thread.nodeResults.size,
        edgesTraversed: 0,
        usedCheckpoints: false,
        checkpointCount: 0
      },
      contextData: {}
    };

    // 继续执行循环
    try {
      await this.executeLoop(context, workflowContext);
    } catch (error) {
      this.stateManager.updateThreadStatus(threadId, 'FAILED' as ThreadStatus);
      const errorMessage = error instanceof Error ? error.message : String(error);
      thread.errors.push(errorMessage);
      
      return {
        threadId: thread.id,
        success: false,
        output: thread.output,
        error: errorMessage,
        executionTime: Date.now() - thread.startTime,
        nodeResults: Array.from(thread.nodeResults.values()),
        metadata: context.metadata
      };
    }

    // 处理执行完成
    this.stateManager.updateThreadStatus(threadId, 'COMPLETED' as ThreadStatus);
    const executionTime = Date.now() - thread.startTime;

    return {
      threadId: thread.id,
      success: true,
      output: thread.output,
      executionTime,
      nodeResults: Array.from(thread.nodeResults.values()),
      metadata: context.metadata
    };
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
  }

  /**
   * 获取Thread
   * @param threadId 线程ID
   * @returns Thread实例
   */
  getThread(threadId: string): Thread | null {
    return this.stateManager.getThread(threadId);
  }

  /**
   * 获取所有Thread
   * @returns Thread数组
   */
  getAllThreads(): Thread[] {
    return this.stateManager.getAllThreads();
  }
}