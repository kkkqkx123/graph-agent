import { ID } from '@domain/common/value-objects/id';
import { NodeId } from '@domain/workflow/value-objects/node-id';
import { EdgeData } from '@domain/workflow/entities/workflow';
import { ExecutionState } from '@domain/workflow/entities/execution-state';
import { NodeExecutionResult } from '@domain/workflow/entities/node-execution-result';
import { RouteDecision } from '@domain/workflow/entities/route-decision';
import { Workflow } from '@domain/workflow/entities/workflow';
import { EdgeConditionEvaluator, EdgeEvaluationResult } from './edge-condition-evaluator';

/**
 * 节点路由结果接口（向后兼容）
 */
export interface NodeRoutingResult {
  /** 当前节点ID */
  currentNodeId: NodeId;
  /** 下一个节点ID列表 */
  nextNodeIds: NodeId[];
  /** 满足条件的边 */
  satisfiedEdges: EdgeData[];
  /** 未满足条件的边 */
  unsatisfiedEdges: EdgeData[];
  /** 路由元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 节点路由器
 *
 * 负责根据节点执行结果和边条件确定下一个要执行的节点
 * 支持节点类型路由策略：常规节点、条件节点、子工作流节点
 */
export class NodeRouter {
  private edgeConditionEvaluator: EdgeConditionEvaluator;

  /**
   * 构造函数
   * @param edgeConditionEvaluator 边条件评估器
   */
  constructor(edgeConditionEvaluator?: EdgeConditionEvaluator) {
    this.edgeConditionEvaluator = edgeConditionEvaluator || new EdgeConditionEvaluator();
  }

  /**
   * 路由决策（新接口）
   * @param currentNodeId 当前节点ID
   * @param nodeResult 节点执行结果
   * @param executionState 执行状态
   * @param workflow 工作流
   * @returns 路由决策
   */
  public async route(
    currentNodeId: NodeId,
    nodeResult: NodeExecutionResult,
    executionState: ExecutionState,
    workflow: Workflow
  ): Promise<RouteDecision> {
    const currentNode = workflow.getNode(currentNodeId);
    if (!currentNode) {
      throw new Error(`节点不存在: ${currentNodeId.toString()}`);
    }

    // 根据节点类型选择路由策略
    const nodeType = currentNode.type.toString();
    
    switch (nodeType) {
      case 'sub_workflow':
        return await this.routeSubWorkflowNode(currentNode, nodeResult, executionState);
      
      case 'conditional':
        return await this.routeConditionalNode(currentNode, nodeResult, executionState);
      
      default:
        return await this.routeRegularNode(currentNode, nodeResult, executionState, workflow);
    }
  }

  /**
   * 常规节点路由
   * @param currentNode 当前节点
   * @param nodeResult 节点执行结果
   * @param executionState 执行状态
   * @param workflow 工作流
   * @returns 路由决策
   */
  private async routeRegularNode(
    currentNode: any,
    nodeResult: NodeExecutionResult,
    executionState: ExecutionState,
    workflow: Workflow
  ): Promise<RouteDecision> {
    const outgoingEdges = workflow.getOutgoingEdges(currentNode.id);
    
    if (outgoingEdges.length === 0) {
      return {
        nextNodeIds: [],
        satisfiedEdges: [],
        unsatisfiedEdges: [],
        stateUpdates: {},
        metadata: { reason: 'no_outgoing_edges' }
      };
    }

    // 评估所有出边的条件
    const evaluationResults = await this.edgeConditionEvaluator.evaluateBatch(
      outgoingEdges,
      executionState
    );

    // 分离满足和未满足条件的边
    const satisfiedEdges: EdgeData[] = [];
    const unsatisfiedEdges: EdgeData[] = [];

    for (let i = 0; i < outgoingEdges.length; i++) {
      const edge = outgoingEdges[i];
      const result = evaluationResults[i];

      if (!edge) continue;

      if (result && result.satisfied) {
        satisfiedEdges.push(edge);
      } else {
        unsatisfiedEdges.push(edge);
      }
    }

    // 获取下一个节点ID列表
    const nextNodeIds = satisfiedEdges.map(edge => edge.toNodeId);

    // 去重
    const uniqueNextNodeIds = this.deduplicateNodeIds(nextNodeIds);

    return {
      nextNodeIds: uniqueNextNodeIds,
      satisfiedEdges,
      unsatisfiedEdges,
      stateUpdates: {},
      metadata: {
        totalEdges: outgoingEdges.length,
        satisfiedCount: satisfiedEdges.length,
        unsatisfiedCount: unsatisfiedEdges.length
      }
    };
  }

