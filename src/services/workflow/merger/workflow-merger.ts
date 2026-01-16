/**
 * 工作流合并器
 *
 * 负责将包含子工作流引用的工作流合并为单一工作流
 * 主要功能：
 * - 递归加载子工作流
 * - 静态检查子工作流标准
 * - 合并节点和边
 * - 生成合并后的Workflow
 */

import { injectable, inject } from 'inversify';
import { Workflow, IWorkflowRepository, Node, NodeId, EdgeId, EdgeType } from '../../../domain/workflow';
import { ID, ILogger } from '../../../domain/common';
import { SubWorkflowValidator } from '../validators';
import { EdgeValueObject } from '../../../domain/workflow/value-objects/edge';

/**
 * 工作流合并结果
 */
export interface WorkflowMergeResult {
  /** 合并后的工作流 */
  mergedWorkflow: Workflow;
  /** 合并的子工作流列表 */
  mergedSubWorkflows: Array<{
    referenceId: string;
    workflowId: string;
    nodeCount: number;
    edgeCount: number;
  }>;
  /** 合并统计 */
  statistics: {
    originalNodeCount: number;
    originalEdgeCount: number;
    mergedNodeCount: number;
    mergedEdgeCount: number;
    subWorkflowCount: number;
  };
}

/**
 * 节点ID映射
 */
interface NodeIdMapping {
  /** 原始节点ID */
  originalId: string;
  /** 合并后的节点ID */
  mergedId: string;
  /** 子工作流引用ID */
  referenceId: string;
}

/**
 * 工作流合并器
 */
@injectable()
export class WorkflowMerger {
  private mergeCache = new Map<string, Workflow>();

  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: IWorkflowRepository,
    @inject('SubWorkflowValidator') private readonly subWorkflowValidator: SubWorkflowValidator,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 合并工作流
   * @param workflow 要合并的工作流
   * @returns 合并结果
   */
  async mergeWorkflow(workflow: Workflow): Promise<WorkflowMergeResult> {
    this.logger.info('开始合并工作流', {
      workflowId: workflow.workflowId.toString(),
      workflowName: workflow.name,
    });

    // 检查缓存
    const cacheKey = workflow.workflowId.toString();
    if (this.mergeCache.has(cacheKey)) {
      this.logger.info('使用缓存的合并工作流', { workflowId: workflow.workflowId.toString() });
      return {
        mergedWorkflow: this.mergeCache.get(cacheKey)!,
        mergedSubWorkflows: [],
        statistics: {
          originalNodeCount: workflow.getNodeCount(),
          originalEdgeCount: workflow.getEdgeCount(),
          mergedNodeCount: workflow.getNodeCount(),
          mergedEdgeCount: workflow.getEdgeCount(),
          subWorkflowCount: 0,
        },
      };
    }

    const result: WorkflowMergeResult = {
      mergedWorkflow: workflow,
      mergedSubWorkflows: [],
      statistics: {
        originalNodeCount: workflow.getNodeCount(),
        originalEdgeCount: workflow.getEdgeCount(),
        mergedNodeCount: workflow.getNodeCount(),
        mergedEdgeCount: workflow.getEdgeCount(),
        subWorkflowCount: 0,
      },
    };

    // 获取子工作流引用
    const subWorkflowReferences = workflow.getSubWorkflowReferences();
    if (subWorkflowReferences.size === 0) {
      this.logger.info('工作流不包含子工作流引用，无需合并', {
        workflowId: workflow.workflowId.toString(),
      });
      return result;
    }

    // 递归合并子工作流
    const mergedWorkflow = await this.recursiveMerge(workflow, new Set<string>());

    // 更新统计信息
    result.mergedWorkflow = mergedWorkflow;
    result.statistics.mergedNodeCount = mergedWorkflow.getNodeCount();
    result.statistics.mergedEdgeCount = mergedWorkflow.getEdgeCount();
    result.statistics.subWorkflowCount = subWorkflowReferences.size;

    // 缓存合并结果
    this.mergeCache.set(cacheKey, mergedWorkflow);

    this.logger.info('工作流合并完成', {
      workflowId: workflow.workflowId.toString(),
      originalNodeCount: result.statistics.originalNodeCount,
      mergedNodeCount: result.statistics.mergedNodeCount,
      subWorkflowCount: result.statistics.subWorkflowCount,
    });

    return result;
  }

