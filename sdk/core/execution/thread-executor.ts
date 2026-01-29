/**
 * ThreadExecutor - Thread 执行器
 * 负责执行单个 ThreadContext 实例，管理 thread 的完整执行生命周期
 * 支持图导航器进行节点导航
 *
 * 职责：
 * - 执行单个 ThreadContext
 * - 节点导航和执行
 * - 错误处理
 * - 统一协调 Trigger 执行
 *
 * 不负责：
 * - Thread 的创建和注册（由 ThreadCoordinator 负责）
 * - Thread 的暂停、恢复、停止等生命周期管理（由 ThreadCoordinator 负责）
 * - 变量设置等管理操作（由 ThreadCoordinator 负责）
 */

import type { ThreadResult } from '../../types/thread';
import type { Node } from '../../types/node';
import type { NodeExecutionResult } from '../../types/thread';
import type { SubgraphNodeConfig } from '../../types/node';
import { ThreadContext } from './context/thread-context';
import { EventManager } from './managers/event-manager';
import { TriggerManager } from './managers/trigger-manager';
import { NotFoundError } from '../../types/errors';
import { EventType } from '../../types/events';
import type { NodeStartedEvent, NodeCompletedEvent, NodeFailedEvent, ErrorEvent, SubgraphStartedEvent, SubgraphCompletedEvent } from '../../types/events';
import { executeHook } from './handlers/hook-handlers/hook-handler';
import { HookType } from '../../types/node';
import { NodeType } from '../../types/node';
import { ThreadStatus } from '../../types/thread';
import { now, diffTimestamp } from '../../utils';
import { getNodeHandler } from './handlers/node-handlers';
import { SUBGRAPH_METADATA_KEYS, SubgraphBoundaryType } from '../../types/subgraph';
import { LLMCoordinator, type LLMExecutionParams } from './llm-coordinator';
import type { LLMExecutionRequestData } from './llm-executor';

/**
 * ThreadExecutor - Thread 执行器
 *
 * 专注于执行单个 ThreadContext，不负责线程的创建、注册和管理
 * 作为统一协调器，直接调用 TriggerManager 处理触发器
 */
export class ThreadExecutor {
  private eventManager: EventManager;
  private llmCoordinator: LLMCoordinator;
  private triggerManager: TriggerManager;

