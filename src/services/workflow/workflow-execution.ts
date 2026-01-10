/**
 * 工作流执行引擎
 *
 * 负责工作流图的遍历和执行，包括：
 * - 节点路由决策
 * - 边条件评估
 * - 工作流图遍历
 * - 执行上下文管理
 * - 执行结果收集
 *
 * 属于基础设施层，提供技术性的工作流执行支持
 */

import { injectable, inject } from 'inversify';
import { Workflow } from '../../domain/workflow/entities/workflow';
import { NodeId } from '../../domain/workflow/value-objects';
import { ExecutionContext } from '../../domain/threads/value-objects/execution-context';
import { NodeRouter } from './node-router';
import { NodeExecutor } from './nodes/node-executor';
import { EdgeExecutor } from './edges/edge-executor';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 执行结果接口
 */
export interface WorkflowExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 执行的节点ID列表 */
  executedNodes: NodeId[];
  /** 执行结果 */
  results: Map<NodeId, unknown>;
  /** 错误信息 */
  error?: string;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 执行统计 */
  statistics: {
    totalNodes: number;
    executedNodes: number;
    completedNodes: number;
    failedNodes: number;
    skippedNodes: number;
  };
}

/**
 * 路由决策结果接口
 */
export interface RoutingDecision {
  /** 下一个节点ID */
  nextNodeId: NodeId | null;
  /** 使用的边 */
  usedEdge?: string;
  /** 决策原因 */
  reason: string;
}

/**
 * 工作流执行引擎
 */
@injectable()
export class WorkflowExecutionEngine {
  private readonly nodeRouter: NodeRouter;
  private readonly nodeExecutor: NodeExecutor;
  private readonly edgeExecutor: EdgeExecutor;
  private readonly logger: ILogger;

  constructor(
    @inject('NodeRouter') nodeRouter: NodeRouter,
    @inject('NodeExecutor') nodeExecutor: NodeExecutor,
    @inject('EdgeExecutor') edgeExecutor: EdgeExecutor,
    @inject('Logger') logger: ILogger
  ) {
    this.nodeRouter = nodeRouter;
    this.nodeExecutor = nodeExecutor;
    this.edgeExecutor = edgeExecutor;
    this.logger = logger;
  }

