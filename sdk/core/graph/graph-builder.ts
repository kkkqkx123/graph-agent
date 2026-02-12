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
} from '@modular-agent/types';
import { GraphData } from '../entities/graph-data';
import { GraphValidator } from '../validation/graph-validator';
import { generateSubgraphNamespace, generateNamespacedNodeId, generateNamespacedEdgeId, generateId } from '@modular-agent/common-utils';
import { SUBGRAPH_METADATA_KEYS } from '@modular-agent/types/subgraph';

/**
 * 图构建器类
 * 不从node、edge拷贝metadata
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

    // 处理Fork/Join Path ID全局唯一化
    this.processForkJoinPathIds(graph);

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
      isValid: validationResult.isOk(),
      errors: validationResult.isErr() ? validationResult.error.map((e: { message: any; }) => e.message) : [],
    };
  }

  /**
   * 处理Fork/Join Path ID全局唯一化
   * 为每个forkPaths中的pathId生成全局唯一ID，确保Fork和Join节点使用相同的Path ID
   * @param graph 图数据
   */
  private static processForkJoinPathIds(graph: GraphData): void {
    const pathIdMapping = new Map<ID, ID>(); // 原始Path ID -> 全局唯一Path ID

    // 收集所有Fork节点并生成全局唯一Path ID
    for (const node of graph.nodes.values()) {
      if (node.type === 'FORK' as NodeType) {
        const config = node.originalNode?.config as any;
        if (config?.forkPaths && Array.isArray(config.forkPaths)) {
          for (const forkPath of config.forkPaths) {
            const originalPathId = forkPath.pathId;
            // 如果还没有生成全局ID，则生成一个新的
            if (!pathIdMapping.has(originalPathId)) {
              pathIdMapping.set(originalPathId, `path-${generateId()}`);
            }
            // 更新forkPath中的pathId为全局唯一ID
            forkPath.pathId = pathIdMapping.get(originalPathId)!;
          }
        }
      }
    }

    // 更新所有Join节点的Path ID
    for (const node of graph.nodes.values()) {
      if (node.type === 'JOIN' as NodeType) {
        const config = node.originalNode?.config as any;
        if (config?.forkPathIds && Array.isArray(config.forkPathIds)) {
          const globalPathIds: ID[] = [];
          for (const originalPathId of config.forkPathIds) {
            // 使用之前生成的全局ID
            if (pathIdMapping.has(originalPathId)) {
              globalPathIds.push(pathIdMapping.get(originalPathId)!);
            } else {
              // 如果Fork节点没有这个Path ID，生成一个新的
              pathIdMapping.set(originalPathId, `path-${generateId()}`);
              globalPathIds.push(pathIdMapping.get(originalPathId)!);
            }
          }
          // 更新Join节点配置
          config.forkPathIds = globalPathIds;

          // 更新mainPathId（如果存在）
          // 设计目的：mainPathId必须指向forkPathIds中的一个值，当forkPathIds被更新为全局唯一ID后(避免重复)，mainPathId也必须更新
          if (config?.mainPathId && pathIdMapping.has(config.mainPathId)) {
            config.mainPathId = pathIdMapping.get(config.mainPathId)!;
          }
        }
      }
    }
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
  static async processSubgraphs(
    graph: GraphData,
    workflowRegistry: any,
    maxRecursionDepth: number = 10,
    currentDepth: number = 0
  ): Promise<SubgraphMergeResult> {
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

      // 确保子工作流已完整预处理（包括引用展开和嵌套子工作流处理）
      let processedSubworkflow = workflowRegistry.getProcessed(subworkflowId);

      if (!processedSubworkflow) {
        // 如果子工作流未预处理，先预处理它
        const subworkflow = workflowRegistry.get(subworkflowId);
        if (!subworkflow) {
          errors.push(`Subworkflow (${subworkflowId}) not found for SUBGRAPH node (${subgraphNode.id})`);
          continue;
        }

        // 预处理子工作流（会递归处理其所有引用和嵌套子工作流）
        await workflowRegistry.preprocessAndStore(subworkflow);

        // 重新获取预处理后的子工作流
        processedSubworkflow = workflowRegistry.getProcessed(subworkflowId);
        if (!processedSubworkflow) {
          errors.push(`Failed to preprocess subworkflow (${subworkflowId}) for SUBGRAPH node (${subgraphNode.id})`);
          continue;
        }
      }

      // 记录子工作流ID
      subworkflowIds.push(subworkflowId);

      // 生成命名空间
      const namespace = generateSubgraphNamespace(subworkflowId, subgraphNode.id);

      // 使用预处理后的子工作流图
      const subgraph = processedSubworkflow.graph as GraphData;

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
        subgraph,
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
        originalNode: node.originalNode, // 保持原始引用，不进行深拷贝
        workflowId: options.subworkflowId,
        parentWorkflowId: options.parentWorkflowId,
      };

      // 为边界节点添加internalMetadata标记
      if (node.type === 'START' as NodeType) {
        newNode.internalMetadata = {
          ...newNode.internalMetadata,
          [SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE]: 'entry',
          [SUBGRAPH_METADATA_KEYS.ORIGINAL_NODE_ID]: subgraphNodeId,
          [SUBGRAPH_METADATA_KEYS.NAMESPACE]: options.nodeIdPrefix,
          [SUBGRAPH_METADATA_KEYS.DEPTH]: options.depth
        };
      } else if (node.type === 'END' as NodeType) {
        newNode.internalMetadata = {
          ...newNode.internalMetadata,
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
          const newEdgeId = `${incomingEdge.id}_merged`;
          const newEdge: GraphEdge = {
            ...incomingEdge,
            id: newEdgeId,
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
          const newEdgeId = `${outgoingEdge.id}_merged`;
          const newEdge: GraphEdge = {
            ...outgoingEdge,
            id: newEdgeId,
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