  /**
   * 子工作流节点路由
   * @param currentNode 当前节点
   * @param nodeResult 节点执行结果
   * @param executionState 执行状态
   * @returns 路由决策
   */
  private async routeSubWorkflowNode(
    currentNode: any,
    nodeResult: NodeExecutionResult,
    executionState: ExecutionState
  ): Promise<RouteDecision> {
    // 子工作流节点通常只有一个默认出边
    const outgoingEdges = executionState.workflowState.currentNodeId
      ? [] // 这里需要从workflow获取，暂时返回空
      : [];

    return {
      nextNodeIds: [],
      satisfiedEdges: [],
      unsatisfiedEdges: outgoingEdges,
      stateUpdates: {
        subWorkflowResult: nodeResult.result
      },
      metadata: { nodeType: 'sub_workflow' }
    };
  }

  /**
   * 条件节点路由
   * @param currentNode 当前节点
   * @param nodeResult 节点执行结果
   * @param executionState 执行状态
   * @returns 路由决策
   */
  private async routeConditionalNode(
    currentNode: any,
    nodeResult: NodeExecutionResult,
    executionState: ExecutionState
  ): Promise<RouteDecision> {
    // 条件节点使用节点配置中的路由逻辑
    const routingConfig = currentNode.properties?.routing;
    
    if (!routingConfig) {
      return {
        nextNodeIds: [],
        satisfiedEdges: [],
        unsatisfiedEdges: [],
        stateUpdates: {},
        metadata: { reason: 'no_routing_config' }
      };
    }

    // 这里需要调用路由函数，暂时返回空
    return {
      nextNodeIds: [],
      satisfiedEdges: [],
      unsatisfiedEdges: [],
      stateUpdates: {},
      metadata: { nodeType: 'conditional', routingConfig }
    };
  }

  /**
   * 确定下一个节点
   * @param currentNodeId 当前节点ID
   * @param outgoingEdges 出边列表
   * @param executionState 执行状态
   * @returns 路由结果
   */
  public async determineNextNodes(
    currentNodeId: NodeId,
    outgoingEdges: EdgeData[],
    executionState: ExecutionState
  ): Promise<NodeRoutingResult> {
    // 如果没有出边，返回空列表
    if (outgoingEdges.length === 0) {
      return {
        currentNodeId,
        nextNodeIds: [],
        satisfiedEdges: [],
        unsatisfiedEdges: [],
        metadata: { reason: 'no_outgoing_edges' }
      };
    }

    // 评估所有出边的条件
    const evaluationResults = await this.edgeConditionEvaluator.evaluateBatch(
      outgoingEdges,
      executionState
    );

    // 分离满足和未满足条件的边
    const satisfiedEdges: EdgeData[] = [];
    const unsatisfiedEdges: EdgeData[] = [];

    for (let i = 0; i < outgoingEdges.length; i++) {
      const edge = outgoingEdges[i];
      const result = evaluationResults[i];

      if (!edge) continue;

      if (result && result.satisfied) {
        satisfiedEdges.push(edge);
      } else {
        unsatisfiedEdges.push(edge);
      }
    }

    // 获取下一个节点ID列表
    const nextNodeIds = satisfiedEdges.map(edge => edge.toNodeId);

    // 去重
    const uniqueNextNodeIds = this.deduplicateNodeIds(nextNodeIds);

    return {
      currentNodeId,
      nextNodeIds: uniqueNextNodeIds,
      satisfiedEdges,
      unsatisfiedEdges,
      metadata: {
        totalEdges: outgoingEdges.length,
        satisfiedCount: satisfiedEdges.length,
        unsatisfiedCount: unsatisfiedEdges.length
      }
    };
  }