  /**
   * 执行工作流
   *
   * @param workflow 工作流
   * @param context 执行上下文
   * @returns 执行结果
   */
  public async execute(
    workflow: Workflow,
    context: ExecutionContext
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const executedNodes: NodeId[] = [];
    const results = new Map<NodeId, unknown>();
    let currentNodeId: NodeId | null = null;

    try {
      // 1. 获取起始节点
      const startNodes = this.nodeRouter.getStartNodes(workflow);
      if (startNodes.length === 0) {
        throw new Error('工作流没有起始节点');
      }

      // 2. 从第一个起始节点开始执行
      currentNodeId = startNodes[0] || null;

      // 3. 遍历执行节点
      while (currentNodeId) {
        // 执行节点
        const result = await this.executeNode(workflow, currentNodeId, context);
        executedNodes.push(currentNodeId);
        results.set(currentNodeId, result);

        // 确定下一个节点
        const decision = await this.determineNextNode(workflow, currentNodeId, context);
        currentNodeId = decision.nextNodeId;

        // 如果没有下一个节点，结束执行
        if (!currentNodeId) {
          this.logger.info('工作流执行完成', { executedNodes: executedNodes.length });
          break;
        }
      }

      // 4. 返回执行结果
      return {
        success: true,
        executedNodes,
        results,
        duration: Date.now() - startTime,
        statistics: this.calculateStatistics(workflow, executedNodes),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('工作流执行失败', error as Error, { executedNodes });

      return {
        success: false,
        executedNodes,
        results,
        error: errorMessage,
        duration: Date.now() - startTime,
        statistics: this.calculateStatistics(workflow, executedNodes),
      };
    }
  }

  /**
   * 执行单个节点
   *
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @param context 执行上下文
   * @returns 执行结果
   */
  private async executeNode(
    workflow: Workflow,
    nodeId: NodeId,
    context: ExecutionContext
  ): Promise<unknown> {
    const node = workflow.getNode(nodeId);
    if (!node) {
      throw new Error(`节点不存在: ${nodeId.toString()}`);
    }

    this.logger.info('执行节点', { nodeId: nodeId.toString() });

    // 执行节点
    const result = await this.nodeExecutor.execute(node, context as any);

    return result;
  }

  /**
   * 确定下一个节点
   *
   * @param workflow 工作流
   * @param currentNodeId 当前节点ID
   * @param context 执行上下文
   * @returns 路由决策
   */
  private async determineNextNode(
    workflow: Workflow,
    currentNodeId: NodeId,
    context: ExecutionContext
  ): Promise<RoutingDecision> {
    const outgoingEdges = workflow.getOutgoingEdges(currentNodeId);

    if (outgoingEdges.length === 0) {
      return {
        nextNodeId: null,
        reason: '当前节点没有出边，执行结束',
      };
    }

    // 使用 EdgeExecutor 评估所有出边
    const satisfiedEdges: typeof outgoingEdges = [];
    for (const edge of outgoingEdges) {
      // 委托给 EdgeExecutor 验证边是否可执行
      const canExecute = await this.edgeExecutor.canExecute(edge, context as any);
      if (canExecute) {
        satisfiedEdges.push(edge);
      }
    }

    if (satisfiedEdges.length === 0) {
      return {
        nextNodeId: null,
        reason: '没有满足条件的边，执行结束',
      };
    }

    // 按优先级排序
    const sortedEdges = [...satisfiedEdges].sort((a, b) => {
      return b.getPriority() - a.getPriority(); // 降序排列
    });

    // 返回第一个满足条件的边的目标节点
    const selectedEdge = sortedEdges[0];
    if (!selectedEdge) {
      return {
        nextNodeId: null,
        reason: '没有找到满足条件的边',
      };
    }

    return {
      nextNodeId: selectedEdge.toNodeId,
      usedEdge: selectedEdge.id.toString(),
      reason: `选择满足条件的边: ${selectedEdge.id.toString()}`,
    };
  }

  /**
   * 计算执行统计
   *
   * @param workflow 工作流
   * @param executedNodes 已执行的节点列表
   * @returns 执行统计
   */
  private calculateStatistics(
    workflow: Workflow,
    executedNodes: NodeId[]
  ): {
    totalNodes: number;
    executedNodes: number;
    completedNodes: number;
    failedNodes: number;
    skippedNodes: number;
  } {
    const totalNodes = workflow.getNodeCount();
    const executedCount = executedNodes.length;

    return {
      totalNodes,
      executedNodes: executedCount,
      completedNodes: executedCount,
      failedNodes: 0,
      skippedNodes: totalNodes - executedCount,
    };
  }

  /**
   * 获取起始节点
   *
   * @param workflow 工作流
   * @returns 起始节点ID列表
   */
  public getStartNodes(workflow: Workflow): NodeId[] {
    return this.nodeRouter.getStartNodes(workflow);
  }

  /**
   * 获取结束节点
   *
   * @param workflow 工作流
   * @returns 结束节点ID列表
   */
  public getEndNodes(workflow: Workflow): NodeId[] {
    return this.nodeRouter.getEndNodes(workflow);
  }

  /**
   * 检查节点是否可达
   *
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @returns 是否可达
   */
  public isNodeReachable(workflow: Workflow, nodeId: NodeId): boolean {
    return this.nodeRouter.isNodeReachable(workflow, nodeId);
  }

  /**
   * 获取从起始节点到指定节点的路径
   *
   * @param workflow 工作流
   * @param nodeId 节点ID
   * @returns 路径节点ID列表
   */
  public getPathToNode(workflow: Workflow, nodeId: NodeId): NodeId[] {
    return this.nodeRouter.getPathToNode(workflow, nodeId);
  }
}
