import { Workflow } from '../entities/workflow';
import { NodeId, NodeType } from '../value-objects/node';
import { WorkflowState } from '../value-objects/workflow-state';
import { StateManager } from './state-manager';
import { CheckpointManager } from './checkpoint-manager';
import { ConditionalRouter } from './conditional-router';
import { INodeExecutor } from './node-executor.interface';

/**
 * 工作流执行选项接口
 */
export interface WorkflowExecutionOptions {
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** 检查点间隔（节点数） */
  checkpointInterval?: number;
  /** 是否记录路由历史 */
  recordRoutingHistory?: boolean;
  /** 最大执行步数 */
  maxSteps?: number;
  /** 执行超时时间（毫秒） */
  timeout?: number;
}

/**
 * 工作流执行结果接口
 */
export interface WorkflowExecutionResult {
  /** 是否成功 */
  readonly success: boolean;
  /** 最终状态 */
  readonly finalState: WorkflowState;
  /** 执行的节点数量 */
  readonly executedNodes: number;
  /** 执行时间（毫秒） */
  readonly executionTime: number;
  /** 错误信息 */
  readonly error?: string;
  /** 创建的检查点数量 */
  readonly checkpointCount: number;
}

/**
 * 工作流引擎
 *
 * 职责：
 * - 协调工作流的执行
 * - 管理节点执行顺序
 * - 处理路由决策
 * - 管理状态和检查点
 *
 * 特性：
 * - 支持顺序执行和条件路由
 * - 支持检查点和恢复
 * - 支持执行超时和最大步数限制
 * - 支持错误处理和恢复
 */
export class WorkflowEngine {
  private stateManager: StateManager;
  private checkpointManager: CheckpointManager;
  private router: ConditionalRouter;
  private nodeExecutor: INodeExecutor;

  constructor(
    stateManager: StateManager,
    checkpointManager: CheckpointManager,
    router: ConditionalRouter,
    nodeExecutor: INodeExecutor
  ) {
    this.stateManager = stateManager;
    this.checkpointManager = checkpointManager;
    this.router = router;
    this.nodeExecutor = nodeExecutor;
  }

