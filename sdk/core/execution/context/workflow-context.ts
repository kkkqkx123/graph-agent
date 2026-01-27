/**
 * 工作流上下文
 * 提供工作流执行时的共享上下文
 */

import type { WorkflowDefinition } from '../../../types/workflow';
import type { Node } from '../../../types/node';
import type { Edge } from '../../../types/edge';
import { NodeType } from '../../../types/node';
import { EdgeType } from '../../../types/edge';

/**
 * 工作流上下文
 */
export class WorkflowContext {
  private workflow: WorkflowDefinition;
  private config: WorkflowDefinition['config'];
  private nodeMap: Map<string, Node>;
  private edgeMap: Map<string, Edge>;

  constructor(workflow: WorkflowDefinition) {
    this.workflow = workflow;
    this.config = workflow.config || {};
    this.nodeMap = new Map();
    this.edgeMap = new Map();

    // 构建节点和边的映射
    this.buildMaps();
  }

  /**
   * 构建节点和边的映射
   */
  private buildMaps(): void {
    // 构建节点映射
    for (const node of this.workflow.nodes) {
      this.nodeMap.set(node.id, node);
    }

    // 构建边映射
    for (const edge of this.workflow.edges) {
      this.edgeMap.set(edge.id, edge);
    }
  }

  /**
   * 获取工作流定义
   */
  getWorkflow(): WorkflowDefinition {
    return this.workflow;
  }

  /**
   * 获取工作流配置
   */
  getConfig(): WorkflowDefinition['config'] {
    return this.config;
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): Node | undefined {
    return this.nodeMap.get(nodeId);
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): Node[] {
    return this.workflow.nodes;
  }

  /**
   * 获取边
   */
  getEdge(edgeId: string): Edge | undefined {
    return this.edgeMap.get(edgeId);
  }

  /**
   * 获取所有边
   */
  getAllEdges(): Edge[] {
    return this.workflow.edges;
  }

  /**
   * 获取节点的出边
   */
  getOutgoingEdges(nodeId: string): Edge[] {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      return [];
    }

    return node.outgoingEdgeIds
      .map(edgeId => this.edgeMap.get(edgeId))
      .filter((edge): edge is Edge => edge !== undefined)
      .sort((a, b) => {
        // 按权重排序，权重越大优先级越高
        const weightA = a.weight || 0;
        const weightB = b.weight || 0;
        if (weightA !== weightB) {
          return weightB - weightA;
        }
        // 权重相同时按ID排序
        return a.id.localeCompare(b.id);
      });
  }

  /**
   * 获取节点的入边
   */
  getIncomingEdges(nodeId: string): Edge[] {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      return [];
    }

    return node.incomingEdgeIds
      .map(edgeId => this.edgeMap.get(edgeId))
      .filter((edge): edge is Edge => edge !== undefined);
  }

  /**
   * 根据源节点ID获取边
   */
  getEdgesBySource(sourceNodeId: string): Edge[] {
    return Array.from(this.edgeMap.values()).filter(
      edge => edge.sourceNodeId === sourceNodeId
    );
  }

  /**
   * 根据目标节点ID获取边
   */
  getEdgesByTarget(targetNodeId: string): Edge[] {
    return Array.from(this.edgeMap.values()).filter(
      edge => edge.targetNodeId === targetNodeId
    );
  }

  /**
   * 验证工作流上下文
   */
  validate(): boolean {
    // 检查节点映射是否完整
    for (const node of this.workflow.nodes) {
      if (!this.nodeMap.has(node.id)) {
        return false;
      }
    }

    // 检查边映射是否完整
    for (const edge of this.workflow.edges) {
      if (!this.edgeMap.has(edge.id)) {
        return false;
      }

      // 检查边引用的节点是否存在
      if (!this.nodeMap.has(edge.sourceNodeId) ||
        !this.nodeMap.has(edge.targetNodeId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取START节点
   */
  getStartNode(): Node | undefined {
    return Array.from(this.nodeMap.values()).find(
      node => node.type === NodeType.START
    );
  }

  /**
   * 获取END节点
   */
  getEndNode(): Node | undefined {
    return Array.from(this.nodeMap.values()).find(
      node => node.type === NodeType.END
    );
  }
}