  constructor(eventManager?: EventManager, triggerManager?: TriggerManager) {
    this.eventManager = eventManager || new EventManager();
    this.llmCoordinator = LLMCoordinator.getInstance();
    this.triggerManager = triggerManager || new TriggerManager();
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
          // 检查是否是END节点
          if (currentNode.type === 'END') {
            // END节点执行完成，设置Thread状态为COMPLETED
            threadContext.thread.status = ThreadStatus.COMPLETED;
            threadContext.thread.endTime = now();
            // 工作流完成
            break;
          }

          // 节点执行成功，路由到下一个节点
          let nextNodeId: string | null = null;

          // 使用图导航器进行路由
          const navigator = threadContext.getNavigator();
          // 获取下一个节点
          const navigationResult = navigator.getNextNode(currentNodeId);

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

    // 获取GraphNode以检查边界信息
    const navigator = threadContext.getNavigator();
    const graphNode = navigator.getGraph().getNode(nodeId);

    // 检查是否是子图边界节点
    if (graphNode?.metadata?.[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE]) {
      const boundaryType = graphNode.metadata[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE] as SubgraphBoundaryType;
      const originalNodeId = graphNode.metadata[SUBGRAPH_METADATA_KEYS.ORIGINAL_NODE_ID];

      if (boundaryType === 'entry') {
        // 进入子图
        const input = this.getSubgraphInput(threadContext, originalNodeId);
        threadContext.enterSubgraph(
          graphNode.workflowId,
          graphNode.parentWorkflowId!,
          input
        );

        // 触发子图开始事件
        await this.eventManager.emit<SubgraphStartedEvent>({
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
          const output = this.getSubgraphOutput(threadContext, originalNodeId);

          // 触发子图完成事件
          await this.eventManager.emit<SubgraphCompletedEvent>({
            type: EventType.SUBGRAPH_COMPLETED,
            threadId: threadContext.getThreadId(),
            workflowId: threadContext.getWorkflowId(),
            subgraphId: subgraphContext.workflowId,
            output,
            executionTime: Date.now() - subgraphContext.startTime,
            timestamp: now()
          });

          threadContext.exitSubgraph();
        }
      }
    }

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
      if (node.hooks && node.hooks.length > 0) {
        await executeHook(
          { thread: threadContext.thread, node },
          HookType.BEFORE_EXECUTE,
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
        await executeHook(
          { thread: threadContext.thread, node, result: nodeResult },
          HookType.AFTER_EXECUTE,
          (event) => this.eventManager.emit(event)
        );
      }

      // 步骤6：触发节点完成事件
      if (nodeResult.status === 'COMPLETED') {
        const completedEvent: NodeCompletedEvent = {
          type: EventType.NODE_COMPLETED,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          nodeId,
          output: nodeResult.data,
          executionTime: nodeResult.executionTime || 0,
          timestamp: now()
        };
        
        // 先触发对外事件
        await this.eventManager.emit(completedEvent);
        
        // 再协调 Trigger 执行
        await this.triggerManager.handleEvent(completedEvent);
      } else if (nodeResult.status === 'FAILED') {
        const failedEvent: NodeFailedEvent = {
          type: EventType.NODE_FAILED,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          nodeId,
          error: nodeResult.error,
          timestamp: now()
        };
        
        // 先触发对外事件
        await this.eventManager.emit(failedEvent);
        
        // 再协调 Trigger 执行
        await this.triggerManager.handleEvent(failedEvent);
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

      const failedEvent: NodeFailedEvent = {
        type: EventType.NODE_FAILED,
        threadId: threadContext.getThreadId(),
        workflowId: threadContext.getWorkflowId(),
        nodeId,
        error,
        timestamp: now()
      };
      
      // 先触发对外事件
      await this.eventManager.emit(failedEvent);
      
      // 再协调 Trigger 执行
      await this.triggerManager.handleEvent(failedEvent);

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
   *
   * @param node 节点定义
   * @param threadContext 线程上下文
   * @returns LLM请求数据
   */
  private extractLLMRequestData(node: Node, threadContext: ThreadContext): LLMExecutionRequestData {
    const config = node.config;

    // 基础请求数据
    const requestData: LLMExecutionRequestData = {
      prompt: '',
      profileId: 'default',
      parameters: {}
    };

    // 根据节点类型提取特定配置
    switch (node.type) {
      case NodeType.LLM: {
        const llmConfig = config as any;
        requestData.prompt = llmConfig.prompt || '';
        requestData.profileId = llmConfig.profileId || 'default';
        requestData.parameters = {
          temperature: llmConfig.temperature,
          maxTokens: llmConfig.maxTokens,
          ...llmConfig.parameters
        };
        // LLM节点可能包含工具列表
        if (llmConfig.tools && Array.isArray(llmConfig.tools)) {
          requestData.tools = llmConfig.tools;
        }
        break;
      }

      case NodeType.TOOL: {
        const toolConfig = config as any;
        requestData.prompt = `Execute tool: ${toolConfig.toolName}`;
        requestData.profileId = 'default';
        requestData.tools = [{
          name: toolConfig.toolName,
          description: `Tool: ${toolConfig.toolName}`,
          parameters: toolConfig.parameters || {}
        }];
        break;
      }

      case NodeType.CONTEXT_PROCESSOR: {
        const cpConfig = config as any;
        requestData.prompt = `Process context with type: ${cpConfig.contextProcessorType}`;
        requestData.profileId = 'default';
        break;
      }

      case NodeType.USER_INTERACTION: {
        const uiConfig = config as any;
        requestData.prompt = uiConfig.showMessage || 'User interaction';
        requestData.profileId = 'default';
        break;
      }

      default:
        requestData.prompt = 'Unknown node type';
        break;
    }

    return requestData;
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
    const errorEvent: ErrorEvent = {
      type: EventType.ERROR,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      error: nodeResult.error,
      timestamp: now()
    };
    
    // 先触发对外事件
    await this.eventManager.emit(errorEvent);
    
    // 再协调 Trigger 执行
    await this.triggerManager.handleEvent(errorEvent);

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
    const errorEvent: ErrorEvent = {
      type: EventType.ERROR,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      error,
      timestamp: now()
    };
    
    // 先触发对外事件
    await this.eventManager.emit(errorEvent);
    
    // 再协调 Trigger 执行
    await this.triggerManager.handleEvent(errorEvent);

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
    return this.eventManager;
  }

  /**
   * 获取触发器管理器
   */
  getTriggerManager(): TriggerManager {
    return this.triggerManager;
  }

  /**
   * 获取子图输入
   */
  private getSubgraphInput(threadContext: ThreadContext, originalSubgraphNodeId: string): any {
    // 从SUBGRAPH节点配置中获取输入映射
    const navigator = threadContext.getNavigator();
    const graphNode = navigator.getGraph().getNode(originalSubgraphNodeId);
    const node = graphNode?.originalNode;

    if (node?.type === 'SUBGRAPH' as NodeType) {
      const config = node.config as SubgraphNodeConfig;
      const input: Record<string, any> = {};

      // 应用输入映射
      for (const [childVar, parentPath] of Object.entries(config.inputMapping)) {
        input[childVar] = this.resolveVariablePath(threadContext, parentPath);
      }

      return input;
    }

    return {};
  }

  /**
   * 获取子图输出
   */
  private getSubgraphOutput(threadContext: ThreadContext, originalSubgraphNodeId: string): any {
    // 从子图执行结果中提取输出
    const subgraphContext = threadContext.getCurrentSubgraphContext();
    if (!subgraphContext) return {};

    // 获取子图的END节点输出
    const navigator = threadContext.getNavigator();
    const endNodes = navigator.getGraph().endNodeIds;

    for (const endNodeId of endNodes) {
      const graphNode = navigator.getGraph().getNode(endNodeId);
      if (graphNode?.workflowId === subgraphContext.workflowId) {
        // 找到子图的END节点，获取其输出
        const nodeResult = threadContext.getNodeResults()
          .find(r => r.nodeId === endNodeId);
        return nodeResult?.data || {};
      }
    }

    return {};
  }

  /**
   * 解析变量路径
   */
  private resolveVariablePath(threadContext: ThreadContext, path: string): any {
    // 支持嵌套路径，如 'variables.user.name' 或 'input.data'
    const parts = path.split('.');
    let current: any = {
      variables: threadContext.getAllVariables(),
      input: threadContext.getInput(),
      output: threadContext.getOutput()
    };

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}