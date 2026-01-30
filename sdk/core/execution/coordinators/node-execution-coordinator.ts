/**
 * NodeExecutionCoordinator - 节点执行协调器
 * 负责协调节点的执行流程，包括事件触发、Hook执行、子图处理等
 * 
 * 职责：
 * - 协调节点执行的核心逻辑
 * - 处理子图边界（进入/退出）
 * - 执行节点（包括LLM托管节点和普通节点）
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
import { EventCoordinator } from './event-coordinator';
import { SubgraphHandler } from '../handlers/subgraph-handler';
import { LLMCoordinator, type LLMExecutionParams } from '../llm-coordinator';
import { EventType } from '../../../types/events';
import type { NodeStartedEvent, NodeCompletedEvent, NodeFailedEvent, SubgraphStartedEvent, SubgraphCompletedEvent } from '../../../types/events';
import { executeHook } from '../handlers/hook-handlers';
import { HookType } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { now, diffTimestamp } from '../../../utils';
import { getNodeHandler } from '../handlers/node-handlers';
import {
  validateLLMNodeConfig,
  transformLLMNodeConfig,
  validateToolNodeConfig,
  transformToolNodeConfig,
  validateContextProcessorNodeConfig,
  transformContextProcessorNodeConfig,
  validateUserInteractionNodeConfig,
  transformUserInteractionNodeConfig
} from '../handlers/node-handlers/config-utils';
import { SUBGRAPH_METADATA_KEYS, SubgraphBoundaryType } from '../../../types/subgraph';
import type { LLMExecutionRequestData } from '../llm-executor';

/**
 * 节点执行协调器
 */
export class NodeExecutionCoordinator {
  constructor(
    private eventCoordinator: EventCoordinator,
    private llmCoordinator: LLMCoordinator,
    private subgraphHandler: SubgraphHandler
  ) {}

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
    if (graphNode?.metadata?.[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE]) {
      await this.handleSubgraphBoundary(threadContext, graphNode);
    }

