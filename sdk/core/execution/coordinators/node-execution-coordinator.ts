/**
 * NodeExecutionCoordinator - 节点执行协调器
 * 负责协调节点的执行流程，包括事件触发、Hook执行、子图处理等
 *
 * 职责：
 * - 协调节点执行的核心逻辑
 * - 处理子图边界（进入/退出）
 * - 执行节点（包括LLM节点、用户交互节点和普通节点）
 * - 触发节点事件
 * - 执行节点Hooks
 *
 * 设计原则：
 * - 协调各个组件完成节点执行
 * - 不直接实现具体的执行逻辑
 * - 提供清晰的节点执行接口
 */

import { ThreadContext } from '../context/thread-context.js';
import type { Node } from '@modular-agent/types';
import type { NodeExecutionResult } from '@modular-agent/types';
import type { EventManager } from '../../services/event-manager.js';
import type { UserInteractionHandler } from '@modular-agent/types';
import type { HumanRelayHandler } from '@modular-agent/types';
import { LLMExecutionCoordinator } from './llm-execution-coordinator.js';
import { enterSubgraph, exitSubgraph, getSubgraphInput, getSubgraphOutput } from '../handlers/subgraph-handler.js';
import type { NodeStartedEvent, NodeCompletedEvent, NodeFailedEvent, SubgraphStartedEvent, SubgraphCompletedEvent } from '@modular-agent/types';
import { ExecutionError, SystemExecutionError } from '@modular-agent/types';
import { executeHook } from '../handlers/hook-handlers/index.js';
import { now, diffTimestamp, getErrorOrNew } from '@modular-agent/common-utils';
import { getNodeHandler } from '../handlers/node-handlers/index.js';
import { SUBGRAPH_METADATA_KEYS, SubgraphBoundaryType } from '@modular-agent/types';
import type { CheckpointDependencies } from '../handlers/checkpoint-handlers/checkpoint-utils.js';
import { createCheckpoint } from '../handlers/checkpoint-handlers/checkpoint-utils.js';
import { resolveCheckpointConfig } from '../handlers/checkpoint-handlers/checkpoint-config-resolver.js';
import { emit } from '../utils/event/event-emitter.js';
import { buildThreadPausedEvent, buildThreadCancelledEvent } from '../utils/event/event-builder.js';
import type { InterruptionDetector } from '../managers/interruption-detector.js';
import { throwIfAborted, getThreadInterruptedException } from '@modular-agent/common-utils';

/**
 * 节点执行协调器配置
 */
export interface NodeExecutionCoordinatorConfig {
  /** 事件管理器 */
  eventManager: EventManager;
  /** LLM 执行协调器 */
  llmCoordinator: LLMExecutionCoordinator;
  /** 用户交互处理器（可选） */
  userInteractionHandler?: UserInteractionHandler;
  /** 人工中继处理器（可选） */
  humanRelayHandler?: HumanRelayHandler;
  /** 检查点依赖项（可选） */
  checkpointDependencies?: CheckpointDependencies;
  /** 全局检查点配置（可选） */
  globalCheckpointConfig?: any;
  /** 线程注册表（可选） */
  threadRegistry?: any;
  /** 中断检测器（可选） */
  interruptionDetector?: InterruptionDetector;
  /** 工具上下文管理器（可选） */
  toolContextManager?: any;
  /** 工具服务（可选） */
  toolService?: any;
}

/**
 * 节点执行协调器
 */
export class NodeExecutionCoordinator {
  private eventManager: EventManager;
  private llmCoordinator: LLMExecutionCoordinator;
  private userInteractionHandler?: UserInteractionHandler;
  private humanRelayHandler?: HumanRelayHandler;
  private checkpointDependencies?: CheckpointDependencies;
  private globalCheckpointConfig?: any;
  private threadRegistry?: any;
  private interruptionDetector?: InterruptionDetector;
  private toolContextManager?: any;
  private toolService?: any;

