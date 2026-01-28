/**
 * ThreadExecutor - Thread 执行器
 * 负责执行单个 ThreadContext 实例，管理 thread 的完整执行生命周期
 *
 * 通过事件驱动机制与 ThreadCoordinator 解耦，避免循环依赖
 */

import type { ThreadOptions, ThreadResult } from '../../types/thread';
import type { Node } from '../../types/node';
import type { NodeExecutionResult } from '../../types/thread';
import { ThreadRegistry } from '../registry/thread-registry';
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
import { WorkflowRegistry } from '../registry/workflow-registry';
import { getWorkflowRegistry, getThreadRegistry, getEventManager, getThreadLifecycleManager } from './context/execution-context';
import { InternalEventType } from '../../types/internal-events';
import type { ForkCompletedEvent, ForkFailedEvent, JoinCompletedEvent, JoinFailedEvent } from '../../types/internal-events';
import { now, diffTimestamp } from '../../utils';

/**
 * ThreadExecutor - Thread 执行器
 *
 * 通过事件驱动机制与 ThreadCoordinator 解耦，避免循环依赖
 * 使用 ExecutionContext 获取全局组件
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
    // 使用模块级单例获取组件
    this.threadRegistry = getThreadRegistry();
    this.threadBuilder = new ThreadBuilder(workflowRegistry);
    this.lifecycleManager = getThreadLifecycleManager();
    this.router = new Router();
    this.eventManager = new EventManager();
    this.triggerManager = new TriggerManager(this.eventManager);
    this.workflowRegistry = workflowRegistry || getWorkflowRegistry();
  }

  /**
   * 从工作流ID执行工作流
   * @param workflowId 工作流ID
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(workflowId: string, options: ThreadOptions = {}): Promise<ThreadResult> {
    // 步骤1：构建 ThreadContext
    const threadContext = await this.threadBuilder.build(workflowId, options);

    // 步骤2：注册 ThreadContext
    this.threadRegistry.register(threadContext);

    // 步骤3：执行 ThreadContext
    return await this.executeThread(threadContext);
  }

  /**
   * 执行 ThreadContext
   * @param threadContext ThreadContext 实例
   * @returns 执行结果
   */
  async executeThread(threadContext: ThreadContext): Promise<ThreadResult> {
    const threadId = threadContext.getThreadId();

    try {
      // 步骤1：启动 Thread
      await this.lifecycleManager.startThread(threadContext.thread);

      // 步骤2：执行主循环
      while (true) {
        // 检查是否需要暂停
        if (threadContext.thread.shouldPause) {
          await this.lifecycleManager.pauseThread(threadContext.thread);
          break;
        }

        // 检查是否需要停止
        if (threadContext.thread.shouldStop) {
          await this.lifecycleManager.cancelThread(threadContext.thread);
          break;
        }

        // 获取当前节点
        const currentNodeId = threadContext.getCurrentNodeId();
        const workflow = this.workflowRegistry.get(threadContext.getWorkflowId());
        if (!workflow) {
          throw new NotFoundError(`Workflow not found: ${threadContext.getWorkflowId()}`, 'Workflow', threadContext.getWorkflowId());
        }

        const currentNode = workflow.nodes.find(n => n.id === currentNodeId);

        if (!currentNode) {
          throw new NotFoundError(`Node not found: ${currentNodeId}`, 'Node', currentNodeId);
        }

        // 执行节点
        const nodeResult = await this.executeNode(threadContext, currentNode);

        // 处理节点执行结果
        if (nodeResult.status === 'COMPLETED') {
          // 节点执行成功，路由到下一个节点
          const outgoingEdges = workflow.edges.filter(e => e.sourceNodeId === currentNode.id);
          const nextNodeId = this.router.selectNextNode(currentNode, outgoingEdges, threadContext.thread);

          if (!nextNodeId) {
            // 没有下一个节点，工作流完成
            await this.lifecycleManager.completeThread(threadContext.thread, this.createThreadResult(threadContext));
            break;
          }

          // 设置下一个节点
          threadContext.setCurrentNodeId(nextNodeId);
        } else if (nodeResult.status === 'FAILED') {
          // 节点执行失败，触发错误处理
          await this.handleNodeFailure(threadContext, currentNode, nodeResult);
          break;
        } else if (nodeResult.status === 'SKIPPED') {
          // 节点被跳过，路由到下一个节点
          const outgoingEdges = workflow.edges.filter(e => e.sourceNodeId === currentNode.id);
          const nextNodeId = this.router.selectNextNode(currentNode, outgoingEdges, threadContext.thread);

          if (!nextNodeId) {
            // 没有下一个节点，工作流完成
            await this.lifecycleManager.completeThread(threadContext.thread, this.createThreadResult(threadContext));
            break;
          }

          // 设置下一个节点
          threadContext.setCurrentNodeId(nextNodeId);
        }
      }

      // 步骤3：返回执行结果
      return this.createThreadResult(threadContext);
    } catch (error) {
      // 处理执行错误
      await this.handleExecutionError(threadContext, error);
      return this.createThreadResult(threadContext, error);
    }
  }

  /**
   * 执行节点
   * @param threadContext ThreadContext 实例
   * @param node 节点定义
   * @returns 节点执行结果
   */
  private async executeNode(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
    const nodeId = node.id;
    const nodeType = node.type;

    try {
      // 步骤1：触发节点开始事件
      await this.eventManager.emit<NodeStartedEvent>({
        type: EventType.NODE_STARTED,
        threadId: threadContext.getThreadId(),
        workflowId: threadContext.getWorkflowId(),
        nodeId,
        nodeType,
        timestamp: now()
      });

      // 步骤2：创建节点执行器
      const nodeExecutor = NodeExecutorFactory.createExecutor(nodeType);

      // 步骤3：执行节点
      const startTime = now();
      const nodeResult = await nodeExecutor.execute(threadContext.thread, node);
      const endTime = now();

      // 步骤4：补充执行结果信息
      nodeResult.nodeId = nodeId;
      nodeResult.nodeType = nodeType;
      nodeResult.startTime = startTime;
      nodeResult.endTime = endTime;
      nodeResult.executionTime = diffTimestamp(startTime, endTime);

      // 步骤5：记录节点执行结果
      threadContext.addNodeResult(nodeResult);

      // 步骤6：触发节点完成事件
      if (nodeResult.status === 'COMPLETED') {
        await this.eventManager.emit<NodeCompletedEvent>({
          type: EventType.NODE_COMPLETED,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          nodeId,
          output: nodeResult.output,
          executionTime: nodeResult.executionTime,
          timestamp: now()
        });
      } else if (nodeResult.status === 'FAILED') {
        await this.eventManager.emit<NodeFailedEvent>({
          type: EventType.NODE_FAILED,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          nodeId,
          error: nodeResult.error,
          timestamp: now()
        });
      }

      return nodeResult;
    } catch (error) {
      // 处理节点执行错误
      const errorResult: NodeExecutionResult = {
        nodeId,
        nodeType,
        status: 'FAILED',
        step: threadContext.getNodeResults().length + 1,
        error,
        startTime: now(),
        endTime: now(),
        executionTime: 0
      };

      threadContext.addNodeResult(errorResult);

      await this.eventManager.emit<NodeFailedEvent>({
        type: EventType.NODE_FAILED,
        threadId: threadContext.getThreadId(),
        workflowId: threadContext.getWorkflowId(),
        nodeId,
        error,
        timestamp: now()
      });

      return errorResult;
    }
  }

  /**
   * 处理节点执行失败
   * @param threadContext ThreadContext 实例
   * @param node 节点定义
   * @param nodeResult 节点执行结果
   */
  private async handleNodeFailure(threadContext: ThreadContext, node: Node, nodeResult: NodeExecutionResult): Promise<void> {
    // 步骤1：记录错误信息
    threadContext.addError(nodeResult.error);

    // 步骤2：触发错误事件
    await this.eventManager.emit<ErrorEvent>({
      type: EventType.ERROR,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      error: nodeResult.error,
      timestamp: now()
    });

    // 步骤3：根据错误处理策略决定后续操作
    const workflow = this.workflowRegistry.get(threadContext.getWorkflowId());
    if (workflow?.config?.errorHandling) {
      const errorHandling = workflow.config.errorHandling;

      if (errorHandling.stopOnError) {
        // 停止执行
        await this.lifecycleManager.failThread(threadContext.thread, nodeResult.error);
      } else if (errorHandling.continueOnError) {
        // 继续执行
        const fallbackNodeId = errorHandling.fallbackNodeId;
        if (fallbackNodeId) {
          threadContext.setCurrentNodeId(fallbackNodeId);
        } else {
          // 没有回退节点，尝试路由到下一个节点
          const outgoingEdges = workflow.edges.filter(e => e.sourceNodeId === node.id);
          const nextNodeId = this.router.selectNextNode(node, outgoingEdges, threadContext.thread);
          if (nextNodeId) {
            threadContext.setCurrentNodeId(nextNodeId);
          } else {
            await this.lifecycleManager.completeThread(threadContext.thread, this.createThreadResult(threadContext));
          }
        }
      }
    } else {
      // 默认行为：停止执行
      await this.lifecycleManager.failThread(threadContext.thread, nodeResult.error);
    }
  }

  /**
   * 处理执行错误
   * @param threadContext ThreadContext 实例
   * @param error 错误信息
   */
  private async handleExecutionError(threadContext: ThreadContext, error: any): Promise<void> {
    // 记录错误信息
    threadContext.addError(error);

    // 触发错误事件
    await this.eventManager.emit<ErrorEvent>({
      type: EventType.ERROR,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      error,
      timestamp: now()
    });

    // 标记线程为失败状态
    await this.lifecycleManager.failThread(threadContext.thread, error);
  }

  /**
   * 创建 Thread 执行结果
   * @param threadContext ThreadContext 实例
   * @param error 错误信息（可选）
   * @returns Thread 执行结果
   */
  private createThreadResult(threadContext: ThreadContext, error?: any): ThreadResult {
    const endTime = now();
    const startTime = threadContext.getStartTime();
    const executionTime = diffTimestamp(startTime, endTime);

    return {
      threadId: threadContext.getThreadId(),
      success: !error && threadContext.getStatus() === 'COMPLETED',
      output: threadContext.getOutput(),
      error,
      executionTime,
      nodeResults: threadContext.getNodeResults(),
      metadata: {
        startTime,
        endTime,
        executionTime,
        nodeCount: threadContext.getNodeResults().length,
        errorCount: threadContext.getErrors().length
      }
    };
  }

  /**
   * 暂停 Thread 执行
   * @param threadId Thread ID
   */
  async pauseThread(threadId: string): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    await this.lifecycleManager.pauseThread(threadContext.thread);
  }

  /**
   * 恢复 Thread 执行
   * @param threadId Thread ID
   */
  async resumeThread(threadId: string): Promise<ThreadResult> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    // 恢复线程状态
    await this.lifecycleManager.resumeThread(threadContext.thread);

    // 继续执行
    return await this.executeThread(threadContext);
  }

  /**
   * 停止 Thread 执行
   * @param threadId Thread ID
   */
  async stopThread(threadId: string): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    await this.lifecycleManager.cancelThread(threadContext.thread);
  }

  /**
   * 设置 Thread 变量
   * @param threadId Thread ID
   * @param variables 变量对象
   */
  async setVariables(threadId: string, variables: Record<string, any>): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    // 使用ThreadContext的updateVariable方法更新已定义的变量
    for (const [name, value] of Object.entries(variables)) {
      threadContext.updateVariable(name, value);
    }
  }
}