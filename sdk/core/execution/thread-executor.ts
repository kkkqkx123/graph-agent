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
 * - 错误处理（由 ErrorHandler 负责）
 * - 子图处理（由 SubgraphHandler 负责）
 * - 触发子工作流处理（由 TriggeredSubworkflowManager 负责）
 * - 触发器管理（由 ThreadBuilder 在创建 ThreadContext 时处理）
 */

import type { ThreadResult } from '@modular-agent/types';
import type { Node } from '@modular-agent/types';
import type { NodeExecutionResult } from '@modular-agent/types';
import { ThreadContext } from './context/thread-context.js';
import type { EventManager } from '../services/event-manager.js';
import type { WorkflowRegistry } from '../services/workflow-registry.js';
import { ThreadInterruptedException, NodeNotFoundError } from '@modular-agent/types';
import { ThreadStatus } from '@modular-agent/types';
import { now, diffTimestamp } from '@modular-agent/common-utils';
import { NodeExecutionCoordinator } from './coordinators/node-execution-coordinator.js';
import { handleNodeFailure, handleExecutionError } from './handlers/error-handler.js';
import { LLMExecutionCoordinator } from './coordinators/llm-execution-coordinator.js';
import { ExecutionContext } from './context/execution-context.js';
import { InterruptionDetector, InterruptionDetectorImpl } from './managers/interruption-detector.js';
import { throwIfAborted, getThreadInterruptedException } from '@modular-agent/common-utils';

/**
 * ThreadExecutor - Thread 执行器
 *
 * 专注于执行单个 ThreadContext，不负责线程的创建、注册和管理
 * 通过协调器模式委托具体职责给专门的组件
 */
export class ThreadExecutor {
  private nodeExecutionCoordinator: NodeExecutionCoordinator;
  private llmExecutionCoordinator: LLMExecutionCoordinator;
  private eventManager: EventManager;
  private workflowRegistry: WorkflowRegistry;
  private executionContext: ExecutionContext;
  private interruptionDetector: InterruptionDetector;

  constructor(executionContext?: ExecutionContext) {
    // 设置执行上下文
    this.executionContext = executionContext || ExecutionContext.createDefault();

    // 从ExecutionContext获取全局单例服务
    this.eventManager = this.executionContext.getEventManager();
    this.workflowRegistry = this.executionContext.getWorkflowRegistry();

    // 创建 LLM 执行协调器
    this.llmExecutionCoordinator = new LLMExecutionCoordinator(
      this.executionContext.getLlmExecutor(),
      this.executionContext.getToolService(),
      this.eventManager,
      this.executionContext
    );

    // 创建中断检测器
    this.interruptionDetector = new InterruptionDetectorImpl(
      this.executionContext.getThreadRegistry()
    );

    // 创建节点执行协调器（从ExecutionContext获取Handler）
    this.nodeExecutionCoordinator = new NodeExecutionCoordinator(
      this.eventManager,
      this.llmExecutionCoordinator,
      this.executionContext.getUserInteractionHandler(),
      this.executionContext.getHumanRelayHandler(),
      undefined,
      undefined,
      this.executionContext.getThreadRegistry(),
      this.interruptionDetector,
      this.executionContext.getToolContextManager(),
      this.executionContext.getToolService()
    );
  }

  /**
   * 检查中断状态
   *
   * @param threadContext 线程上下文
   * @throws ThreadInterruptedException 当检测到中断时抛出
   */
  private async checkInterruption(threadContext: ThreadContext): Promise<void> {
    const threadId = threadContext.getThreadId();
    const abortSignal = threadContext.getAbortSignal();

    // 使用 AbortSignal 检查中断
    throwIfAborted(abortSignal);

    // 如果已中止，处理中断（创建检查点、触发事件）
    const exception = getThreadInterruptedException(abortSignal);
    if (exception && exception.interruptionType) {
      await this.nodeExecutionCoordinator.handleInterruption(
        threadId,
        threadContext.getCurrentNodeId(),
        exception.interruptionType
      );
      throw exception;
    }
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
        // 检查中断状态
        await this.checkInterruption(threadContext);

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
          await handleNodeFailure(threadContext, currentNode, nodeResult);
          // handleNodeFailure 会设置 shouldStop=true，循环会在下一次迭代时退出
        } else if (nodeResult.status === 'SKIPPED') {
          this.routeToNextNode(threadContext, currentNode, nodeResult);
        }
      }

      return this.createThreadResult(threadContext);
    } catch (error) {
      // 处理线程中断异常
      if (error instanceof ThreadInterruptedException) {
        // 中断异常已经被协调器处理过，直接返回结果
        return this.createThreadResult(threadContext);
      }

      // 处理其他错误
      await handleExecutionError(threadContext, error);
      return this.createThreadResult(threadContext);
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
      throw new NodeNotFoundError(`Node not found: ${currentNodeId}`, currentNodeId);
    }

    const currentNode = graphNode.originalNode;
    if (!currentNode) {
      throw new NodeNotFoundError(`Node originalNode not found: ${currentNodeId}`, currentNodeId);
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
    threadContext.setStatus('COMPLETED');
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
  private createThreadResult(threadContext: ThreadContext): ThreadResult {
    const endTime = now();
    const startTime = threadContext.getStartTime();
    const executionTime = diffTimestamp(startTime, endTime);

    // 获取线程状态
    const status = threadContext.getStatus();

    return {
      threadId: threadContext.getThreadId(),
      output: threadContext.getOutput(),
      executionTime,
      nodeResults: threadContext.getNodeResults(),
      metadata: {
        status: status as ThreadStatus,
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