  /**
   * 获取节点的出边
   * @param nodeId 节点ID
   * @param allEdges 所有边
   * @returns 出边列表
   */
  public getOutgoingEdges(nodeId: NodeId, allEdges: EdgeData[]): EdgeData[] {
    return allEdges.filter(edge => edge.fromNodeId.equals(nodeId));
  }

  /**
   * 获取节点的入边
   * @param nodeId 节点ID
   * @param allEdges 所有边
   * @returns 入边列表
   */
  public getIncomingEdges(nodeId: NodeId, allEdges: EdgeData[]): EdgeData[] {
    return allEdges.filter(edge => edge.toNodeId.equals(nodeId));
  }

  /**
   * 检查节点是否有出边
   * @param nodeId 节点ID
   * @param allEdges 所有边
   * @returns 是否有出边
   */
  public hasOutgoingEdges(nodeId: NodeId, allEdges: EdgeData[]): boolean {
    return this.getOutgoingEdges(nodeId, allEdges).length > 0;
  }

  /**
   * 检查节点是否有入边
   * @param nodeId 节点ID
   * @param allEdges 所有边
   * @returns 是否有入边
   */
  public hasIncomingEdges(nodeId: NodeId, allEdges: EdgeData[]): boolean {
    return this.getIncomingEdges(nodeId, allEdges).length > 0;
  }

  /**
   * 获取起始节点
   * @param allEdges 所有边
   * @param allNodeIds 所有节点ID
   * @returns 起始节点ID列表
   */
  public getStartNodes(allEdges: EdgeData[], allNodeIds: NodeId[]): NodeId[] {
    const nodeIdsWithIncomingEdges = new Set<string>();

    for (const edge of allEdges) {
      nodeIdsWithIncomingEdges.add(edge.toNodeId.toString());
    }

    return allNodeIds.filter(nodeId => !nodeIdsWithIncomingEdges.has(nodeId.toString()));
  }

  /**
   * 获取结束节点
   * @param allEdges 所有边
   * @param allNodeIds 所有节点ID
   * @returns 结束节点ID列表
   */
  public getEndNodes(allEdges: EdgeData[], allNodeIds: NodeId[]): NodeId[] {
    const nodeIdsWithOutgoingEdges = new Set<string>();

    for (const edge of allEdges) {
      nodeIdsWithOutgoingEdges.add(edge.fromNodeId.toString());
    }

    return allNodeIds.filter(nodeId => !nodeIdsWithOutgoingEdges.has(nodeId.toString()));
  }

  /**
   * 检查是否为结束节点
   * @param nodeId 节点ID
   * @param allEdges 所有边
   * @returns 是否为结束节点
   */
  public isEndNode(nodeId: NodeId, allEdges: EdgeData[]): boolean {
    return !this.hasOutgoingEdges(nodeId, allEdges);
  }

  /**
   * 检查是否为起始节点
   * @param nodeId 节点ID
   * @param allEdges 所有边
   * @returns 是否为起始节点
   */
  public isStartNode(nodeId: NodeId, allEdges: EdgeData[]): boolean {
    return !this.hasIncomingEdges(nodeId, allEdges);
  }

  /**
   * 去重节点ID
   * @param nodeIds 节点ID列表
   * @returns 去重后的节点ID列表
   */
  private deduplicateNodeIds(nodeIds: NodeId[]): NodeId[] {
    const seen = new Set<string>();
    const result: NodeId[] = [];

    for (const nodeId of nodeIds) {
      const id = nodeId.toString();
      if (!seen.has(id)) {
        seen.add(id);
        result.push(nodeId);
      }
    }

    return result;
  }

  /**
   * 获取边条件评估器
   * @returns 边条件评估器
   */
  public getEdgeConditionEvaluator(): EdgeConditionEvaluator {
    return this.edgeConditionEvaluator;
  }

  /**
   * 设置边条件评估器
   * @param edgeConditionEvaluator 边条件评估器
   */
  public setEdgeConditionEvaluator(edgeConditionEvaluator: EdgeConditionEvaluator): void {
    this.edgeConditionEvaluator = edgeConditionEvaluator;
  }
}