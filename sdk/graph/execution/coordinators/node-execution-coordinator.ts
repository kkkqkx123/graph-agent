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

import type { ThreadEntity } from '../../entities/thread-entity.js';
import type { Node } from '@modular-agent/types';
import type { NodeExecutionResult } from '@modular-agent/types';
import type { EventManager } from '../../../core/services/event-manager.js';
import type { ConversationManager } from '../../../core/managers/conversation-manager.js';
import type { InterruptionManager } from '../../../core/managers/interruption-manager.js';
import type { GraphNavigator } from '../../preprocessing/graph-navigator.js';
import { LLMExecutionCoordinator } from './llm-execution-coordinator.js';
import { enterSubgraph, exitSubgraph, getSubgraphInput, getSubgraphOutput } from '../handlers/subgraph-handler.js';
import { CheckpointError } from '@modular-agent/types';
import { executeHook } from '../handlers/hook-handlers/index.js';
import { now, diffTimestamp, getErrorOrNew } from '@modular-agent/common-utils';
import { getNodeHandler } from '../handlers/node-handlers/index.js';
import { SUBGRAPH_METADATA_KEYS, SubgraphBoundaryType } from '@modular-agent/types';
import type { CheckpointDependencies } from '../handlers/checkpoint-handlers/checkpoint-utils.js';
import { createCheckpoint } from '../handlers/checkpoint-handlers/checkpoint-utils.js';
import { resolveCheckpointConfig } from '../handlers/checkpoint-handlers/checkpoint-config-resolver.js';
import { emit } from '../utils/index.js';
import {
  buildThreadPausedEvent,
  buildThreadCancelledEvent,
  buildNodeStartedEvent,
  buildNodeCompletedEvent,
  buildNodeFailedEvent,
  buildSubgraphStartedEvent,
  buildSubgraphCompletedEvent
} from '../utils/event/event-builder.js';
import type { InterruptionDetector } from '../managers/interruption-detector.js';
import { checkInterruption, shouldContinue, getInterruptionDescription } from '@modular-agent/common-utils';
import { NodeHandlerContextFactory } from '../factories/node-handler-context-factory.js';
import { createContextualLogger } from '../../../utils/contextual-logger.js';

const logger = createContextualLogger({ operation: 'node-execution-coordinator' });

/**
 * 节点执行协调器配置
 */
export interface NodeExecutionCoordinatorConfig {
  // 核心依赖（必需）
  /** 事件管理器 */
  eventManager: EventManager;
  /** LLM 执行协调器 */
  llmCoordinator: LLMExecutionCoordinator;
  /** 对话管理器 */
  conversationManager: ConversationManager;
  /** 中断管理器 */
  interruptionManager: InterruptionManager;
  /** 图导航器 */
  navigator: GraphNavigator;

  // 检查点相关（可选）
  /** 检查点依赖项（可选） */
  checkpointDependencies?: CheckpointDependencies;
  /** 全局检查点配置（可选） */
  globalCheckpointConfig?: any;

  // 中断检测相关（可选）
  /** 线程注册表（可选） */
  threadRegistry?: any;
  /** 中断检测器（可选） */
  interruptionDetector?: InterruptionDetector;

  // 处理器上下文工厂配置
  /** 用户交互处理器（可选） */
  userInteractionHandler?: any;
  /** 人工中继处理器（可选） */
  humanRelayHandler?: any;
  /** 工具上下文管理器（可选） */
  toolContextManager?: any;
  /** 工具服务（可选） */
  toolService?: any;
  /** Agent 循环执行器工厂（可选） */
  agentLoopExecutorFactory?: any;
}

/**
 * 节点执行协调器
 *
 * 设计说明：
 * - 使用扁平化依赖管理模式，简化访问路径
 * - 核心依赖（eventManager、llmCoordinator等）为必需
 * - 使用 HandlerContextFactory 创建处理器上下文，避免职责过重
 */
export class NodeExecutionCoordinator {
  // 核心依赖（必需）
  private eventManager: EventManager;
  private interruptionManager: InterruptionManager;
  private navigator: GraphNavigator;

