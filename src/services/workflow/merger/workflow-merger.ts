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
import { ID, ILogger, Timestamp } from '../../../domain/common';
import { SubWorkflowValidator, WorkflowStructureValidator } from '../validators';
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
    @inject('WorkflowStructureValidator') private readonly structureValidator: WorkflowStructureValidator,
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

    // 递归合并子工作流，并收集子工作流统计信息
    const mergedSubWorkflows: Array<{
      referenceId: string;
      workflowId: string;
      nodeCount: number;
      edgeCount: number;
    }> = [];
    const mergedWorkflow = await this.recursiveMerge(workflow, new Set<string>(), mergedSubWorkflows);

    // 验证合并后的工作流结构（仅针对业务工作流）
    // 注意：子工作流不需要 start/end 节点，只有合并后的业务工作流需要验证
    const structureResult = await this.structureValidator.validate(mergedWorkflow);
    
    if (!structureResult.isValid) {
      const error = new Error(
        `合并后的工作流结构验证失败: ${structureResult.errors.join('; ')}`
      );
      this.logger.error('合并后的工作流结构验证失败', error as Error, {
        workflowId: workflow.workflowId.toString(),
        errors: structureResult.errors,
      });
      throw error;
    }

    if (structureResult.warnings.length > 0) {
      this.logger.warn('合并后的工作流结构验证警告', {
        workflowId: workflow.workflowId.toString(),
        warnings: structureResult.warnings,
      });
    }

    // 更新统计信息
    result.mergedWorkflow = mergedWorkflow;
    result.mergedSubWorkflows = mergedSubWorkflows;
    result.statistics.mergedNodeCount = mergedWorkflow.getNodeCount();
    result.statistics.mergedEdgeCount = mergedWorkflow.getEdgeCount();
    result.statistics.subWorkflowCount = mergedSubWorkflows.length;

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
   * @param mergedSubWorkflows 已合并的子工作流列表（用于收集统计信息）
   * @returns 合并后的工作流
   */
  private async recursiveMerge(
    workflow: Workflow,
    processedWorkflowIds: Set<string>,
    mergedSubWorkflows: Array<{
      referenceId: string;
      workflowId: string;
      nodeCount: number;
      edgeCount: number;
    }> = []
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
      const mergedSubWorkflow = await this.recursiveMerge(subWorkflow, new Set(processedWorkflowIds), mergedSubWorkflows);

      // 记录子工作流统计信息
      mergedSubWorkflows.push({
        referenceId,
        workflowId: reference.workflowId.toString(),
        nodeCount: mergedSubWorkflow.getNodeCount(),
        edgeCount: mergedSubWorkflow.getEdgeCount(),
      });

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

      // 连接子工作流到父工作流（传入子工作流）
      this.connectSubWorkflowToParent(
        workflow,
        mergedSubWorkflow,
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

      // 创建新的节点对象，使用新的节点ID
      // 由于Node是不可变的，我们需要创建一个新的Node实例
      const newNode = this.cloneNodeWithNewId(node, NodeId.fromString(newNodeId));
      newNodes.set(newNodeId, newNode);
    }

    this.logger.debug('合并子工作流节点', {
      referenceId,
      nodeCount: mappings.length,
      sampleMapping: mappings[0] ? `${mappings[0].originalId} -> ${mappings[0].mergedId}` : 'none',
    });

    return mappings;
  }

  /**
   * 克隆节点并使用新的节点ID
   * @param node 原始节点
   * @param newNodeId 新的节点ID
   * @returns 新的节点实例
   */
  private cloneNodeWithNewId(node: Node, newNodeId: NodeId): Node {
    // 获取节点的属性
    const nodeProps = node.toProps();
    
    // 创建新的属性对象，使用新的节点ID
    const newProps = {
      ...nodeProps,
      id: newNodeId,
      updatedAt: Timestamp.now(),
      version: nodeProps.version.nextPatch(),
    };

    // 使用反射调用createNodeFromProps方法
    // 由于createNodeFromProps是protected方法，我们需要使用反射
    const newNode = (node as any).createNodeFromProps(newProps);

    this.logger.debug('克隆节点', {
      originalId: node.nodeId.toString(),
      newId: newNodeId.toString(),
      nodeType: node.type.toString(),
    });

    return newNode;
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
   * @param subWorkflow 子工作流
   * @param referenceId 引用ID
   * @param nodeIdMappings 节点ID映射
   * @param newEdges 新边映射
   */
  private connectSubWorkflowToParent(
    parentWorkflow: Workflow,
    subWorkflow: Workflow,
    referenceId: string,
    nodeIdMappings: NodeIdMapping[],
    newEdges: Map<string, EdgeValueObject>
  ): void {
    // 在子工作流中查找入口和出口节点
    const entryNode = this.findEntryNode(subWorkflow, referenceId);
    const exitNode = this.findExitNode(subWorkflow, referenceId);

    if (!entryNode || !exitNode) {
      throw new Error(
        `无法找到子工作流的入口或出口节点：${referenceId}。` +
        `入口节点：${entryNode ? entryNode.nodeId.toString() : '未找到'}，` +
        `出口节点：${exitNode ? exitNode.nodeId.toString() : '未找到'}`
      );
    }

    // 找到子工作流合并后的入口和出口节点
    const subWorkflowEntryMapping = nodeIdMappings.find((m) => m.originalId === entryNode.nodeId.toString());
    const subWorkflowExitMapping = nodeIdMappings.find((m) => m.originalId === exitNode.nodeId.toString());

    if (!subWorkflowEntryMapping || !subWorkflowExitMapping) {
      throw new Error(
        `无法找到子工作流入口或出口节点的映射：${referenceId}。` +
        `入口映射：${subWorkflowEntryMapping ? subWorkflowEntryMapping.mergedId : '未找到'}，` +
        `出口映射：${subWorkflowExitMapping ? subWorkflowExitMapping.mergedId : '未找到'}`
      );
    }

    this.logger.debug('连接子工作流到父工作流', {
      referenceId,
      entryNode: entryNode.nodeId.toString(),
      exitNode: exitNode.nodeId.toString(),
      entryMapping: subWorkflowEntryMapping.mergedId,
      exitMapping: subWorkflowExitMapping.mergedId,
    });

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
        this.logger.debug('创建输入边', {
          edgeId: newEdge.id.toString(),
          from: edge.fromNodeId.toString(),
          to: subWorkflowEntryMapping.mergedId,
        });
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
        this.logger.debug('创建输出边', {
          edgeId: newEdge.id.toString(),
          from: subWorkflowExitMapping.mergedId,
          to: edge.toNodeId.toString(),
        });
      }
    }
  }

  /**
   * 查找子工作流的入口节点
   * @param subWorkflow 子工作流
   * @param referenceId 引用ID（用于日志）
   * @returns 入口节点
   */
  private findEntryNode(subWorkflow: Workflow, referenceId: string): Node | null {
    const graph = subWorkflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 计算入度
    const nodeInDegrees = new Map<string, number>();
    nodes.forEach((node) => nodeInDegrees.set(node.nodeId.toString(), 0));
    graph.edges.forEach((edge) => {
      const targetId = edge.toNodeId.toString();
      nodeInDegrees.set(targetId, (nodeInDegrees.get(targetId) || 0) + 1);
    });

    // 找到入度为0的节点作为入口节点
    const entryNodes = nodes.filter((node) => nodeInDegrees.get(node.nodeId.toString()) === 0);

    if (entryNodes.length === 0) {
      this.logger.warn('子工作流没有入口节点', {
        referenceId,
        workflowId: subWorkflow.workflowId.toString(),
      });
      return null;
    }

    // 如果有多个入口节点，返回第一个
    const node = entryNodes[0];
    if (!node) {
      return null;
    }
    this.logger.debug('找到子工作流入口节点', {
      referenceId,
      nodeId: node.nodeId.toString(),
      inDegree: 0,
    });
    return node;
  }

  /**
   * 查找子工作流的出口节点
   * @param subWorkflow 子工作流
   * @param referenceId 引用ID（用于日志）
   * @returns 出口节点
   */
  private findExitNode(subWorkflow: Workflow, referenceId: string): Node | null {
    const graph = subWorkflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 计算出度
    const nodeOutDegrees = new Map<string, number>();
    nodes.forEach((node) => nodeOutDegrees.set(node.nodeId.toString(), 0));
    graph.edges.forEach((edge) => {
      const sourceId = edge.fromNodeId.toString();
      nodeOutDegrees.set(sourceId, (nodeOutDegrees.get(sourceId) || 0) + 1);
    });

    // 找到出度为0的节点作为出口节点
    const exitNodes = nodes.filter((node) => nodeOutDegrees.get(node.nodeId.toString()) === 0);

    if (exitNodes.length === 0) {
      this.logger.warn('子工作流没有出口节点', {
        referenceId,
        workflowId: subWorkflow.workflowId.toString(),
      });
      return null;
    }

    // 如果有多个出口节点，返回最后一个
    const node = exitNodes[exitNodes.length - 1];
    if (!node) {
      return null;
    }
    this.logger.debug('找到子工作流出口节点', {
      referenceId,
      nodeId: node.nodeId.toString(),
      outDegree: 0,
    });
    return node;
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