    try {
      // 步骤1：触发节点开始事件
      await this.eventCoordinator.emitNodeStartedEvent({
        type: EventType.NODE_STARTED,
        threadId: threadContext.getThreadId(),
        workflowId: threadContext.getWorkflowId(),
        nodeId,
        nodeType,
        timestamp: now()
      });

      // 步骤2：执行BEFORE_EXECUTE类型的Hook
      if (node.hooks && node.hooks.length > 0) {
        await executeHook(
          { thread: threadContext.thread, node },
          HookType.BEFORE_EXECUTE,
          (event) => this.eventCoordinator.getEventManager().emit(event)
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
          (event) => this.eventCoordinator.getEventManager().emit(event)
        );
      }

      // 步骤6：触发节点完成事件
      if (nodeResult.status === 'COMPLETED') {
        await this.eventCoordinator.emitNodeCompletedEvent({
          type: EventType.NODE_COMPLETED,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          nodeId,
          output: nodeResult.data,
          executionTime: nodeResult.executionTime || 0,
          timestamp: now()
        });
      } else if (nodeResult.status === 'FAILED') {
        await this.eventCoordinator.emitNodeFailedEvent({
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

      await this.eventCoordinator.emitNodeFailedEvent({
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
   * 处理子图边界
   * @param threadContext 线程上下文
   * @param graphNode 图节点
   */
  private async handleSubgraphBoundary(threadContext: ThreadContext, graphNode: any): Promise<void> {
    const boundaryType = graphNode.metadata[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE] as SubgraphBoundaryType;
    const originalNodeId = graphNode.metadata[SUBGRAPH_METADATA_KEYS.ORIGINAL_NODE_ID];

    if (boundaryType === 'entry') {
      // 进入子图
      const input = this.subgraphHandler.getSubgraphInput(threadContext, originalNodeId);
      this.subgraphHandler.enterSubgraph(
        threadContext,
        graphNode.workflowId,
        graphNode.parentWorkflowId!,
        input
      );

      // 触发子图开始事件
      await this.eventCoordinator.emitSubgraphStartedEvent({
        type: EventType.SUBGRAPH_STARTED,
        threadId: threadContext.getThreadId(),
        workflowId: threadContext.getWorkflowId(),
        subgraphId: graphNode.workflowId,
        parentWorkflowId: graphNode.parentWorkflowId!,
        input,
        timestamp: now()
      });
    } else if (boundaryType === 'exit') {
      // 退出子图
      const subgraphContext = threadContext.getCurrentSubgraphContext();
      if (subgraphContext) {
        const output = this.subgraphHandler.getSubgraphOutput(threadContext, originalNodeId);

        // 触发子图完成事件
        await this.eventCoordinator.emitSubgraphCompletedEvent({
          type: EventType.SUBGRAPH_COMPLETED,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          subgraphId: subgraphContext.workflowId,
          output,
          executionTime: Date.now() - subgraphContext.startTime,
          timestamp: now()
        });

        this.subgraphHandler.exitSubgraph(threadContext);
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

    // 检查是否为需要LLM执行器托管的节点
    if (this.isLLMManagedNode(node.type)) {
      return await this.executeLLMManagedNode(threadContext, node, startTime);
    } else {
      // 使用Node Handler函数执行
      const handler = getNodeHandler(node.type);
      const output = await handler(threadContext.thread, node);

      // 构建执行结果
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
  private async executeLLMManagedNode(
    threadContext: ThreadContext,
    node: Node,
    startTime: number
  ): Promise<NodeExecutionResult> {
    try {
      // 提取LLM请求数据
      const requestData = this.extractLLMRequestData(node, threadContext);

      // 直接调用 LLMCoordinator
      const result = await this.llmCoordinator.executeLLM({
        threadId: threadContext.getThreadId(),
        nodeId: node.id,
        prompt: requestData.prompt,
        profileId: requestData.profileId,
        parameters: requestData.parameters,
        tools: requestData.tools
      });

      const endTime = now();

      if (result.success) {
        return {
          nodeId: node.id,
          nodeType: node.type,
          status: 'COMPLETED',
          step: threadContext.thread.nodeResults.length + 1,
          data: { content: result.content },
          startTime,
          endTime,
          executionTime: diffTimestamp(startTime, endTime)
        };
      } else {
        return {
          nodeId: node.id,
          nodeType: node.type,
          status: 'FAILED',
          step: threadContext.thread.nodeResults.length + 1,
          error: result.error,
          startTime,
          endTime,
          executionTime: diffTimestamp(startTime, endTime)
        };
      }
    } catch (error) {
      const endTime = now();
      return {
        nodeId: node.id,
        nodeType: node.type,
        status: 'FAILED',
        step: threadContext.thread.nodeResults.length + 1,
        error: error instanceof Error ? error : new Error(String(error)),
        startTime,
        endTime,
        executionTime: diffTimestamp(startTime, endTime)
      };
    }
  }

  /**
   * 从节点配置中提取LLM请求数据
   * @param node 节点定义
   * @param threadContext 线程上下文
   * @returns LLM请求数据
   */
  private extractLLMRequestData(node: Node, threadContext: ThreadContext): LLMExecutionRequestData {
    const config = node.config;

    // 根据节点类型提取特定配置
    switch (node.type) {
      case NodeType.LLM: {
        // 验证配置
        if (!validateLLMNodeConfig(config)) {
          throw new Error('Invalid LLM node configuration');
        }
        
        // 转换配置（类型已通过验证）
        return transformLLMNodeConfig(config);
      }

      case NodeType.TOOL: {
        // 验证配置
        if (!validateToolNodeConfig(config)) {
          throw new Error('Invalid tool node configuration');
        }
        
        // 转换配置（类型已通过验证）
        return transformToolNodeConfig(config);
      }

      case NodeType.CONTEXT_PROCESSOR: {
        // 验证配置
        if (!validateContextProcessorNodeConfig(config)) {
          throw new Error('Invalid context processor node configuration');
        }
        
        // 转换配置（类型已通过验证）
        return transformContextProcessorNodeConfig(config);
      }

      case NodeType.USER_INTERACTION: {
        // 验证配置
        if (!validateUserInteractionNodeConfig(config)) {
          throw new Error('Invalid user interaction node configuration');
        }
        
        // 转换配置（类型已通过验证）
        return transformUserInteractionNodeConfig(config);
      }

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }
}