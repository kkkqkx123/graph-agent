/**
 * ThreadExecutor - Thread 执行器
 * 负责执行单个 ThreadContext 实例，管理 thread 的完整执行生命周期
 * 支持图导航器进行节点导航
 *
 * 职责：
 * - 执行单个 ThreadContext
 * - 节点导航和执行
 * - 错误处理
 *
 * 不负责：
 * - Thread 的创建和注册（由 ThreadCoordinator 负责）
 * - Thread 的暂停、恢复、停止等生命周期管理（由 ThreadCoordinator 负责）
 * - 变量设置等管理操作（由 ThreadCoordinator 负责）
 */

import type { ThreadResult } from '../../types/thread';
import type { Node } from '../../types/node';
import type { NodeExecutionResult } from '../../types/thread';
import { ThreadContext } from './context/thread-context';
import { EventManager } from './managers/event-manager';
import { NotFoundError } from '../../types/errors';
import { EventType } from '../../types/events';
import type { NodeStartedEvent, NodeCompletedEvent, NodeFailedEvent, ErrorEvent } from '../../types/events';
import { HookExecutor } from './handlers/hook-handler';
import { NodeType } from '../../types/node';
import { now, diffTimestamp } from '../../utils';
import { getNodeHandler } from './handlers/node-handlers';

/**
 * ThreadExecutor - Thread 执行器
 *
 * 专注于执行单个 ThreadContext，不负责线程的创建、注册和管理
 */
export class ThreadExecutor {
  private eventManager: EventManager;

  constructor(eventManager?: EventManager) {
    this.eventManager = eventManager || new EventManager();
  }