  constructor(config: NodeExecutionCoordinatorConfig) {
    this.eventManager = config.eventManager;
    this.llmCoordinator = config.llmCoordinator;
    this.userInteractionHandler = config.userInteractionHandler;
    this.humanRelayHandler = config.humanRelayHandler;
    this.checkpointDependencies = config.checkpointDependencies;
    this.globalCheckpointConfig = config.globalCheckpointConfig;
    this.threadRegistry = config.threadRegistry;
    this.interruptionDetector = config.interruptionDetector;
    this.toolContextManager = config.toolContextManager;
    this.toolService = config.toolService;
  }

  /**
   * 检查是否已中止
   *
   * @param threadId Thread ID
   * @returns 是否已中止
   */
  isAborted(threadId: string): boolean {
    if (this.interruptionDetector) {
      return this.interruptionDetector.isAborted(threadId);
    }

    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      return false;
    }

    return threadContext.getAbortSignal().aborted;
  }

  /**
   * 处理中断操作
   *
   * @param threadId Thread ID
   * @param nodeId 节点ID
   * @param type 中断类型（PAUSE 或 STOP）
   */
  async handleInterruption(threadId: string, nodeId: string, type: 'PAUSE' | 'STOP'): Promise<void> {
    if (!this.threadRegistry) {
      return;
    }

    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      return;
    }

    // 创建中断检查点
    if (this.checkpointDependencies) {
      try {
        await createCheckpoint(
          {
            threadId,
            nodeId,
            description: `Thread ${type.toLowerCase()} at node: ${nodeId}`,
            metadata: {
              customFields: {
                interruptionType: type,
                interruptedAt: now()
              }
            }
          },
          this.checkpointDependencies
        );
      } catch (error) {
        // 抛出系统执行错误，由 ErrorService 统一处理
        throw new SystemExecutionError(
          'Failed to create interruption checkpoint',
          'NodeExecutionCoordinator',
          'handleInterruption',
          nodeId,
          undefined,
          { nodeId, originalError: getErrorOrNew(error) }
        );
      }
    }

    // 触发相应的事件
    if (type === 'PAUSE') {
      threadContext.setStatus('PAUSED');
      const pausedEvent = buildThreadPausedEvent(threadContext.thread);
      await emit(this.eventManager, pausedEvent);
    } else if (type === 'STOP') {
      threadContext.setStatus('CANCELLED');
      threadContext.setEndTime(now());
      const cancelledEvent = buildThreadCancelledEvent(threadContext.thread, 'user_requested');
      await emit(this.eventManager, cancelledEvent);
    }
  }

  /**
   * 执行节点
   * @param threadContext 线程上下文
   * @param node 节点定义
   * @returns 节点执行结果
   */
  async executeNode(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
    const nodeId = node.id;
    const nodeType = node.type;
    const threadId = threadContext.getThreadId();
    const abortSignal = threadContext.getAbortSignal();

    // 使用 AbortSignal 检查中断
    throwIfAborted(abortSignal);

    // 如果已中止，处理中断（创建检查点、触发事件）
    const exception = getThreadInterruptedException(abortSignal);
    if (exception && exception.interruptionType) {
      await this.handleInterruption(threadId, nodeId, exception.interruptionType);
      throw exception;
    }

    // 获取GraphNode以检查边界信息
    const navigator = threadContext.getNavigator();
    const graphNode = navigator.getGraph().getNode(nodeId);

    // 检查是否是子图边界节点
    if (graphNode?.internalMetadata?.[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE]) {
      await this.handleSubgraphBoundary(threadContext, graphNode);
    }

    try {
      // 步骤1：触发节点开始事件
      const nodeStartedEvent: NodeStartedEvent = {
        type: 'NODE_STARTED',
        threadId: threadContext.getThreadId(),
        workflowId: threadContext.getWorkflowId(),
        nodeId,
        nodeType,
        timestamp: now()
      };
      await this.eventManager.emit(nodeStartedEvent);

      // 步骤2：节点执行前创建检查点（如果配置了）
      if (this.checkpointDependencies) {
        const configResult = resolveCheckpointConfig(
          this.globalCheckpointConfig,
          node,
          undefined,
          undefined,
          undefined,
          {
            triggerType: 'NODE_BEFORE_EXECUTE',
            nodeId
          }
        );

        if (configResult.shouldCreate) {
          try {
            await createCheckpoint(
              {
                threadId: threadContext.getThreadId(),
                nodeId,
                description: configResult.description || `Before node: ${node.name}`
              },
              this.checkpointDependencies
            );
          } catch (error) {
            // 抛出系统执行错误，由 ErrorService 统一处理
            throw new SystemExecutionError(
              `Failed to create checkpoint before node "${node.name}"`,
              'NodeExecutionCoordinator',
              'executeNode',
              node.id,
              undefined,
              { nodeId: node.id, nodeName: node.name, originalError: getErrorOrNew(error) }
            );
          }
        }
      }

      // 步骤3：执行BEFORE_EXECUTE类型的Hook
      if (node.hooks && node.hooks.length > 0) {
        await executeHook(
          {
            thread: threadContext.thread,
            node,
            checkpointDependencies: this.checkpointDependencies
          },
          'BEFORE_EXECUTE',
          (event) => this.eventManager.emit(event)
        );
      }

      // 步骤4：执行节点逻辑
      const nodeResult = await this.executeNodeLogic(threadContext, node);

      // 步骤5：记录节点执行结果
      threadContext.addNodeResult(nodeResult);

      // 步骤6：执行AFTER_EXECUTE类型的Hook
      if (node.hooks && node.hooks.length > 0) {
        await executeHook(
          {
            thread: threadContext.thread,
            node,
            result: nodeResult,
            checkpointDependencies: this.checkpointDependencies
          },
          'AFTER_EXECUTE',
          (event) => this.eventManager.emit(event)
        );
      }

      // 步骤7：节点执行后创建检查点（如果配置了）
      if (this.checkpointDependencies) {
        const configResult = resolveCheckpointConfig(
          this.globalCheckpointConfig,
          node,
          undefined,
          undefined,
          undefined,
          {
            triggerType: 'NODE_AFTER_EXECUTE',
            nodeId
          }
        );

        if (configResult.shouldCreate) {
          try {
            await createCheckpoint(
              {
                threadId: threadContext.getThreadId(),
                nodeId,
                description: configResult.description || `After node: ${node.name}`
              },
              this.checkpointDependencies
            );
          } catch (error) {
            // 抛出系统执行错误，由 ErrorService 统一处理
            throw new SystemExecutionError(
              `Failed to create checkpoint after node "${node.name}"`,
              'NodeExecutionCoordinator',
              'executeNode',
              node.id,
              undefined,
              { nodeId: node.id, nodeName: node.name, originalError: getErrorOrNew(error) }
            );
          }
        }
      }

      // 步骤8：触发节点完成事件
      if (nodeResult.status === 'COMPLETED') {
        const nodeCompletedEvent: NodeCompletedEvent = {
          type: 'NODE_COMPLETED' as const,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          nodeId,
          output: threadContext.thread.output,
          executionTime: nodeResult.executionTime || 0,
          timestamp: now()
        };
        await this.eventManager.emit(nodeCompletedEvent);
      } else if (nodeResult.status === 'FAILED') {
        const nodeFailedEvent: NodeFailedEvent = {
          type: 'NODE_FAILED',
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          nodeId,
          error: nodeResult.error,
          timestamp: now()
        };
        await this.eventManager.emit(nodeFailedEvent);
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

      const nodeFailedEvent: NodeFailedEvent = {
        type: 'NODE_FAILED',
        threadId: threadContext.getThreadId(),
        workflowId: threadContext.getWorkflowId(),
        nodeId,
        error,
        timestamp: now()
      };
      await this.eventManager.emit(nodeFailedEvent);

      return errorResult;
    }
  }

  /**
   * 处理子图边界
   * @param threadContext 线程上下文
   * @param graphNode 图节点
   */
  private async handleSubgraphBoundary(threadContext: ThreadContext, graphNode: any): Promise<void> {
    const boundaryType = graphNode.internalMetadata[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE] as SubgraphBoundaryType;

    if (boundaryType === 'entry') {
      // 进入子图
      const input = getSubgraphInput(threadContext);
      await enterSubgraph(
        threadContext,
        graphNode.workflowId,
        graphNode.parentWorkflowId!,
        input
      );

      // 触发子图开始事件
      const subgraphStartedEvent: SubgraphStartedEvent = {
        type: 'SUBGRAPH_STARTED',
        threadId: threadContext.getThreadId(),
        workflowId: threadContext.getWorkflowId(),
        subgraphId: graphNode.workflowId,
        parentWorkflowId: graphNode.parentWorkflowId!,
        input,
        timestamp: now()
      };
      await this.eventManager.emit(subgraphStartedEvent);
    } else if (boundaryType === 'exit') {
      // 退出子图
      const subgraphContext = threadContext.getCurrentSubgraphContext();
      if (subgraphContext) {
        const output = getSubgraphOutput(threadContext);

        // 触发子图完成事件
        const subgraphCompletedEvent: SubgraphCompletedEvent = {
          type: 'SUBGRAPH_COMPLETED',
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          subgraphId: subgraphContext.workflowId,
          output,
          executionTime: diffTimestamp(subgraphContext.startTime, now()),
          timestamp: now()
        };
        await this.eventManager.emit(subgraphCompletedEvent);

        await exitSubgraph(threadContext);
      }
    }
  }

  /**
   * 执行节点逻辑
   * @param threadContext 线程上下文
   * @param node 节点定义
   * @returns 节点执行结果
   */
  private async executeNodeLogic(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
    const startTime = now();

    // 1. 使用Node Handler函数执行（配置已在工作流注册时通过静态验证）
    const handler = getNodeHandler(node.type);

    // 准备处理器上下文
    let handlerContext = {};
    if (node.type === 'USER_INTERACTION') {
      if (!this.userInteractionHandler) {
        throw new ExecutionError(
          'UserInteractionHandler is not provided',
          node.id,
          threadContext.getWorkflowId()
        );
      }
      handlerContext = {
        userInteractionHandler: this.userInteractionHandler,
        conversationManager: threadContext.getConversationManager()
      };
    } else if (node.type === 'CONTEXT_PROCESSOR') {
      handlerContext = {
        conversationManager: threadContext.getConversationManager()
      };
    } else if (node.type === 'LLM') {
      handlerContext = {
        llmCoordinator: this.llmCoordinator,
        eventManager: this.eventManager,
        conversationManager: threadContext.getConversationManager(),
        humanRelayHandler: this.humanRelayHandler
      };
    } else if (node.type === 'ADD_TOOL') {
      if (!this.toolContextManager || !this.toolService) {
        throw new ExecutionError(
          'ToolContextManager or ToolService is not provided',
          node.id,
          threadContext.getWorkflowId()
        );
      }
      handlerContext = {
        toolContextManager: this.toolContextManager,
        toolService: this.toolService,
        eventManager: this.eventManager,
        threadContext: threadContext
      };
    }

    const output = await handler(threadContext.thread, node, handlerContext);

    // 2. 构建执行结果
    const endTime = now();
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: output.status || 'COMPLETED',
      step: threadContext.thread.nodeResults.length + 1,
      startTime,
      endTime,
      executionTime: diffTimestamp(startTime, endTime)
    };
  }



}