  // 检查点相关（可选）
  private checkpointDependencies?: CheckpointDependencies;
  private globalCheckpointConfig?: any;

  // 中断检测相关（可选）
  private threadRegistry?: any;
  private interruptionDetector?: InterruptionDetector;

  // 处理器上下文工厂
  private handlerContextFactory: NodeHandlerContextFactory;

  constructor(config: NodeExecutionCoordinatorConfig) {
    // 核心依赖
    this.eventManager = config.eventManager;
    this.interruptionManager = config.interruptionManager;
    this.navigator = config.navigator;

    // 检查点相关
    this.checkpointDependencies = config.checkpointDependencies;
    this.globalCheckpointConfig = config.globalCheckpointConfig;

    // 中断检测相关
    this.threadRegistry = config.threadRegistry;
    this.interruptionDetector = config.interruptionDetector;

    // 创建处理器上下文工厂
    this.handlerContextFactory = new NodeHandlerContextFactory({
      eventManager: config.eventManager,
      llmCoordinator: config.llmCoordinator,
      conversationManager: config.conversationManager,
      userInteractionHandler: config.userInteractionHandler,
      humanRelayHandler: config.humanRelayHandler,
      toolContextManager: config.toolContextManager,
      toolService: config.toolService,
      agentLoopExecutorFactory: config.agentLoopExecutorFactory,
      threadRegistry: config.threadRegistry
    });
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

    const threadContext = this.threadRegistry?.get(threadId);
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
    logger.info('Handling interruption', { threadId, nodeId, type });

    if (!this.threadRegistry) {
      logger.debug('ThreadRegistry not available, skipping interruption handling', { threadId });
      return;
    }

    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      logger.warn('ThreadContext not found for interruption', { threadId, nodeId });
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
        logger.debug('Interruption checkpoint created', { threadId, nodeId, type });
      } catch (error) {
        logger.error('Failed to create interruption checkpoint', { threadId, nodeId, type, error: getErrorOrNew(error) });
        // 抛出检查点错误，由 ErrorService 统一处理
        throw new CheckpointError(
          'Failed to create interruption checkpoint',
          'create',
          undefined,
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
      logger.info('Thread paused event emitted', { threadId, nodeId });
    } else if (type === 'STOP') {
      threadContext.setStatus('CANCELLED');
      threadContext.setEndTime(now());
      const cancelledEvent = buildThreadCancelledEvent(threadContext.thread, 'user_requested');
      await emit(this.eventManager, cancelledEvent);
      logger.info('Thread cancelled event emitted', { threadId, nodeId });
    }
  }

