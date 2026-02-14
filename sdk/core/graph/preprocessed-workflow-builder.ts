/**
 * 预处理工作流构建器
 * 负责构建预处理后的工作流，完成所有ID映射和配置更新
 */

import type {
  WorkflowDefinition,
  ID,
  GraphNode,
  GraphEdge,
  IdMapping,
  SubgraphRelationship,
  WorkflowTrigger,
  TriggerReference
} from '@modular-agent/types';
import type { Node } from '@modular-agent/types';
import type { Edge } from '@modular-agent/types';
import type { NodeType } from '@modular-agent/types';
import { GraphData } from '../entities/graph-data';
import { nodeConfigUpdaterRegistry } from './node-config-updater-registry';
import { generateSubgraphNamespace } from '@modular-agent/common-utils';
import { NodeType as NodeTypeEnum } from '@modular-agent/types';

/**
 * 预处理工作流构建器类
 * 负责构建预处理后的工作流，完成所有ID映射和配置更新
 */
export class PreprocessedWorkflowBuilder {
  private nodeIndexCounter = 0;
  private edgeIndexCounter = 0;
  private idMapping: IdMapping = {
    nodeIds: new Map(),
    edgeIds: new Map(),
    reverseNodeIds: new Map(),
    reverseEdgeIds: new Map(),
    subgraphNamespaces: new Map()
  };
  
  /**
   * 构建预处理后的工作流
   * @param workflow 工作流定义
   * @param workflowRegistry 工作流注册器
   * @returns 预处理后的工作流定义
   */
  async build(
    workflow: WorkflowDefinition,
    workflowRegistry: any
  ): Promise<{
    graph: GraphData;
    idMapping: IdMapping;
    nodeConfigs: Map<ID, any>;
    triggerConfigs: Map<ID, any>;
    subgraphRelationships: SubgraphRelationship[];
  }> {
    // 步骤1：构建图结构
    const graph = await this.buildGraph(workflow, workflowRegistry);
    
    // 步骤2：更新节点配置
    const nodeConfigs = await this.updateNodeConfigs(workflow);
    
    // 步骤3：更新触发器配置
    const triggerConfigs = await this.updateTriggerConfigs(workflow);
    
    // 步骤4：构建子图关系
    const subgraphRelationships = await this.buildSubgraphRelationships(workflow, workflowRegistry);
    
    return {
      graph,
      idMapping: this.idMapping,
      nodeConfigs,
      triggerConfigs,
      subgraphRelationships
    };
  }
  
  /**
   * 构建图结构
   * @param workflow 工作流定义
   * @param workflowRegistry 工作流注册器
   * @returns 图数据
   */
  private async buildGraph(
    workflow: WorkflowDefinition,
    workflowRegistry: any
  ): Promise<GraphData> {
    const graph = new GraphData();
    
    // 添加节点（分配索引ID）
    for (const node of workflow.nodes) {
      const indexId = this.allocateNodeId(node.id);
      
      const graphNode: GraphNode = {
        id: indexId.toString(),
        type: node.type,
        name: node.name,
        description: node.description,
        originalNode: node,
        workflowId: workflow.id,
      };
      
      graph.addNode(graphNode);
      
      // 记录START和END节点
      if (node.type === NodeTypeEnum.START) {
        graph.startNodeId = indexId.toString();
      } else if (node.type === NodeTypeEnum.END) {
        graph.endNodeIds.add(indexId.toString());
      }
    }
    
    // 添加边（分配索引ID）
    for (const edge of workflow.edges) {
      const indexId = this.allocateEdgeId(edge.id);
      const sourceIndexId = this.idMapping.nodeIds.get(edge.sourceNodeId)?.toString() || edge.sourceNodeId;
      const targetIndexId = this.idMapping.nodeIds.get(edge.targetNodeId)?.toString() || edge.targetNodeId;
      
      const graphEdge: GraphEdge = {
        id: indexId.toString(),
        sourceNodeId: sourceIndexId,
        targetNodeId: targetIndexId,
        type: edge.type,
        label: edge.label,
        description: edge.description,
        weight: edge.weight,
        originalEdge: edge,
      };
      
      graph.addEdge(graphEdge);
    }
    
    // 处理子图
    await this.processSubgraphs(graph, workflow, workflowRegistry);
    
    return graph;
  }
  