  /**
   * 执行工作流
   * @param workflow 工作流
   * @param threadId 线程ID
   * @param initialState 初始状态
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(
    workflow: Workflow,
    threadId: string,
    initialState: Record<string, any>,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const enableCheckpoints = options.enableCheckpoints ?? true;
    const checkpointInterval = options.checkpointInterval ?? 1;
    const maxSteps = options.maxSteps ?? 1000;
    const timeout = options.timeout ?? 300000; // 5分钟默认超时

    // 初始化状态
    this.stateManager.initialize(threadId, workflow.workflowId, initialState);

    // 查找起始节点
    let currentNodeId = this.findStartNode(workflow);
    if (!currentNodeId) {
      throw new Error('工作流没有起始节点');
    }

    let executedNodes = 0;
    let checkpointCount = 0;
    let lastCheckpointStep = 0;

    try {
      // 执行循环
      while (currentNodeId && executedNodes < maxSteps) {
        // 检查超时
        if (Date.now() - startTime > timeout) {
          throw new Error('工作流执行超时');
        }

        // 获取当前节点
        const node = workflow.getNode(NodeId.fromString(currentNodeId));
        if (!node) {
          throw new Error(`节点 ${currentNodeId} 不存在`);
        }

        // 获取当前状态
        const currentState = this.stateManager.getState(threadId);
        if (!currentState) {
          throw new Error(`线程 ${threadId} 的状态不存在`);
        }

        // 创建检查点
        if (enableCheckpoints && executedNodes - lastCheckpointStep >= checkpointInterval) {
          this.checkpointManager.create(
            threadId,
            workflow.workflowId,
            NodeId.fromString(currentNodeId),
            currentState,
            { step: executedNodes }
          );
          checkpointCount++;
          lastCheckpointStep = executedNodes;
        }

        // 执行节点
        const nodeContext = this.buildNodeContext(currentState);
        const canExecute = await this.nodeExecutor.canExecute(node, nodeContext);
        
        if (!canExecute) {
          throw new Error(`节点 ${currentNodeId} 无法执行`);
        }

        const nodeResult = await this.nodeExecutor.execute(node, nodeContext);

        // 更新状态
        this.stateManager.updateState(
          threadId,
          nodeResult.output || {},
          {
            addToHistory: true,
            historyNodeId: NodeId.fromString(currentNodeId),
            historyResult: nodeResult,
            historyStatus: nodeResult.success ? 'success' : 'failure',
            historyMetadata: nodeResult.metadata
          }
        );

        executedNodes++;

        // 获取出边
        const outgoingEdges = workflow.getOutgoingEdges(NodeId.fromString(currentNodeId));
        
        if (outgoingEdges.length === 0) {
          // 没有出边，执行结束
          break;
        }

        // 路由决策
        const routingResult = await this.router.route(
          outgoingEdges,
          this.stateManager.getState(threadId)!,
          {
            recordHistory: options.recordRoutingHistory,
            useDefaultEdge: true
          }
        );

        if (!routingResult) {
          // 没有可用的路由，执行结束
          break;
        }

        currentNodeId = routingResult.targetNodeId;
      }

      // 获取最终状态
      const finalState = this.stateManager.getState(threadId)!;

      return {
        success: true,
        finalState,
        executedNodes,
        executionTime: Date.now() - startTime,
        checkpointCount
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 获取当前状态
      const currentState = this.stateManager.getState(threadId);
      
      return {
        success: false,
        finalState: currentState || WorkflowState.initial(workflow.workflowId),
        executedNodes,
        executionTime: Date.now() - startTime,
        error: errorMessage,
        checkpointCount
      };
    }
  }

  /**
   * 从检查点恢复执行
   * @param workflow 工作流
   * @param threadId 线程ID
   * @param checkpointId 检查点ID
   * @param options 执行选项
   * @returns 执行结果
   */
  async resumeFromCheckpoint(
    workflow: Workflow,
    threadId: string,
    checkpointId: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    // 恢复状态
    const restoredState = this.checkpointManager.restore(checkpointId);
    if (!restoredState) {
      throw new Error(`检查点 ${checkpointId} 不存在`);
    }

    // 更新状态管理器
    this.stateManager.clearState(threadId);
    this.stateManager.initialize(threadId, workflow.workflowId, restoredState.data);

    // 从当前节点继续执行
    const currentNodeId = restoredState.currentNodeId?.value;
    if (!currentNodeId) {
      throw new Error('检查点中没有当前节点信息');
    }

    // 继续执行
    return this.execute(workflow, threadId, restoredState.data, options);
  }

  /**
   * 查找起始节点（私有方法）
   * @param workflow 工作流
   * @returns 起始节点ID，如果没有找到则返回 null
   */
  private findStartNode(workflow: Workflow): string | null {
    const nodes = workflow.getNodes();
    
    // 查找类型为 START 的节点
    for (const [nodeId, node] of nodes.entries()) {
      if (node.type.equals(NodeType.start())) {
        return nodeId;
      }
    }

    // 如果没有 START 节点，返回第一个节点
    if (nodes.size > 0) {
      const firstNodeId = nodes.keys().next().value;
      return firstNodeId ?? null;
    }

    return null;
  }

  /**
   * 构建节点执行上下文（私有方法）
   * @param state 工作流状态
   * @returns 节点执行上下文
   */
  private buildNodeContext(state: WorkflowState): any {
    return {
      variables: state.data,
      metadata: state.metadata,
      history: state.history,
      getVariable: (key: string) => state.getData(key),
      setVariable: (key: string, value: any) => {
        // 注意：这里只是返回一个函数，实际的变量更新在状态管理器中完成
        return value;
      },
      getNodeResult: (nodeId: string) => {
        const historyEntry = state.history.find(h => h.nodeId.value === nodeId);
        return historyEntry?.result;
      }
    };
  }
}