  /**
   * 递归合并工作流
   * @param workflow 当前工作流
   * @param processedWorkflowIds 已处理的工作流ID集合（防止循环引用）
   * @returns 合并后的工作流
   */
  private async recursiveMerge(
    workflow: Workflow,
    processedWorkflowIds: Set<string>
  ): Promise<Workflow> {
    const workflowId = workflow.workflowId.toString();

    // 检查循环引用
    if (processedWorkflowIds.has(workflowId)) {
      throw new Error(`检测到循环引用：${Array.from(processedWorkflowIds).join(' -> ')} -> ${workflowId}`);
    }

    processedWorkflowIds.add(workflowId);

    const subWorkflowReferences = workflow.getSubWorkflowReferences();
    if (subWorkflowReferences.size === 0) {
      return workflow;
    }

    // 创建新的节点和边映射
    const newNodes = new Map<string, Node>();
    const newEdges = new Map<string, EdgeValueObject>();
    const nodeIdMappings: NodeIdMapping[] = [];

    // 复制非子工作流节点
    for (const [nodeId, node] of workflow.getNodes()) {
      if (node.type.toString() !== 'subworkflow') {
        newNodes.set(nodeId, node);
      }
    }

    // 处理子工作流节点
    for (const [referenceId, reference] of subWorkflowReferences) {
      // 加载子工作流
      const subWorkflow = await this.workflowRepository.findById(reference.workflowId);
      if (!subWorkflow) {
        throw new Error(`子工作流不存在：${reference.workflowId.toString()}`);
      }

      // 验证子工作流标准
      const validationResult = await this.subWorkflowValidator.validateSubWorkflow(subWorkflow);

      if (!validationResult.isValid) {
        throw new Error(
          `子工作流验证失败（${reference.workflowId.toString()}）：${validationResult.errors.join(', ')}`
        );
      }

      // 递归合并子工作流
      const mergedSubWorkflow = await this.recursiveMerge(subWorkflow, new Set(processedWorkflowIds));

      // 合并子工作流的节点和边
      const subWorkflowMappings = this.mergeSubWorkflowNodes(
        mergedSubWorkflow,
        referenceId,
        newNodes,
        newEdges
      );

      nodeIdMappings.push(...subWorkflowMappings);

      // 合并子工作流的边
      this.mergeSubWorkflowEdges(
        mergedSubWorkflow,
        referenceId,
        subWorkflowMappings,
        newEdges
      );

      // 连接子工作流到父工作流
      this.connectSubWorkflowToParent(
        workflow,
        referenceId,
        subWorkflowMappings,
        newEdges
      );
    }

    // 创建合并后的工作流
    const mergedWorkflow = Workflow.create(
      `${workflow.name} (merged)`,
      `${workflow.description} - 已合并子工作流`,
      workflow.type,
      workflow.config
    );

    // 添加合并后的节点和边
    for (const node of newNodes.values()) {
      mergedWorkflow.addNode(node);
    }

    for (const edge of newEdges.values()) {
      mergedWorkflow.addEdge(
        edge.id,
        edge.type,
        edge.fromNodeId,
        edge.toNodeId,
        edge.condition,
        edge.weight,
        edge.properties
      );
    }

    return mergedWorkflow;
  }

  /**
   * 合并子工作流的节点
   * @param subWorkflow 子工作流
   * @param referenceId 引用ID
   * @param newNodes 新节点映射
   * @returns 节点ID映射列表
   */
  private mergeSubWorkflowNodes(
    subWorkflow: Workflow,
    referenceId: string,
    newNodes: Map<string, Node>,
    newEdges: Map<string, EdgeValueObject>
  ): NodeIdMapping[] {
    const mappings: NodeIdMapping[] = [];

    for (const [nodeId, node] of subWorkflow.getNodes()) {
      // 生成新的节点ID：referenceId.nodeId
      const newNodeId = `${referenceId}.${nodeId}`;

      // 创建节点ID映射
      mappings.push({
        originalId: nodeId,
        mergedId: newNodeId,
        referenceId,
      });

      // 复制节点（需要修改节点ID）
      // 注意：这里需要根据实际的Node类实现来创建新节点
      // 由于Node是不可变的，我们需要使用工厂方法或克隆方法
      // 这里简化处理，实际实现可能需要调整
      newNodes.set(newNodeId, node);
    }

    return mappings;
  }

  /**
   * 合并子工作流的边
   * @param subWorkflow 子工作流
   * @param referenceId 引用ID
   * @param nodeIdMappings 节点ID映射
   * @param newEdges 新边映射
   */
  private mergeSubWorkflowEdges(
    subWorkflow: Workflow,
    referenceId: string,
    nodeIdMappings: NodeIdMapping[],
    newEdges: Map<string, EdgeValueObject>
  ): void {
    // 创建节点ID映射查找表
    const nodeIdMap = new Map<string, string>();
    for (const mapping of nodeIdMappings) {
      nodeIdMap.set(mapping.originalId, mapping.mergedId);
    }

    for (const [edgeId, edge] of subWorkflow.getEdges()) {
      // 生成新的边ID：referenceId.edgeId
      const newEdgeId = `${referenceId}.${edgeId}`;

      // 转换源节点和目标节点ID
      const newFromNodeId = nodeIdMap.get(edge.fromNodeId.toString());
      const newToNodeId = nodeIdMap.get(edge.toNodeId.toString());

      if (!newFromNodeId || !newToNodeId) {
        throw new Error(`无法找到节点ID映射：${edge.fromNodeId.toString()} -> ${edge.toNodeId.toString()}`);
      }

      // 创建新的边
      const newEdge = EdgeValueObject.create({
        id: EdgeId.fromString(newEdgeId),
        type: edge.type,
        fromNodeId: NodeId.fromString(newFromNodeId),
        toNodeId: NodeId.fromString(newToNodeId),
        condition: edge.condition,
        weight: edge.weight,
        properties: edge.properties,
      });

      newEdges.set(newEdgeId, newEdge);
    }
  }