  /**
   * 执行节点
   * @param threadEntity 线程实体
   * @param node 节点定义
   * @returns 节点执行结果
   */
  async executeNode(threadEntity: ThreadEntity, node: Node): Promise<NodeExecutionResult> {
    const nodeId = node.id;
    const nodeType = node.type;
    const threadId = threadEntity.getThreadId();
    const abortSignal = this.interruptionManager.getAbortSignal();

    logger.debug('Starting node execution', { threadId, nodeId, nodeType, nodeName: node.name });

    // 使用返回值标记体系检查中断
    const interruption = checkInterruption(abortSignal);

    if (!shouldContinue(interruption)) {
      logger.info('Node execution interrupted', { threadId, nodeId, interruptionType: interruption.type });
      // 如果已中止，处理中断（创建检查点、触发事件）
      const interruptionType = interruption.type === 'paused' ? 'PAUSE' : 'STOP';
      await this.handleInterruption(threadId, nodeId, interruptionType);

      // 返回 CANCELLED 状态的结果，不抛出错误
      const cancelledResult: NodeExecutionResult = {
        nodeId,
        nodeType,
        status: 'CANCELLED',
        step: threadEntity.getNodeResults().length + 1,
        error: getInterruptionDescription(interruption),
        startTime: now(),
        endTime: now(),
        executionTime: 0
      };

      threadEntity.addNodeResult(cancelledResult);
      return cancelledResult;
    }

    // 获取GraphNode以检查边界信息
    const graphNode = this.navigator.getGraph().getNode(nodeId);

    // 检查是否是子图边界节点
    if (graphNode?.internalMetadata?.[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE]) {
      logger.debug('Handling subgraph boundary', { threadId, nodeId, boundaryType: graphNode.internalMetadata[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE] });
      await this.handleSubgraphBoundary(threadEntity, graphNode);
    }

    try {
      // 步骤1：触发节点开始事件
      const nodeStartedEvent = buildNodeStartedEvent({
        threadId: threadEntity.getThreadId(),
        workflowId: threadEntity.getWorkflowId(),
        nodeId,
        nodeType
      });
      await emit(this.eventManager, nodeStartedEvent);

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
          logger.debug('Creating checkpoint before node execution', { threadId, nodeId });
          try {
            await createCheckpoint(
              {
                threadId: threadEntity.getThreadId(),
                nodeId,
                description: configResult.description || `Before node: ${node.name}`
              },
              this.checkpointDependencies
            );
          } catch (error) {
            logger.error('Failed to create checkpoint before node', { threadId, nodeId, error: getErrorOrNew(error) });
            // 抛出检查点错误，由 ErrorService 统一处理
            throw new CheckpointError(
              `Failed to create checkpoint before node "${node.name}"`,
              'create',
              undefined,
              node.id,
              undefined,
              { nodeId: node.id, nodeName: node.name, originalError: getErrorOrNew(error) }
            );
          }
        }
      }

      // 步骤3：执行BEFORE_EXECUTE类型的Hook
      if (node.hooks && node.hooks.length > 0) {
        logger.debug('Executing BEFORE_EXECUTE hooks', { threadId, nodeId, hookCount: node.hooks.length });
        await executeHook(
          {
            thread: threadEntity.getThread(),
            node,
            checkpointDependencies: this.checkpointDependencies
          },
          'BEFORE_EXECUTE',
          (event) => this.eventManager.emit(event)
        );
      }

      // 步骤4：执行节点逻辑
      logger.debug('Executing node logic', { threadId, nodeId, nodeType });
      const nodeResult = await this.executeNodeLogic(threadEntity, node);

      // 步骤5：记录节点执行结果
      threadEntity.addNodeResult(nodeResult);