  /**
   * 执行 ThreadContext
   * @param threadContext ThreadContext 实例
   * @returns 执行结果
   */
  async executeThread(threadContext: ThreadContext): Promise<ThreadResult> {
    const threadId = threadContext.getThreadId();

    try {
      // 步骤1：执行主循环
      while (true) {
        // 检查是否需要暂停
        if (threadContext.thread.shouldPause) {
          // 暂停状态由外部管理，直接返回
          break;
        }

        // 检查是否需要停止
        if (threadContext.thread.shouldStop) {
          // 停止状态由外部管理，直接返回
          break;
        }

        // 获取当前节点
        const currentNodeId = threadContext.getCurrentNodeId();
        const navigator = threadContext.getNavigator();
        const graphNode = navigator.getGraph().getNode(currentNodeId);

        if (!graphNode) {
          throw new NotFoundError(`Node not found: ${currentNodeId}`, 'Node', currentNodeId);
        }

        // 从GraphNode获取完整的Node对象
        const currentNode = graphNode.originalNode;
        if (!currentNode) {
          throw new NotFoundError(`Node originalNode not found: ${currentNodeId}`, 'Node', currentNodeId);
        }

        // 执行节点
        const nodeResult = await this.executeNode(threadContext, currentNode);

        // 处理节点执行结果
        if (nodeResult.status === 'COMPLETED') {
          // 节点执行成功，路由到下一个节点
          let nextNodeId: string | null = null;

          // 使用图导航器进行路由
          const navigator = threadContext.getNavigator();
          // 获取下一个节点
          const navigationResult = navigator.getNextNode(currentNodeId);

          if (navigationResult.isEnd) {
            // 到达结束节点，工作流完成
            break;
          }

          if (navigationResult.hasMultiplePaths) {
            // 多路径情况，使用GraphNavigator进行路由决策
            const lastResult = threadContext.getNodeResults()[threadContext.getNodeResults().length - 1];
            nextNodeId = navigator.selectNextNodeWithContext(
              currentNodeId,
              threadContext.thread,
              currentNode.type,
              lastResult
            );
          } else {
            // 单一路径，直接使用导航结果
            nextNodeId = navigationResult.nextNodeId || null;
          }

          if (!nextNodeId) {
            // 没有下一个节点，工作流完成
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
          let nextNodeId: string | null = null;

          // 使用图导航器进行路由
          const navigator = threadContext.getNavigator();
          // 获取下一个节点
          const navigationResult = navigator.getNextNode(currentNodeId);

          if (navigationResult.isEnd) {
            // 到达结束节点，工作流完成
            break;
          }

          nextNodeId = navigationResult.nextNodeId || null;

          if (!nextNodeId) {
            // 没有下一个节点，工作流完成
            break;
          }

          // 设置下一个节点
          threadContext.setCurrentNodeId(nextNodeId);
        }
      }

      // 步骤2：返回执行结果
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

      // 步骤2：执行BEFORE_EXECUTE类型的Hook
      const hookExecutor = new HookExecutor();
      if (node.hooks && node.hooks.length > 0) {
        await hookExecutor.executeBeforeExecute(
          { thread: threadContext.thread, node },
          (event) => this.eventManager.emit(event)
        );
      }

      // 步骤3：执行节点逻辑
      const startTime = now();
      let nodeResult: NodeExecutionResult;

      // 检查是否为需要LLM执行器托管的节点
      if (this.isLLMManagedNode(nodeType)) {
        // 由ThreadExecutor直接托管给LLM执行器处理
        nodeResult = await this.executeLLMManagedNode(threadContext, node);
      } else {
        // 使用Node Handler函数执行
        const handler = getNodeHandler(nodeType);
        const output = await handler(threadContext.thread, node);

        // 构建执行结果
        const endTime = now();
        nodeResult = {
          nodeId,
          nodeType,
          status: output.status || 'COMPLETED',
          step: threadContext.thread.nodeResults.length + 1,
          data: output.status ? undefined : output,
          startTime,
          endTime,
          executionTime: diffTimestamp(startTime, endTime)
        };
      }

      // 步骤4：记录节点执行结果
      threadContext.addNodeResult(nodeResult);

      // 步骤5：执行AFTER_EXECUTE类型的Hook
      if (node.hooks && node.hooks.length > 0) {
        await hookExecutor.executeAfterExecute(
          { thread: threadContext.thread, node, result: nodeResult },
          (event) => this.eventManager.emit(event)
        );
      }

      // 步骤6：触发节点完成事件
      if (nodeResult.status === 'COMPLETED') {
        await this.eventManager.emit<NodeCompletedEvent>({
          type: EventType.NODE_COMPLETED,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          nodeId,
          output: nodeResult.data,
          executionTime: nodeResult.executionTime || 0,
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
   * 检查是否为需要LLM执行器托管的节点
   */
  private isLLMManagedNode(nodeType: NodeType): boolean {
    return [
      NodeType.LLM,
      NodeType.TOOL,
      NodeType.CONTEXT_PROCESSOR,
      NodeType.USER_INTERACTION
    ].includes(nodeType);
  }

  /**
   * 执行由LLM执行器托管的节点
   */
  private async executeLLMManagedNode(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
    const startTime = now();

    // TODO: 实现实际的LLM执行器调用
    // 这里暂时返回模拟结果
    const endTime = now();

    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      step: threadContext.thread.nodeResults.length + 1,
      data: { message: 'LLM managed node executed' },
      startTime,
      endTime,
      executionTime: diffTimestamp(startTime, endTime)
    };
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
    // 注意：错误处理配置现在应该存储在Thread的metadata中
    const errorHandling = threadContext.getMetadata()?.customFields?.errorHandling;
    
    if (errorHandling) {
      if (errorHandling.stopOnError) {
        // 停止执行，状态由外部管理
        return;
      } else if (errorHandling.continueOnError) {
        // 继续执行
        const fallbackNodeId = errorHandling.fallbackNodeId;
        if (fallbackNodeId) {
          threadContext.setCurrentNodeId(fallbackNodeId);
        } else {
          // 没有回退节点，尝试路由到下一个节点
          const navigator = threadContext.getNavigator();
          const currentNodeId = node.id;
          const lastResult = threadContext.getNodeResults()[threadContext.getNodeResults().length - 1];
          const nextNodeId = navigator.selectNextNodeWithContext(
            currentNodeId,
            threadContext.thread,
            node.type,
            lastResult
          );
          if (nextNodeId) {
            threadContext.setCurrentNodeId(nextNodeId);
          }
        }
      }
    }
    // 默认行为：停止执行，状态由外部管理
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

    // 状态由外部管理
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
   * 获取事件管理器
   */
  getEventManager(): EventManager {
    return this.eventManager;
  }
}