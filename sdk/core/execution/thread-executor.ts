/**
 * ThreadExecutor - Thread 执行器
 * 负责执行单个 ThreadContext 实例，管理 thread 的完整执行生命周期
 * 支持图导航器进行节点导航
 *
 * 职责：
 * - 执行单个 ThreadContext
 * - 节点导航和路由
 * - 协调各个执行组件
 *
 * 不负责：
 * - Thread 的创建和注册（由 ThreadCoordinator 负责）
 * - Thread 的暂停、恢复、停止等生命周期管理（由 ThreadCoordinator 负责）
 * - 变量设置等管理操作（由 ThreadCoordinator 负责）
 * - 节点执行细节（由 NodeExecutionCoordinator 负责）
 * - 事件处理（由 EventCoordinator 负责）
 * - 错误处理（由 ErrorHandler 负责）
 * - 子图处理（由 SubgraphHandler 负责）
 * - 触发器管理（由 ThreadBuilder 在创建 ThreadContext 时处理）
 */

import type { ThreadResult } from '../../types/thread';
import type { Node } from '../../types/node';
import type { NodeExecutionResult } from '../../types/thread';
import { ThreadContext } from './context/thread-context';
import { eventManager } from '../services/event-manager';
import type { EventManager } from '../services/event-manager';
import { TriggerManager } from './managers/trigger-manager';
import { NotFoundError } from '../../types/errors';
import { ThreadStatus } from '../../types/thread';
import { now, diffTimestamp } from '../../utils';
import { EventCoordinator } from './coordinators/event-coordinator';
import { NodeExecutionCoordinator } from './coordinators/node-execution-coordinator';
import { ErrorHandler } from './handlers/error-handler';
import { SubgraphHandler } from './handlers/subgraph-handler';
import { LLMCoordinator } from './llm-coordinator';

/**
 * ThreadExecutor - Thread 执行器
 *
 * 专注于执行单个 ThreadContext，不负责线程的创建、注册和管理
 * 通过协调器模式委托具体职责给专门的组件
 */
export class ThreadExecutor {
  private nodeExecutionCoordinator: NodeExecutionCoordinator;
  private errorHandler: ErrorHandler;
  private eventCoordinator: EventCoordinator;

  constructor(
    eventManagerParam?: EventManager,
    triggerManager?: TriggerManager
  ) {
    // 创建事件协调器
    this.eventCoordinator = new EventCoordinator(
      eventManagerParam || eventManager,
      triggerManager || new TriggerManager()
    );

    // 创建子图处理器
    const subgraphHandler = new SubgraphHandler();

    // 获取 LLM 协调器单例
    const llmCoordinator = LLMCoordinator.getInstance();

    // 创建节点执行协调器
    this.nodeExecutionCoordinator = new NodeExecutionCoordinator(
      this.eventCoordinator,
      llmCoordinator,
      subgraphHandler
    );

    // 创建错误处理器
    this.errorHandler = new ErrorHandler(this.eventCoordinator);
  }

  /**
   * 执行 ThreadContext
   * @param threadContext ThreadContext 实例
   * @returns 执行结果
   */
  async executeThread(threadContext: ThreadContext): Promise<ThreadResult> {
    try {
      // 执行主循环
      while (true) {
        // 检查是否需要暂停或停止
        if (threadContext.thread.shouldPause || threadContext.thread.shouldStop) {
          break;
        }

        // 获取当前节点
        const currentNode = this.getCurrentNode(threadContext);
        if (!currentNode) {
          break;
        }

        // 执行节点（委托给 NodeExecutionCoordinator）
        const nodeResult = await this.nodeExecutionCoordinator.executeNode(threadContext, currentNode);

        // 处理节点执行结果
        if (nodeResult.status === 'COMPLETED') {
          if (this.isEndNode(currentNode)) {
            this.completeThread(threadContext);
            break;
          }
          this.routeToNextNode(threadContext, currentNode, nodeResult);
        } else if (nodeResult.status === 'FAILED') {
          await this.errorHandler.handleNodeFailure(threadContext, currentNode, nodeResult);
          break;
        } else if (nodeResult.status === 'SKIPPED') {
          this.routeToNextNode(threadContext, currentNode, nodeResult);
        }
      }

      return this.createThreadResult(threadContext);
    } catch (error) {
      await this.errorHandler.handleExecutionError(threadContext, error);
      return this.createThreadResult(threadContext, error);
    }
  }

  /**
   * 获取当前节点
   */
  private getCurrentNode(threadContext: ThreadContext): Node | null {
    const currentNodeId = threadContext.getCurrentNodeId();
    const navigator = threadContext.getNavigator();
    const graphNode = navigator.getGraph().getNode(currentNodeId);

    if (!graphNode) {
      throw new NotFoundError(`Node not found: ${currentNodeId}`, 'Node', currentNodeId);
    }

    const currentNode = graphNode.originalNode;
    if (!currentNode) {
      throw new NotFoundError(`Node originalNode not found: ${currentNodeId}`, 'Node', currentNodeId);
    }

    return currentNode;
  }

  /**
   * 检查是否是END节点
   */
  private isEndNode(node: Node): boolean {
    return node.type === 'END';
  }

  /**
   * 完成线程执行
   */
  private completeThread(threadContext: ThreadContext): void {
    threadContext.thread.status = ThreadStatus.COMPLETED;
    threadContext.thread.endTime = now();
  }

  /**
   * 路由到下一个节点
   */
  private routeToNextNode(threadContext: ThreadContext, currentNode: Node, nodeResult: NodeExecutionResult): void {
    const navigator = threadContext.getNavigator();
    const navigationResult = navigator.getNextNode(currentNode.id);

    let nextNodeId: string | null = null;

    if (navigationResult.hasMultiplePaths) {
      // 多路径情况，使用GraphNavigator进行路由决策
      const lastResult = threadContext.getNodeResults()[threadContext.getNodeResults().length - 1];
      nextNodeId = navigator.selectNextNodeWithContext(
        currentNode.id,
        threadContext.thread,
        currentNode.type,
        lastResult
      );
    } else {
      // 单一路径，直接使用导航结果
      nextNodeId = navigationResult.nextNodeId || null;
    }

    if (nextNodeId) {
      threadContext.setCurrentNodeId(nextNodeId);
    }
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

    // 获取Thread状态
    const status = threadContext.getStatus();
    const isSuccess = !error && status === 'COMPLETED';

    return {
      threadId: threadContext.getThreadId(),
      success: isSuccess,
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
    return this.eventCoordinator.getEventManager();
  }

  /**
   * 获取触发器管理器
   */
  getTriggerManager(): TriggerManager {
    return this.eventCoordinator.getTriggerManager();
  }
}