      // 步骤6：执行AFTER_EXECUTE类型的Hook
      if (node.hooks && node.hooks.length > 0) {
        logger.debug('Executing AFTER_EXECUTE hooks', { threadId, nodeId, hookCount: node.hooks.length });
        await executeHook(
          {
            thread: threadEntity.getThread(),
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
          logger.debug('Creating checkpoint after node execution', { threadId, nodeId });
          try {
            await createCheckpoint(
              {
                threadId: threadEntity.getThreadId(),
                nodeId,
                description: configResult.description || `After node: ${node.name}`
              },
              this.checkpointDependencies
            );
          } catch (error) {
            logger.error('Failed to create checkpoint after node', { threadId, nodeId, error: getErrorOrNew(error) });
            // 抛出检查点错误，由 ErrorService 统一处理
            throw new CheckpointError(
              `Failed to create checkpoint after node "${node.name}"`,
              'create',
              undefined,
              node.id,
              undefined,
              { nodeId: node.id, nodeName: node.name, originalError: getErrorOrNew(error) }
            );
          }
        }
      }

      // 步骤8：触发节点完成事件
      if (nodeResult.status === 'COMPLETED') {
        const nodeCompletedEvent = buildNodeCompletedEvent({
          threadId: threadEntity.getThreadId(),
          workflowId: threadEntity.getWorkflowId(),
          nodeId,
          output: threadEntity.getThread().output,
          executionTime: nodeResult.executionTime || 0
        });
        await emit(this.eventManager, nodeCompletedEvent);
        logger.debug('Node execution completed', { threadId, nodeId, executionTime: nodeResult.executionTime });
      } else if (nodeResult.status === 'FAILED') {
        const nodeFailedEvent = buildNodeFailedEvent({
          threadId: threadEntity.getThreadId(),
          workflowId: threadEntity.getWorkflowId(),
          nodeId,
          error: getErrorOrNew(nodeResult.error)
        });
        await emit(this.eventManager, nodeFailedEvent);
        logger.warn('Node execution failed', { threadId, nodeId, error: getErrorOrNew(nodeResult.error) });
      }

      return nodeResult;
    } catch (error) {
      logger.error('Node execution error', { threadId, nodeId, error: getErrorOrNew(error) });
      // 处理节点执行错误
      const errorResult: NodeExecutionResult = {
        nodeId,
        nodeType,
        status: 'FAILED',
        step: threadEntity.getNodeResults().length + 1,
        error,
        startTime: now(),
        endTime: now(),
        executionTime: 0
      };

      threadEntity.addNodeResult(errorResult);

      const nodeFailedEvent = buildNodeFailedEvent({
        threadId: threadEntity.getThreadId(),
        workflowId: threadEntity.getWorkflowId(),
        nodeId,
        error: getErrorOrNew(error)
      });
      await emit(this.eventManager, nodeFailedEvent);

      return errorResult;
    }
  }

  /**
   * 处理子图边界
   * @param threadEntity 线程实体
   * @param graphNode 图节点
   */
  private async handleSubgraphBoundary(threadEntity: ThreadEntity, graphNode: any): Promise<void> {
    const boundaryType = graphNode.internalMetadata[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE] as SubgraphBoundaryType;
    const threadId = threadEntity.getThreadId();

    if (boundaryType === 'entry') {
      logger.info('Entering subgraph', { threadId, subgraphId: graphNode.workflowId, parentWorkflowId: graphNode.parentWorkflowId });
      // 进入子图
      const input = getSubgraphInput(threadEntity);
      await enterSubgraph(
        threadEntity,
        graphNode.workflowId,
        graphNode.parentWorkflowId!,
        input
      );

      // 触发子图开始事件
      const subgraphStartedEvent = buildSubgraphStartedEvent({
        threadId: threadEntity.getThreadId(),
        workflowId: threadEntity.getWorkflowId(),
        subgraphId: graphNode.workflowId,
        parentWorkflowId: graphNode.parentWorkflowId!,
        input
      });
      await emit(this.eventManager, subgraphStartedEvent);
    } else if (boundaryType === 'exit') {
      // 退出子图
      const subgraphContext = threadEntity.getCurrentSubgraphContext();
      if (subgraphContext) {
        const output = getSubgraphOutput(threadEntity);

        logger.info('Exiting subgraph', {
          threadId,
          subgraphId: subgraphContext.workflowId,
          executionTime: diffTimestamp(subgraphContext.startTime, now())
        });

        // 触发子图完成事件
        const subgraphCompletedEvent = buildSubgraphCompletedEvent({
          threadId: threadEntity.getThreadId(),
          workflowId: threadEntity.getWorkflowId(),
          subgraphId: subgraphContext.workflowId,
          output,
          executionTime: diffTimestamp(subgraphContext.startTime, now())
        });
        await emit(this.eventManager, subgraphCompletedEvent);

        await exitSubgraph(threadEntity);
      }
    }
  }

  /**
   * 执行节点逻辑
   * @param threadContext 线程上下文
   * @param node 节点定义
   * @returns 节点执行结果
   */
  private async executeNodeLogic(threadEntity: ThreadEntity, node: Node): Promise<NodeExecutionResult> {
    const startTime = now();

    // 1. 使用Node Handler函数执行（配置已在工作流注册时通过静态验证）
    const handler = getNodeHandler(node.type);

    // 2. 使用工厂创建处理器上下文
    const handlerContext = this.handlerContextFactory.createHandlerContext(node, threadEntity);

    // 3. 执行处理器
    const output = await handler(threadEntity.getThread(), node, handlerContext);

    // 4. 构建执行结果
    const endTime = now();
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: output.status || 'COMPLETED',
      step: threadEntity.getThread().nodeResults.length + 1,
      startTime,
      endTime,
      executionTime: diffTimestamp(startTime, endTime)
    };
  }
}
