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
import type { Node } from '../../../types/node';
import type { NodeExecutionResult } from '../../../types/thread';
import type { EventManager } from '../../services/event-manager';
import type { UserInteractionHandler } from '../../../types/interaction';
import type { HumanRelayHandler } from '../../../types/human-relay';
import { LLMExecutionCoordinator } from './llm-execution-coordinator';
import { enterSubgraph, exitSubgraph, getSubgraphInput, getSubgraphOutput } from '../handlers/subgraph-handler';
import { EventType } from '../../../types/events';
import type { NodeStartedEvent, NodeCompletedEvent, NodeFailedEvent, SubgraphStartedEvent, SubgraphCompletedEvent } from '../../../types/events';
import { ExecutionError } from '../../../types/errors';
import { executeHook } from '../handlers/hook-handlers';
import { HookType } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { now, diffTimestamp } from '../../../utils';
import { getNodeHandler } from '../handlers/node-handlers';
import { SUBGRAPH_METADATA_KEYS, SubgraphBoundaryType } from '../../../types/subgraph';

/**
 * 节点执行协调器
 */
export class NodeExecutionCoordinator {
  constructor(
    private eventManager: EventManager,
    private llmCoordinator: LLMExecutionCoordinator,
    private userInteractionHandler?: UserInteractionHandler,
    private humanRelayHandler?: HumanRelayHandler
  ) { }

  /**
   * 执行节点
   * @param threadContext 线程上下文
   * @param node 节点定义
   * @returns 节点执行结果
   */
  async executeNode(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
    const nodeId = node.id;
    const nodeType = node.type;

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

      // 步骤2：执行BEFORE_EXECUTE类型的Hook
      if (node.hooks && node.hooks.length > 0) {
        await executeHook(
          { thread: threadContext.thread, node },
          HookType.BEFORE_EXECUTE,
          (event) => this.eventManager.emit(event)
        );
      }

      // 步骤3：执行节点逻辑
      const nodeResult = await this.executeNodeLogic(threadContext, node);

      // 步骤4：记录节点执行结果
      threadContext.addNodeResult(nodeResult);

      // 步骤5：执行AFTER_EXECUTE类型的Hook
      if (node.hooks && node.hooks.length > 0) {
        await executeHook(
          { thread: threadContext.thread, node, result: nodeResult },
          HookType.AFTER_EXECUTE,
          (event) => this.eventManager.emit(event)
        );
      }

      // 步骤6：触发节点完成事件
      if (nodeResult.status === 'COMPLETED') {
        const nodeCompletedEvent: NodeCompletedEvent = {
          type: EventType.NODE_COMPLETED,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          nodeId,
          output: nodeResult.data,
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
    const originalNodeId = graphNode.internalMetadata[SUBGRAPH_METADATA_KEYS.ORIGINAL_NODE_ID];

    if (boundaryType === 'entry') {
      // 进入子图
      const input = getSubgraphInput(threadContext, originalNodeId);
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
        const output = getSubgraphOutput(threadContext, originalNodeId);

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
      data: output.status ? undefined : output,
      startTime,
      endTime,
      executionTime: diffTimestamp(startTime, endTime)
    };
  }



}