/**
 * 图构建器
 * 负责从WorkflowDefinition构建DirectedGraph
 * 支持子工作流递归处理
 */

import type {
  WorkflowDefinition,
  NodeType,
  ID,
  GraphNode,
  GraphEdge,
  GraphBuildOptions,
  SubgraphMergeOptions,
  SubgraphMergeResult,
  Graph,
} from '../../types';
import { GraphData } from '../entities/graph-data';
import { GraphValidator } from '../validation/graph-validator';
import { generateSubgraphNamespace, generateNamespacedNodeId, generateNamespacedEdgeId } from '../../utils/id-utils';
import { SUBGRAPH_METADATA_KEYS } from '../../types/subgraph';

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
        workflowId: workflow.id,
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
    // 构建图
    const graph = this.build(workflow, options);

    // 使用GraphValidator进行验证
    const validationResult = GraphValidator.validate(graph, {
      checkCycles: options.detectCycles,
      checkReachability: options.analyzeReachability,
      checkForkJoin: true,
      checkStartEnd: true,
      checkIsolatedNodes: true,
    });

    return {
      graph,
      isValid: validationResult.valid,
      errors: validationResult.errors.map(e => e.message),
    };
  }

  /**
   * 处理子工作流节点
   * 递归合并子工作流图到主图
   * @param graph 主图
   * @param workflowRegistry 工作流注册器
   * @param maxRecursionDepth 最大递归深度
   * @param currentDepth 当前递归深度
   * @returns 合并结果
   */
  static processSubgraphs(
    graph: GraphData,
    workflowRegistry: any,
    maxRecursionDepth: number = 10,
    currentDepth: number = 0
  ): SubgraphMergeResult {
    const nodeIdMapping = new Map<ID, ID>();
    const edgeIdMapping = new Map<ID, ID>();
    const addedNodeIds: ID[] = [];
    const addedEdgeIds: ID[] = [];
    const removedNodeIds: ID[] = [];
    const removedEdgeIds: ID[] = [];
    const errors: string[] = [];
    const subworkflowIds: ID[] = [];

    // 检查递归深度
    if (currentDepth >= maxRecursionDepth) {
      errors.push(`Maximum recursion depth (${maxRecursionDepth}) exceeded`);
      return {
        success: false,
        nodeIdMapping,
        edgeIdMapping,
        addedNodeIds,
        addedEdgeIds,
        removedNodeIds,
        removedEdgeIds,
        errors,
        subworkflowIds,
      };
    }

    // 查找所有SUBGRAPH节点
    const subgraphNodes: GraphNode[] = [];
    for (const node of graph.nodes.values()) {
      if (node.type === 'SUBGRAPH' as NodeType) {
        subgraphNodes.push(node);
      }
    }

    // 处理每个SUBGRAPH节点
    for (const subgraphNode of subgraphNodes) {
      const subgraphConfig = subgraphNode.originalNode?.config as any;
      if (!subgraphConfig || !subgraphConfig.subgraphId) {
        errors.push(`SUBGRAPH node (${subgraphNode.id}) missing subgraphId`);
        continue;
      }

      const subworkflowId = subgraphConfig.subgraphId;
      const subworkflow = workflowRegistry.get(subworkflowId);

      if (!subworkflow) {
        errors.push(`Subworkflow (${subworkflowId}) not found for SUBGRAPH node (${subgraphNode.id})`);
        continue;
      }

      // 记录子工作流ID
      subworkflowIds.push(subworkflowId);

      // 生成命名空间
      const namespace = generateSubgraphNamespace(subworkflowId, subgraphNode.id);

      // 构建子工作流图
      const subgraphBuildOptions: GraphBuildOptions = {
        validate: true,
        computeTopologicalOrder: true,
        detectCycles: true,
        analyzeReachability: true,
        maxRecursionDepth,
        currentDepth: currentDepth + 1,
        workflowRegistry,
      };

      const subgraphBuildResult = this.buildAndValidate(subworkflow, subgraphBuildOptions);
      if (!subgraphBuildResult.isValid) {
        errors.push(`Failed to build subworkflow (${subworkflowId}): ${subgraphBuildResult.errors.join(', ')}`);
        continue;
      }

      // 合并子工作流图
      const mergeOptions: SubgraphMergeOptions & {
        subworkflowId: ID;
        parentWorkflowId: ID;
        depth: number;
        workflowRegistry?: any;
      } = {
        nodeIdPrefix: namespace,
        edgeIdPrefix: namespace,
        preserveIdMapping: true,
        inputMapping: new Map(Object.entries(subgraphConfig.inputMapping || {})),
        outputMapping: new Map(Object.entries(subgraphConfig.outputMapping || {})),
        subworkflowId: subworkflowId,
        parentWorkflowId: subgraphNode.workflowId,
        depth: currentDepth + 1,
        workflowRegistry,
      };

      const mergeResult = this.mergeGraph(
        graph,
        subgraphBuildResult.graph,
        subgraphNode.id,
        mergeOptions
      );

      if (!mergeResult.success) {
        errors.push(`Failed to merge subworkflow (${subworkflowId}): ${mergeResult.errors.join(', ')}`);
        continue;
      }

      // 更新映射
      mergeResult.nodeIdMapping.forEach((newId, oldId) => nodeIdMapping.set(oldId, newId));
      mergeResult.edgeIdMapping.forEach((newId, oldId) => edgeIdMapping.set(oldId, newId));
      addedNodeIds.push(...mergeResult.addedNodeIds);
      addedEdgeIds.push(...mergeResult.addedEdgeIds);
      removedNodeIds.push(...mergeResult.removedNodeIds);
      removedEdgeIds.push(...mergeResult.removedEdgeIds);
    }

    return {
      success: errors.length === 0,
      nodeIdMapping,
      edgeIdMapping,
      addedNodeIds,
      addedEdgeIds,
      removedNodeIds,
      removedEdgeIds,
      errors,
      subworkflowIds,
    };
  }

  /**
   * 合并子工作流图到主图
   * @param mainGraph 主图
   * @param subgraph 子工作流图
   * @param subgraphNodeId SUBGRAPH节点ID
   * @param options 合并选项
   * @returns 合并结果
   */
  private static mergeGraph(
    mainGraph: GraphData,
    subgraph: GraphData,
    subgraphNodeId: ID,
    options: SubgraphMergeOptions & {
      subworkflowId: ID;
      parentWorkflowId: ID;
      depth: number;
      workflowRegistry?: any;
    }
  ): SubgraphMergeResult {
    const nodeIdMapping = new Map<ID, ID>();
    const edgeIdMapping = new Map<ID, ID>();
    const addedNodeIds: ID[] = [];
    const addedEdgeIds: ID[] = [];
    const removedNodeIds: ID[] = [];
    const removedEdgeIds: ID[] = [];
    const errors: string[] = [];

    // 获取SUBGRAPH节点的入边和出边
    const incomingEdges = mainGraph.getIncomingEdges(subgraphNodeId);
    const outgoingEdges = mainGraph.getOutgoingEdges(subgraphNodeId);

    // 添加子工作流的节点（重命名ID）
    for (const node of subgraph.nodes.values()) {
      const newId = generateNamespacedNodeId(options.nodeIdPrefix || '', node.id);
      const newNode: GraphNode = {
        ...node,
        id: newId,
        originalNode: node.originalNode,
        workflowId: options.subworkflowId,
        parentWorkflowId: options.parentWorkflowId,
      };
      
      // 为边界节点添加metadata标记
      if (node.type === 'START' as NodeType) {
        newNode.metadata = {
          ...newNode.metadata,
          [SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE]: 'entry',
          [SUBGRAPH_METADATA_KEYS.ORIGINAL_NODE_ID]: subgraphNodeId,
          [SUBGRAPH_METADATA_KEYS.NAMESPACE]: options.nodeIdPrefix,
          [SUBGRAPH_METADATA_KEYS.DEPTH]: options.depth
        };
      } else if (node.type === 'END' as NodeType) {
        newNode.metadata = {
          ...newNode.metadata,
          [SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE]: 'exit',
          [SUBGRAPH_METADATA_KEYS.ORIGINAL_NODE_ID]: subgraphNodeId,
          [SUBGRAPH_METADATA_KEYS.NAMESPACE]: options.nodeIdPrefix,
          [SUBGRAPH_METADATA_KEYS.DEPTH]: options.depth
        };
      }
      
      mainGraph.addNode(newNode);
      nodeIdMapping.set(node.id, newId);
      addedNodeIds.push(newId);
    }

    // 添加子工作流的边（重命名ID）
    for (const edge of subgraph.edges.values()) {
      const newId = generateNamespacedEdgeId(options.edgeIdPrefix || '', edge.id);
      const newSourceId = nodeIdMapping.get(edge.sourceNodeId) || edge.sourceNodeId;
      const newTargetId = nodeIdMapping.get(edge.targetNodeId) || edge.targetNodeId;
      const newEdge: GraphEdge = {
        ...edge,
        id: newId,
        sourceNodeId: newSourceId,
        targetNodeId: newTargetId,
        originalEdge: edge.originalEdge,
      };
      mainGraph.addEdge(newEdge);
      edgeIdMapping.set(edge.id, newId);
      addedEdgeIds.push(newId);
    }

    // 处理输入映射：将SUBGRAPH节点的入边连接到子工作流的START节点
    if (subgraph.startNodeId) {
      const newStartNodeId = nodeIdMapping.get(subgraph.startNodeId);
      if (newStartNodeId) {
        for (const incomingEdge of incomingEdges) {
          const newEdge: GraphEdge = {
            ...incomingEdge,
            id: `${incomingEdge.id}_merged`,
            targetNodeId: newStartNodeId,
          };
          mainGraph.addEdge(newEdge);
          addedEdgeIds.push(newEdge.id);
          removedEdgeIds.push(incomingEdge.id);
        }
      }
    }

    // 处理输出映射：将子工作流的END节点连接到SUBGRAPH节点的出边
    for (const endNodeId of subgraph.endNodeIds) {
      const newEndNodeId = nodeIdMapping.get(endNodeId);
      if (newEndNodeId) {
        for (const outgoingEdge of outgoingEdges) {
          const newEdge: GraphEdge = {
            ...outgoingEdge,
            id: `${outgoingEdge.id}_merged`,
            sourceNodeId: newEndNodeId,
          };
          mainGraph.addEdge(newEdge);
          addedEdgeIds.push(newEdge.id);
          removedEdgeIds.push(outgoingEdge.id);
        }
      }
    }

    // 移除SUBGRAPH节点及其相关边
    mainGraph.nodes.delete(subgraphNodeId);
    removedNodeIds.push(subgraphNodeId);
    for (const edgeId of removedEdgeIds) {
      mainGraph.edges.delete(edgeId);
    }

    // 注册工作流关系
    if (options.workflowRegistry) {
      options.workflowRegistry.registerSubgraphRelationship(
        options.parentWorkflowId,
        subgraphNodeId,
        options.subworkflowId
      );
    }

    return {
      success: errors.length === 0,
      nodeIdMapping,
      edgeIdMapping,
      addedNodeIds,
      addedEdgeIds,
      removedNodeIds,
      removedEdgeIds,
      errors,
      subworkflowIds: [],
    };
  }
}