  /**
   * 处理子图
   * @param graph 图数据
   * @param workflow 工作流定义
   * @param workflowRegistry 工作流注册器
   */
  private async processSubgraphs(
    graph: GraphData,
    workflow: WorkflowDefinition,
    workflowRegistry: any
  ): Promise<void> {
    const subgraphNodes = workflow.nodes.filter(n => n.type === NodeTypeEnum.SUBGRAPH);
    
    for (const subgraphNode of subgraphNodes) {
      const subgraphConfig = subgraphNode.config as any;
      if (!subgraphConfig || !subgraphConfig.subgraphId) {
        continue;
      }
      
      const subworkflowId = subgraphConfig.subgraphId;
      const subworkflow = workflowRegistry.get(subworkflowId);
      if (!subworkflow) {
        continue;
      }
      
      // 生成子图命名空间
      const namespace = this.generateSubgraphNamespace(subworkflowId, subgraphNode.id);
      this.idMapping.subgraphNamespaces.set(subworkflowId, namespace);
      
      // 递归处理子工作流
      const preprocessedSubworkflow = await this.build(subworkflow, workflowRegistry);
      
      // 合并子图
      this.mergeSubgraph(graph, preprocessedSubworkflow, subgraphNode.id, namespace);
    }
  }
  
  /**
   * 合并子图
   * @param mainGraph 主图
   * @param subworkflow 预处理后的子工作流
   * @param subgraphNodeId SUBGRAPH节点ID
   * @param namespace 命名空间
   */
  private mergeSubgraph(
    mainGraph: GraphData,
    subworkflow: {
      graph: GraphData;
      idMapping: IdMapping;
    },
    subgraphNodeId: ID,
    namespace: string
  ): void {
    // 添加子图节点
    for (const node of subworkflow.graph.nodes.values()) {
      const newNode: GraphNode = {
        ...node,
        workflowId: subworkflow.graph.nodes.get(subworkflow.graph.startNodeId!)?.workflowId || node.workflowId,
        parentWorkflowId: mainGraph.nodes.get(subworkflow.graph.startNodeId!)?.workflowId,
      };
      
      mainGraph.addNode(newNode);
    }
    
    // 添加子图边
    for (const edge of subworkflow.graph.edges.values()) {
      mainGraph.addEdge(edge);
    }
    
    // 连接SUBGRAPH节点的入边到子图的START节点
    const incomingEdges = mainGraph.getIncomingEdges(subgraphNodeId);
    const subgraphStartId = subworkflow.graph.startNodeId;
    if (subgraphStartId) {
      for (const incomingEdge of incomingEdges) {
        const newEdge: GraphEdge = {
          ...incomingEdge,
          id: this.allocateEdgeId(`${incomingEdge.id}_merged`).toString(),
          targetNodeId: subgraphStartId,
        };
        mainGraph.addEdge(newEdge);
      }
    }
    
    // 连接子图的END节点到SUBGRAPH节点的出边
    const outgoingEdges = mainGraph.getOutgoingEdges(subgraphNodeId);
    for (const endNodeId of subworkflow.graph.endNodeIds) {
      for (const outgoingEdge of outgoingEdges) {
        const newEdge: GraphEdge = {
          ...outgoingEdge,
          id: this.allocateEdgeId(`${outgoingEdge.id}_merged`).toString(),
          sourceNodeId: endNodeId,
        };
        mainGraph.addEdge(newEdge);
      }
    }
    
    // 移除SUBGRAPH节点
    mainGraph.nodes.delete(subgraphNodeId);
  }
  
