/**
 * ID映射构建器
 * 负责生成ID映射和更新节点/触发器配置中的ID引用
 */

import type {
  WorkflowDefinition,
  ID,
  IdMapping,
  SubgraphRelationship,
  WorkflowTrigger,
} from '@modular-agent/types';
import { GraphData } from '../entities/graph-data.js';
import { updateIdReferences } from './utils/node-config-updaters.js';
import { generateSubgraphNamespace } from '../../utils/index.js';

/**
 * ID映射构建器类
 * 负责生成ID映射和更新配置中的ID引用
 */
export class IdMappingBuilder {
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
   * 构建ID映射和更新配置
   * @param graph 已构建的图数据
   * @param workflow 工作流定义
   * @param workflowRegistry 工作流注册器
   * @returns ID映射和更新后的配置
   */
  async build(
    graph: GraphData,
    workflow: WorkflowDefinition,
    workflowRegistry: any
  ): Promise<{
    idMapping: IdMapping;
    nodeConfigs: Map<ID, any>;
    triggerConfigs: Map<ID, any>;
    subgraphRelationships: SubgraphRelationship[];
  }> {
    // 步骤1：为图中的节点和边生成ID映射
    this.generateIdMapping(graph);

    // 步骤2：更新节点配置
    const nodeConfigs = await this.updateNodeConfigs(workflow);

    // 步骤3：更新触发器配置
    const triggerConfigs = await this.updateTriggerConfigs(workflow);

    // 步骤4：构建子图关系
    const subgraphRelationships = await this.buildSubgraphRelationships(workflow, workflowRegistry);

    return {
      idMapping: this.idMapping,
      nodeConfigs,
      triggerConfigs,
      subgraphRelationships
    };
  }

  /**
   * 为图中的节点和边生成ID映射
   * @param graph 图数据
   */
  private generateIdMapping(graph: GraphData): void {
    // 为节点生成索引ID映射
    for (const node of graph.nodes.values()) {
      const originalId = node.originalNode?.id || node.id;
      if (!this.idMapping.nodeIds.has(originalId)) {
        this.allocateNodeId(originalId);
      }
    }

    // 为边生成索引ID映射
    for (const edge of graph.edges.values()) {
      const originalId = edge.originalEdge?.id || edge.id;
      if (!this.idMapping.edgeIds.has(originalId)) {
        this.allocateEdgeId(originalId);
      }
    }
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

      // 使用更新器更新配置
      const updatedNode = updateIdReferences(node, this.idMapping);
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

    const subgraphNodes = workflow.nodes.filter(n => n.type === 'SUBGRAPH');

    for (const subgraphNode of subgraphNodes) {
      const subgraphConfig = subgraphNode.config as any;
      if (!subgraphConfig || !subgraphConfig.subgraphId) {
        continue;
      }

      const subworkflowId = subgraphConfig.subgraphId;
      const namespace = this.idMapping.subgraphNamespaces.get(subworkflowId);

      if (!namespace) {
        // 生成子图命名空间
        const generatedNamespace = this.generateSubgraphNamespace(subworkflowId, subgraphNode.id);
        this.idMapping.subgraphNamespaces.set(subworkflowId, generatedNamespace);
      }

      const finalNamespace = this.idMapping.subgraphNamespaces.get(subworkflowId);

      if (finalNamespace) {
        relationships.push({
          parentWorkflowId: workflow.id,
          subgraphNodeId: subgraphNode.id,
          childWorkflowId: subworkflowId,
          namespace: finalNamespace
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