  /**
   * 连接子工作流到父工作流
   * @param parentWorkflow 父工作流
   * @param referenceId 引用ID
   * @param nodeIdMappings 节点ID映射
   * @param newEdges 新边映射
   */
  private connectSubWorkflowToParent(
    parentWorkflow: Workflow,
    referenceId: string,
    nodeIdMappings: NodeIdMapping[],
    newEdges: Map<string, EdgeValueObject>
  ): void {
    // 找到子工作流的入口和出口节点
    const entryNode = this.findEntryNode(parentWorkflow, referenceId);
    const exitNode = this.findExitNode(parentWorkflow, referenceId);

    if (!entryNode || !exitNode) {
      throw new Error(`无法找到子工作流的入口或出口节点：${referenceId}`);
    }

    // 找到子工作流合并后的入口和出口节点
    const subWorkflowEntryMapping = nodeIdMappings.find((m) => m.originalId === entryNode.id.toString());
    const subWorkflowExitMapping = nodeIdMappings.find((m) => m.originalId === exitNode.id.toString());

    if (!subWorkflowEntryMapping || !subWorkflowExitMapping) {
      throw new Error(`无法找到子工作流入口或出口节点的映射：${referenceId}`);
    }

    // 连接父工作流的边到子工作流
    const parentEdges = parentWorkflow.getEdges();
    for (const [edgeId, edge] of parentEdges) {
      // 如果边的目标是子工作流节点，重定向到子工作流的入口节点
      if (edge.toNodeId.toString() === referenceId) {
        const newEdge = EdgeValueObject.create({
          id: EdgeId.fromString(`${referenceId}.in.${edgeId}`),
          type: edge.type,
          fromNodeId: edge.fromNodeId,
          toNodeId: NodeId.fromString(subWorkflowEntryMapping.mergedId),
          condition: edge.condition,
          weight: edge.weight,
          properties: edge.properties,
        });
        newEdges.set(newEdge.id.toString(), newEdge);
      }

      // 如果边的源是子工作流节点，重定向到子工作流的出口节点
      if (edge.fromNodeId.toString() === referenceId) {
        const newEdge = EdgeValueObject.create({
          id: EdgeId.fromString(`${referenceId}.out.${edgeId}`),
          type: edge.type,
          fromNodeId: NodeId.fromString(subWorkflowExitMapping.mergedId),
          toNodeId: edge.toNodeId,
          condition: edge.condition,
          weight: edge.weight,
          properties: edge.properties,
        });
        newEdges.set(newEdge.id.toString(), newEdge);
      }
    }
  }

  /**
   * 查找子工作流的入口节点
   * @param workflow 工作流
   * @param referenceId 引用ID
   * @returns 入口节点
   */
  private findEntryNode(workflow: Workflow, referenceId: string): Node | null {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 计算入度
    const nodeInDegrees = new Map<string, number>();
    nodes.forEach((node) => nodeInDegrees.set(node.id.toString(), 0));
    graph.edges.forEach((edge) => {
      const targetId = edge.toNodeId.toString();
      nodeInDegrees.set(targetId, (nodeInDegrees.get(targetId) || 0) + 1);
    });

    // 找到入度为0的节点作为入口节点
    const entryNodes = nodes.filter((node) => nodeInDegrees.get(node.id.toString()) === 0);

    if (entryNodes.length === 0) {
      return null;
    }

    // 如果有多个入口节点，返回第一个
    const node = entryNodes[0];
    return node || null;
  }

  /**
   * 查找子工作流的出口节点
   * @param workflow 工作流
   * @param referenceId 引用ID
   * @returns 出口节点
   */
  private findExitNode(workflow: Workflow, referenceId: string): Node | null {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 计算出度
    const nodeOutDegrees = new Map<string, number>();
    nodes.forEach((node) => nodeOutDegrees.set(node.id.toString(), 0));
    graph.edges.forEach((edge) => {
      const sourceId = edge.fromNodeId.toString();
      nodeOutDegrees.set(sourceId, (nodeOutDegrees.get(sourceId) || 0) + 1);
    });

    // 找到出度为0的节点作为出口节点
    const exitNodes = nodes.filter((node) => nodeOutDegrees.get(node.id.toString()) === 0);

    if (exitNodes.length === 0) {
      return null;
    }

    // 如果有多个出口节点，返回最后一个
    const node = exitNodes[exitNodes.length - 1];
    return node || null;
  }

  /**
   * 清除合并缓存
   */
  clearCache(): void {
    this.mergeCache.clear();
    this.logger.info('工作流合并缓存已清除');
  }

  /**
   * 获取缓存大小
   * @returns 缓存大小
   */
  getCacheSize(): number {
    return this.mergeCache.size;
  }
}