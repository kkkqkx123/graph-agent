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

import { ThreadContext } from '../context/thread-context';
import type { Node } from '@modular-agent/types/node';
import type { NodeExecutionResult } from '@modular-agent/types/thread';
import type { EventManager } from '../../services/event-manager';
import type { UserInteractionHandler } from '@modular-agent/types';
import type { HumanRelayHandler } from '@modular-agent/types';
import { LLMExecutionCoordinator } from './llm-execution-coordinator';
import { enterSubgraph, exitSubgraph, getSubgraphInput, getSubgraphOutput } from '../handlers/subgraph-handler';
import { EventType } from '@modular-agent/types/events';
import type { NodeStartedEvent, NodeCompletedEvent, NodeFailedEvent, SubgraphStartedEvent, SubgraphCompletedEvent } from '@modular-agent/types/events';
import { ExecutionError, ThreadInterruptedException } from '@modular-agent/types/errors';
import { executeHook } from '../handlers/hook-handlers';
import { HookType } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { now, diffTimestamp } from '@modular-agent/common-utils';
import { getNodeHandler } from '../handlers/node-handlers';
import { SUBGRAPH_METADATA_KEYS, SubgraphBoundaryType } from '@modular-agent/types/subgraph';
import type { CheckpointDependencies } from '../handlers/checkpoint-handlers/checkpoint-utils';
import { createCheckpoint } from '../handlers/checkpoint-handlers/checkpoint-utils';
import { resolveCheckpointConfig } from '../handlers/checkpoint-handlers/checkpoint-config-resolver';
import { CheckpointTriggerType } from '@modular-agent/types/checkpoint';
import { ThreadStatus } from '@modular-agent/types/thread';
import { emit } from '../utils/event/event-emitter';
import { buildThreadPausedEvent, buildThreadCancelledEvent } from '../utils/event/event-builder';

/**
 * 节点执行协调器
 */
export class NodeExecutionCoordinator {
  constructor(
    private eventManager: EventManager,
    private llmCoordinator: LLMExecutionCoordinator,
    private userInteractionHandler?: UserInteractionHandler,
    private humanRelayHandler?: HumanRelayHandler,
    private checkpointDependencies?: CheckpointDependencies,
    private globalCheckpointConfig?: any,
    private threadRegistry?: any
  ) { }

  /**
   * 检查是否应该中断当前执行
   *
   * @param threadId Thread ID
   * @returns 是否应该中断
   */
  shouldInterrupt(threadId: string): boolean {
    if (!this.threadRegistry) {
      return false;
    }
    
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      return false;
    }
    
    return threadContext.getShouldStop() || threadContext.getShouldPause();
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
        console.error(`Failed to create interruption checkpoint:`, error);
        // 检查点创建失败不应影响中断流程
      }
    }

    // 触发相应的事件
    if (type === 'PAUSE') {
      threadContext.setStatus(ThreadStatus.PAUSED);
      const pausedEvent = buildThreadPausedEvent(threadContext.thread);
      await emit(this.eventManager, pausedEvent);
    } else if (type === 'STOP') {
      threadContext.setStatus(ThreadStatus.CANCELLED);
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

    // 检查是否应该中断
    if (this.shouldInterrupt(threadId)) {
      const interruptionType = threadContext.getShouldStop() ? 'STOP' : 'PAUSE';
      await this.handleInterruption(threadId, nodeId, interruptionType);
      throw new ThreadInterruptedException(
        `Thread ${interruptionType.toLowerCase()} at node: ${nodeId}`,
        interruptionType,
        threadId,
        nodeId
      );
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
        type: EventType.NODE_STARTED,
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
            triggerType: CheckpointTriggerType.NODE_BEFORE_EXECUTE,
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
            console.error(
              `Failed to create checkpoint before node "${node.name}":`,
              error
            );
            // 检查点创建失败不应影响节点执行
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
          HookType.BEFORE_EXECUTE,
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
          HookType.AFTER_EXECUTE,
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
            triggerType: CheckpointTriggerType.NODE_AFTER_EXECUTE,
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
            console.error(
              `Failed to create checkpoint after node "${node.name}":`,
              error
            );
            // 检查点创建失败不应影响节点执行
          }
        }
      }

      // 步骤8：触发节点完成事件
      if (nodeResult.status === 'COMPLETED') {
        const nodeCompletedEvent: NodeCompletedEvent = {
          type: EventType.NODE_COMPLETED,
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
          type: EventType.NODE_FAILED,
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
        type: EventType.NODE_FAILED,
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
      enterSubgraph(
        threadContext,
        graphNode.workflowId,
        graphNode.parentWorkflowId!,
        input
      );

      // 触发子图开始事件
      const subgraphStartedEvent: SubgraphStartedEvent = {
        type: EventType.SUBGRAPH_STARTED,
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
          type: EventType.SUBGRAPH_COMPLETED,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          subgraphId: subgraphContext.workflowId,
          output,
          executionTime: Date.now() - subgraphContext.startTime,
          timestamp: now()
        };
        await this.eventManager.emit(subgraphCompletedEvent);

        exitSubgraph(threadContext);
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
    if (node.type === NodeType.USER_INTERACTION) {
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
    } else if (node.type === NodeType.CONTEXT_PROCESSOR) {
      handlerContext = {
        conversationManager: threadContext.getConversationManager()
      };
    } else if (node.type === NodeType.LLM) {
      handlerContext = {
        llmCoordinator: this.llmCoordinator,
        eventManager: this.eventManager,
        conversationManager: threadContext.getConversationManager(),
        humanRelayHandler: this.humanRelayHandler
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