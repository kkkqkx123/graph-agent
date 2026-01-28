/**
 * 图构建器
 * 负责从WorkflowDefinition构建DirectedGraph
 */

import type {
  WorkflowDefinition,
  NodeType,
  ID,
} from '../../types';
import type {
  GraphNode,
  GraphEdge,
  GraphBuildOptions,
} from '../../types';
import { GraphData } from './graph-data';

/**
 * 图构建器类
 */
export class GraphBuilder {
  /**
   * 从工作流定义构建有向图
   */
  static build(
    workflow: WorkflowDefinition,
    options: GraphBuildOptions = {}
  ): GraphData {
    const graph = new GraphData();

    // 构建节点
    for (const node of workflow.nodes) {
      const graphNode: GraphNode = {
        id: node.id,
        type: node.type,
        name: node.name,
        description: node.description,
        metadata: node.metadata,
        originalNode: node,
      };
      graph.addNode(graphNode);

      // 记录START和END节点
      if (node.type === 'START' as NodeType) {
        graph.startNodeId = node.id;
      } else if (node.type === 'END' as NodeType) {
        graph.endNodeIds.add(node.id);
      }
    }

    // 构建边
    for (const edge of workflow.edges) {
      const graphEdge: GraphEdge = {
        id: edge.id,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        type: edge.type,
        label: edge.label,
        description: edge.description,
        weight: edge.weight,
        metadata: edge.metadata,
        originalEdge: edge,
      };
      graph.addEdge(graphEdge);
    }

    return graph;
  }

  /**
   * 验证图的基本结构
   */
  static validateBasicStructure(graph: GraphData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 检查是否有START节点
    if (!graph.startNodeId) {
      errors.push('工作流必须包含一个START节点');
    }

    // 检查是否有END节点
    if (graph.endNodeIds.size === 0) {
      errors.push('工作流必须包含至少一个END节点');
    }

    // 检查START节点是否唯一
    let startNodeCount = 0;
    for (const node of graph.nodes.values()) {
      if (node.type === 'START' as NodeType) {
        startNodeCount++;
      }
    }
    if (startNodeCount > 1) {
      errors.push('工作流只能包含一个START节点');
    }

    // 检查START节点的入度
    if (graph.startNodeId) {
      const incomingEdges = graph.getIncomingEdges(graph.startNodeId);
      if (incomingEdges.length > 0) {
        errors.push('START节点不能有入边');
      }
    }

    // 检查END节点的出度
    for (const endNodeId of graph.endNodeIds) {
      const outgoingEdges = graph.getOutgoingEdges(endNodeId);
      if (outgoingEdges.length > 0) {
        errors.push(`END节点(${endNodeId})不能有出边`);
      }
    }

    // 检查孤立节点
    const isolatedNodes = this.findIsolatedNodes(graph);
    if (isolatedNodes.length > 0) {
      errors.push(
        `发现孤立节点: ${isolatedNodes.map(n => n.id).join(', ')}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 查找孤立节点（既没有入边也没有出边的节点）
   */
  private static findIsolatedNodes(graph: GraphData): GraphNode[] {
    const isolated: GraphNode[] = [];

    for (const node of graph.nodes.values()) {
      const incomingEdges = graph.getIncomingEdges(node.id);
      const outgoingEdges = graph.getOutgoingEdges(node.id);

      // START和END节点不算孤立节点
      if (node.type === 'START' as NodeType || node.type === 'END' as NodeType) {
        continue;
      }

      if (incomingEdges.length === 0 && outgoingEdges.length === 0) {
        isolated.push(node);
      }
    }

    return isolated;
  }

  /**
   * 检查边的引用是否有效
   */
  static validateEdgeReferences(graph: GraphData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const edge of graph.edges.values()) {
      // 检查源节点是否存在
      if (!graph.hasNode(edge.sourceNodeId)) {
        errors.push(
          `边(${edge.id})引用的源节点(${edge.sourceNodeId})不存在`
        );
      }

      // 检查目标节点是否存在
      if (!graph.hasNode(edge.targetNodeId)) {
        errors.push(
          `边(${edge.id})引用的目标节点(${edge.targetNodeId})不存在`
        );
      }

      // 检查自环（除了特殊情况，一般不允许自环）
      if (edge.sourceNodeId === edge.targetNodeId) {
        errors.push(`边(${edge.id})形成自环`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 检查节点ID是否唯一
   */
  static validateNodeIds(workflow: WorkflowDefinition): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const nodeIds = new Set<ID>();

    for (const node of workflow.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(`节点ID重复: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 检查边ID是否唯一
   */
  static validateEdgeIds(workflow: WorkflowDefinition): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const edgeIds = new Set<ID>();

    for (const edge of workflow.edges) {
      if (edgeIds.has(edge.id)) {
        errors.push(`边ID重复: ${edge.id}`);
      }
      edgeIds.add(edge.id);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 完整的构建和验证流程
   */
  static buildAndValidate(
    workflow: WorkflowDefinition,
    options: GraphBuildOptions = {}
  ): {
    graph: GraphData;
    isValid: boolean;
    errors: string[];
  } {
    const allErrors: string[] = [];

    // 验证节点ID唯一性
    const nodeIdValidation = this.validateNodeIds(workflow);
    if (!nodeIdValidation.isValid) {
      allErrors.push(...nodeIdValidation.errors);
    }

    // 验证边ID唯一性
    const edgeIdValidation = this.validateEdgeIds(workflow);
    if (!edgeIdValidation.isValid) {
      allErrors.push(...edgeIdValidation.errors);
    }

    // 构建图
    const graph = this.build(workflow, options);

    // 验证边引用
    const edgeRefValidation = this.validateEdgeReferences(graph);
    if (!edgeRefValidation.isValid) {
      allErrors.push(...edgeRefValidation.errors);
    }

    // 验证基本结构
    const structureValidation = this.validateBasicStructure(graph);
    if (!structureValidation.isValid) {
      allErrors.push(...structureValidation.errors);
    }

    return {
      graph,
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }
}