  /**
   * 更新节点配置
   * @param workflow 工作流定义
   * @returns 节点配置映射
   */
  private async updateNodeConfigs(workflow: WorkflowDefinition): Promise<Map<ID, any>> {
    const nodeConfigs = new Map<ID, any>();
    
    for (const node of workflow.nodes) {
      const indexId = this.idMapping.nodeIds.get(node.id);
      if (indexId === undefined) {
        continue;
      }
      
      // 使用注册的更新器更新配置
      const updatedNode = nodeConfigUpdaterRegistry.updateIdReferences(node, this.idMapping);
      nodeConfigs.set(indexId.toString(), updatedNode.config);
    }
    
    return nodeConfigs;
  }
  
  /**
   * 更新触发器配置
   * @param workflow 工作流定义
   * @returns 触发器配置映射
   */
  private async updateTriggerConfigs(workflow: WorkflowDefinition): Promise<Map<ID, any>> {
    const triggerConfigs = new Map<ID, any>();
    
    if (!workflow.triggers) {
      return triggerConfigs;
    }
    
    for (const trigger of workflow.triggers) {
      // 跳过TriggerReference，只处理WorkflowTrigger
      if (!('id' in trigger)) {
        continue;
      }
      
      // 更新触发器配置中的ID引用
      const updatedTrigger = this.updateTriggerIdReferences(trigger as WorkflowTrigger);
      triggerConfigs.set(trigger.id, updatedTrigger);
    }
    
    return triggerConfigs;
  }
  
  /**
   * 更新触发器配置中的ID引用
   * @param trigger 触发器
   * @returns 更新后的触发器
   */
  private updateTriggerIdReferences(trigger: WorkflowTrigger): WorkflowTrigger {
    // TODO: 实现触发器配置的ID更新逻辑
    // 目前触发器配置中可能不包含节点ID引用，直接返回
    return trigger;
  }
  
  /**
   * 构建子图关系
   * @param workflow 工作流定义
   * @param workflowRegistry 工作流注册器
   * @returns 子图关系数组
   */
  private async buildSubgraphRelationships(
    workflow: WorkflowDefinition,
    workflowRegistry: any
  ): Promise<SubgraphRelationship[]> {
    const relationships: SubgraphRelationship[] = [];
    
    const subgraphNodes = workflow.nodes.filter(n => n.type === NodeTypeEnum.SUBGRAPH);
    
    for (const subgraphNode of subgraphNodes) {
      const subgraphConfig = subgraphNode.config as any;
      if (!subgraphConfig || !subgraphConfig.subgraphId) {
        continue;
      }
      
      const subworkflowId = subgraphConfig.subgraphId;
      const namespace = this.idMapping.subgraphNamespaces.get(subworkflowId);
      
      if (namespace) {
        relationships.push({
          parentWorkflowId: workflow.id,
          subgraphNodeId: subgraphNode.id,
          childWorkflowId: subworkflowId,
          namespace
        });
      }
    }
    
    return relationships;
  }
  
  /**
   * 分配节点索引ID
   * @param originalId 原始节点ID
   * @returns 索引ID
   */
  private allocateNodeId(originalId: ID): number {
    const index = this.nodeIndexCounter++;
    this.idMapping.nodeIds.set(originalId, index);
    this.idMapping.reverseNodeIds.set(index, originalId);
    return index;
  }
  
  /**
   * 分配边索引ID
   * @param originalId 原始边ID
   * @returns 索引ID
   */
  private allocateEdgeId(originalId: ID): number {
    const index = this.edgeIndexCounter++;
    this.idMapping.edgeIds.set(originalId, index);
    this.idMapping.reverseEdgeIds.set(index, originalId);
    return index;
  }
  
  /**
   * 生成子图命名空间
   * @param subworkflowId 子工作流ID
   * @param subgraphNodeId SUBGRAPH节点ID
   * @returns 命名空间
   */
  private generateSubgraphNamespace(subworkflowId: ID, subgraphNodeId: ID): string {
    return generateSubgraphNamespace(subworkflowId, subgraphNodeId);
  }
}