/**
 * WorkflowRegistry - 工作流注册器
 * 负责工作流定义的注册、查询、更新、移除和缓存管理
 * 集成图构建和预处理功能
 *
 * 本模块导出全局单例实例，不导出类定义
 */

import type {
  WorkflowDefinition,
  WorkflowMetadata,
  ProcessedWorkflowDefinition,
  SubgraphMergeLog,
  PreprocessValidationResult,
  WorkflowRelationship,
  WorkflowHierarchy
} from '../../types/workflow';
import type { WorkflowReference, WorkflowReferenceInfo, WorkflowReferenceRelation, WorkflowReferenceType } from '../../types/workflow-reference';
import type { GraphBuildOptions } from '../../types';
import type { ID } from '../../types/common';
import type { Node } from '../../types/node';
import { WorkflowValidator } from '../validation/workflow-validator';
import { GraphBuilder } from '../graph/graph-builder';
import { GraphValidator } from '../validation/graph-validator';
import { GraphData } from '../entities/graph-data';
import { ValidationError } from '../../types/errors';
import { now } from '../../utils';
import { nodeTemplateRegistry } from './node-template-registry';
import { triggerTemplateRegistry } from './trigger-template-registry';
import type { TriggerReference } from '../../types/trigger-template';
import type { WorkflowTrigger } from '../../types/trigger';
import { graphRegistry } from './graph-registry';
import { checkWorkflowReferences } from '../execution/utils/workflow-reference-checker';

/**
 * 工作流摘要信息
 */
export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  metadata?: WorkflowMetadata;
}

/**
 * 工作流版本信息
 */
export interface WorkflowVersion {
  version: string;
  createdAt: number;
  workflow: WorkflowDefinition;
}

/**
 * WorkflowRegistry - 工作流注册器
 */
class WorkflowRegistry {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private processedWorkflows: Map<string, ProcessedWorkflowDefinition> = new Map();
  private graphCache: Map<string, GraphData> = new Map();
  private workflowRelationships: Map<string, WorkflowRelationship> = new Map();
  private activeWorkflows: Set<string> = new Set();
  private referenceRelations: Map<string, WorkflowReferenceRelation[]> = new Map();
  private validator: WorkflowValidator;
  private maxRecursionDepth: number;

  constructor(options: {
    maxRecursionDepth?: number;
  } = {}) {
    this.validator = new WorkflowValidator();
    this.maxRecursionDepth = options.maxRecursionDepth ?? 10;
  }

  /**
   * 添加活跃工作流
   * @param workflowId 工作流ID
   */
  addActiveWorkflow(workflowId: string): void {
    this.activeWorkflows.add(workflowId);
  }

  /**
   * 移除活跃工作流
   * @param workflowId 工作流ID
   */
  removeActiveWorkflow(workflowId: string): void {
    this.activeWorkflows.delete(workflowId);
  }

  /**
   * 检查工作流是否活跃
   * @param workflowId 工作流ID
   * @returns 是否活跃
   */
  isWorkflowActive(workflowId: string): boolean {
    return this.activeWorkflows.has(workflowId);
  }

  /**
   * 添加工作流引用关系
   * @param relation 引用关系
   */
  addReferenceRelation(relation: WorkflowReferenceRelation): void {
    const key = relation.targetWorkflowId;
    if (!this.referenceRelations.has(key)) {
      this.referenceRelations.set(key, []);
    }
    this.referenceRelations.get(key)!.push(relation);
  }

  /**
   * 移除工作流引用关系
   * @param sourceWorkflowId 源工作流ID
   * @param targetWorkflowId 目标工作流ID
   * @param referenceType 引用类型
   */
  removeReferenceRelation(
    sourceWorkflowId: string,
    targetWorkflowId: string,
    referenceType: WorkflowReferenceType
  ): void {
    const relations = this.referenceRelations.get(targetWorkflowId);
    if (relations) {
      const filtered = relations.filter((rel: WorkflowReferenceRelation) =>
        !(rel.sourceWorkflowId === sourceWorkflowId &&
          rel.referenceType === referenceType)
      );
      if (filtered.length === 0) {
        this.referenceRelations.delete(targetWorkflowId);
      } else {
        this.referenceRelations.set(targetWorkflowId, filtered);
      }
    }
  }

  /**
   * 检查工作流是否有引用
   * @param workflowId 工作流ID
   * @returns 是否有引用
   */
  hasReferences(workflowId: string): boolean {
    // 检查 referenceRelations 中的引用（如 trigger、thread 等）
    const hasReferenceRelations = this.referenceRelations.has(workflowId) &&
      this.referenceRelations.get(workflowId)!.length > 0;
    
    // 检查 workflowRelationships 中的父子关系
    const hasParentRelationship = this.workflowRelationships.has(workflowId) &&
      this.workflowRelationships.get(workflowId)?.parentWorkflowId !== undefined;
    
    return hasReferenceRelations || hasParentRelationship;
  }

  /**
   * 获取工作流引用关系
   * @param workflowId 工作流ID
   * @returns 引用关系列表
   */
  getReferenceRelations(workflowId: string): WorkflowReferenceRelation[] {
    return this.referenceRelations.get(workflowId) || [];
  }

  /**
   * 清空工作流引用关系
   * @param workflowId 工作流ID
   */
  clearReferenceRelations(workflowId: string): void {
    this.referenceRelations.delete(workflowId);
  }

  /**
   * 格式化引用详情信息
   * @param references 引用列表
   * @returns 格式化的引用详情字符串
   */
  private formatReferenceDetails(references: WorkflowReference[]): string {
    if (references.length === 0) {
      return '  No references found.';
    }

    return references.map((ref, index) => {
      const details = Object.entries(ref.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      return `  ${index + 1}. [${ref.type}] ${ref.sourceName} (${ref.sourceId}) - ${ref.isRuntimeReference ? 'Runtime' : 'Static'}${details ? ` - ${details}` : ''}`;
    }).join('\n');
  }

  /**
   * 获取所有活跃工作流ID
   * @returns 活跃工作流ID数组
   */
  getActiveWorkflows(): string[] {
    return Array.from(this.activeWorkflows);
  }

  /**
   * 注册工作流定义
   * @param workflow 工作流定义
   * @throws ValidationError 如果工作流定义无效或ID已存在
   */
  register(workflow: WorkflowDefinition): void {
    // 验证工作流定义
    const validationResult = this.validate(workflow);
    if (!validationResult.valid) {
      throw new ValidationError(
        `Workflow validation failed: ${validationResult.errors.join(', ')}`,
        'workflow'
      );
    }

    // 检查ID是否已存在
    if (this.workflows.has(workflow.id)) {
      throw new ValidationError(
        `Workflow with ID '${workflow.id}' already exists`,
        'workflow.id'
      );
    }

    // 保存工作流定义
    this.workflows.set(workflow.id, workflow);

    // 进行图构建和验证（预处理总是启用的）
    this.preprocessWorkflow(workflow);

  }

  /**
   * 批量注册工作流定义
   * @param workflows 工作流定义数组
   * @throws ValidationError 如果任何工作流定义无效或ID已存在
   */
  registerBatch(workflows: WorkflowDefinition[]): void {
    for (const workflow of workflows) {
      this.register(workflow);
    }
  }

  /**
   * 获取工作流定义
   * @param workflowId 工作流ID
   * @returns 工作流定义，如果不存在则返回undefined
   */
  get(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }


  /**
   * 按名称获取工作流定义
   * @param name 工作流名称
   * @returns 工作流定义，如果不存在则返回undefined
   */
  getByName(name: string): WorkflowDefinition | undefined {
    for (const workflow of this.workflows.values()) {
      if (workflow.name === name) {
        return workflow;
      }
    }
    return undefined;
  }

  /**
   * 按标签获取工作流定义列表
   * @param tags 标签数组
   * @returns 匹配的工作流定义列表
   */
  getByTags(tags: string[]): WorkflowDefinition[] {
    const result: WorkflowDefinition[] = [];
    for (const workflow of this.workflows.values()) {
      const workflowTags = workflow.metadata?.tags || [];
      if (tags.every(tag => workflowTags.includes(tag))) {
        result.push(workflow);
      }
    }
    return result;
  }

  /**
   * 按分类获取工作流定义列表
   * @param category 分类
   * @returns 匹配的工作流定义列表
   */
  getByCategory(category: string): WorkflowDefinition[] {
    const result: WorkflowDefinition[] = [];
    for (const workflow of this.workflows.values()) {
      if (workflow.metadata?.category === category) {
        result.push(workflow);
      }
    }
    return result;
  }

  /**
   * 按作者获取工作流定义列表
   * @param author 作者
   * @returns 匹配的工作流定义列表
   */
  getByAuthor(author: string): WorkflowDefinition[] {
    const result: WorkflowDefinition[] = [];
    for (const workflow of this.workflows.values()) {
      if (workflow.metadata?.author === author) {
        result.push(workflow);
      }
    }
    return result;
  }

  /**
   * 列出所有工作流的摘要信息
   * @returns 工作流摘要信息列表
   */
  list(): WorkflowSummary[] {
    const summaries: WorkflowSummary[] = [];
    for (const workflow of this.workflows.values()) {
      summaries.push({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        metadata: workflow.metadata
      });
    }
    return summaries;
  }

  /**
   * 搜索工作流
   * @param keyword 搜索关键词
   * @returns 匹配的工作流摘要信息列表
   */
  search(keyword: string): WorkflowSummary[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.list().filter(summary =>
      summary.name.toLowerCase().includes(lowerKeyword) ||
      summary.description?.toLowerCase().includes(lowerKeyword) ||
      summary.id.toLowerCase().includes(lowerKeyword)
    );
  }


  /**
   * 检查工作流引用
   * @param workflowId 工作流ID
   * @returns 引用信息
   */
  checkWorkflowReferences(workflowId: string): WorkflowReferenceInfo {
    // 从全局作用域获取threadRegistry，避免参数传递
    const { threadRegistry } = require('./thread-registry');
    return checkWorkflowReferences(this, threadRegistry, workflowId);
  }

  /**
   * 移除工作流定义
   * @param workflowId 工作流ID
   * @param options 删除选项
   */
  unregister(
    workflowId: string,
    options?: {
      force?: boolean;
      checkReferences?: boolean;
    }
  ): void {
    const shouldCheck = options?.checkReferences !== false;

    if (shouldCheck) {
      // 快速检查：使用引用关系映射进行快速过滤
      if (this.hasReferences(workflowId)) {
        // 详细检查：仅当有引用时才执行完整检查
        const referenceInfo = this.checkWorkflowReferences(workflowId);
        if (referenceInfo.hasReferences && !options?.force) {
          // 构建详细的引用信息
          const referenceDetails = this.formatReferenceDetails(referenceInfo.references);
          throw new ValidationError(
            `Cannot delete workflow '${workflowId}': it is referenced by ${referenceInfo.references.length} other components.\n\n` +
            `References:\n${referenceDetails}\n\n` +
            `Use force=true to override, or check references first.`,
            'workflow.delete.referenced',
            { references: referenceInfo.references }
          );
        }

        if (referenceInfo.stats.runtimeReferences > 0 && options?.force) {
          // 构建详细的运行时引用信息
          const runtimeReferences = referenceInfo.references.filter(ref => ref.isRuntimeReference);
          const runtimeDetails = this.formatReferenceDetails(runtimeReferences);
          console.warn(`Force deleting workflow '${workflowId}' with ${referenceInfo.stats.runtimeReferences} active references:\n${runtimeDetails}`);
        }
      }
      // 如果没有引用关系，直接跳过详细检查，提高性能
    }

    this.workflows.delete(workflowId);
    this.clearPreprocessCache(workflowId);

    // 从全局GraphRegistry中移除对应的图
    graphRegistry.delete(workflowId);
  }

  /**
   * 批量移除工作流定义
   * @param workflowIds 工作流ID数组
   */
  unregisterBatch(workflowIds: string[]): void {
    for (const workflowId of workflowIds) {
      this.unregister(workflowId);
    }
  }

  /**
   * 清空所有工作流定义
   */
  clear(): void {
    this.workflows.clear();
    this.processedWorkflows.clear();
    this.graphCache.clear();
    this.workflowRelationships.clear();
  }

  /**
   * 验证工作流定义
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  validate(workflow: WorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 基本验证
    if (!workflow.id) {
      errors.push('Workflow ID is required');
    }

    if (!workflow.name) {
      errors.push('Workflow name is required');
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    if (!workflow.edges) {
      errors.push('Workflow edges are required');
    }

    // 使用 WorkflowValidator 进行详细验证
    const validatorResult = this.validator.validate(workflow);
    if (validatorResult.isErr()) {
      errors.push(...validatorResult.error.map(e => e.message));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 批量验证工作流定义
   * @param workflows 工作流定义数组
   * @returns 验证结果数组
   */
  validateBatch(workflows: WorkflowDefinition[]): { valid: boolean; errors: string[] }[] {
    return workflows.map(workflow => this.validate(workflow));
  }

  /**
   * 检查工作流是否存在
   * @param workflowId 工作流ID
   * @returns 是否存在
   */
  has(workflowId: string): boolean {
    return this.workflows.has(workflowId);
  }

  /**
   * 获取已注册工作流的数量
   * @returns 工作流数量
   */
  size(): number {
    return this.workflows.size;
  }


  /**
   * 导出工作流定义为JSON字符串
   * @param workflowId 工作流ID
   * @returns JSON字符串
   * @throws ValidationError 如果工作流不存在
   */
  export(workflowId: string): string {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new ValidationError(
        `Workflow with ID '${workflowId}' does not exist`,
        'workflowId'
      );
    }

    return JSON.stringify(workflow, null, 2);
  }

  /**
   * 从JSON字符串导入工作流定义
   * @param json JSON字符串
   * @returns 导入的工作流ID
   * @throws ValidationError 如果JSON无效或工作流定义无效
   */
  import(json: string): string {
    try {
      const workflow = JSON.parse(json) as WorkflowDefinition;
      this.register(workflow);
      return workflow.id;
    } catch (error) {
      throw new ValidationError(
        `Failed to import workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'json'
      );
    }
  }

  /**
   * 获取处理后的工作流定义
   * @param workflowId 工作流ID
   * @returns 处理后的工作流定义，如果不存在则返回undefined
   */
  getProcessed(workflowId: string): ProcessedWorkflowDefinition | undefined {
    return this.processedWorkflows.get(workflowId);
  }

  /**
   * 预处理工作流并存储
   * @param workflow 原始工作流定义
   * @returns 处理后的工作流定义
   * @throws ValidationError 如果预处理失败
   */
  async preprocessAndStore(workflow: WorkflowDefinition): Promise<ProcessedWorkflowDefinition> {
    // 检查是否已经预处理过
    const existing = this.processedWorkflows.get(workflow.id);
    if (existing) {
      return existing;
    }

    // 调用私有预处理方法
    this.preprocessWorkflow(workflow);

    // 返回预处理结果
    const processed = this.processedWorkflows.get(workflow.id);
    if (!processed) {
      throw new ValidationError(
        `Failed to preprocess workflow with ID '${workflow.id}'`,
        'workflow.id'
      );
    }

    return processed;
  }

  /**
   * 获取工作流的图结构
   * @param workflowId 工作流ID
   * @returns 图结构（GraphData类型），如果不存在则返回undefined
   */
  getGraph(workflowId: string): GraphData | undefined {
    return this.graphCache.get(workflowId);
  }

  /**
   * 预处理工作流
   * 构建图结构、验证图、分析图
   * @param workflow 工作流定义
   * @throws ValidationError 如果预处理失败
   */
  private preprocessWorkflow(workflow: WorkflowDefinition): void {
    // 展开节点引用
    const expandedNodes = this.expandNodeReferences(workflow.nodes);

    // 展开触发器引用
    const expandedTriggers = this.expandTriggerReferences(workflow.triggers || []);

    // 创建展开后的工作流定义
    const expandedWorkflow: WorkflowDefinition = {
      ...workflow,
      nodes: expandedNodes,
      triggers: expandedTriggers
    };

    // 构建图
    const buildOptions: GraphBuildOptions = {
      validate: true,
      computeTopologicalOrder: true,
      detectCycles: true,
      analyzeReachability: true,
      maxRecursionDepth: this.maxRecursionDepth,
      workflowRegistry: this,
    };

    const buildResult = GraphBuilder.buildAndValidate(expandedWorkflow, buildOptions);
    if (!buildResult.isValid) {
      throw new ValidationError(
        `Graph build failed: ${buildResult.errors.join(', ')}`,
        'workflow.graph'
      );
    }

    // 处理子工作流
    const subgraphMergeLogs: SubgraphMergeLog[] = [];
    let hasSubgraphs = false;
    const subworkflowIds = new Set<ID>();

    const subgraphResult = GraphBuilder.processSubgraphs(
      buildResult.graph,
      this,
      this.maxRecursionDepth
    );

    if (!subgraphResult.success) {
      throw new ValidationError(
        `Subgraph processing failed: ${subgraphResult.errors.join(', ')}`,
        'workflow.subgraphs'
      );
    }

    // 记录子工作流信息
    if (subgraphResult.subworkflowIds.length > 0) {
      hasSubgraphs = true;
      subgraphResult.subworkflowIds.forEach(id => subworkflowIds.add(id));

      // 为每个子工作流创建合并日志
      for (const subworkflowId of subgraphResult.subworkflowIds) {
        const subworkflow = this.get(subworkflowId);
        if (subworkflow) {
          // 查找对应的SUBGRAPH节点
          const subgraphNode = workflow.nodes.find(
            node => node.type === 'SUBGRAPH' &&
              (node.config as any)?.subgraphId === subworkflowId
          );

          if (subgraphNode) {
            const mergeLog: SubgraphMergeLog = {
              subworkflowId,
              subworkflowName: subworkflow.name,
              subgraphNodeId: subgraphNode.id,
              nodeIdMapping: subgraphResult.nodeIdMapping,
              edgeIdMapping: subgraphResult.edgeIdMapping,
              inputMapping: new Map(Object.entries((subgraphNode.config as any)?.inputMapping || {})),
              outputMapping: new Map(Object.entries((subgraphNode.config as any)?.outputMapping || {})),
              mergedAt: now(),
            };
            subgraphMergeLogs.push(mergeLog);
          }
        }
      }
    }

    // 验证图
    const validationResult = GraphValidator.validate(buildResult.graph);
    if (validationResult.isErr()) {
      const errors = validationResult.error.map(e => e.message).join(', ');
      throw new ValidationError(
        `Graph validation failed: ${errors}`,
        'workflow.graph'
      );
    }

    // 分析图
    const graphAnalysis = GraphValidator.analyze(buildResult.graph);

    // 创建预处理验证结果
    const preprocessValidation: PreprocessValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validatedAt: now(),
    };

    // 创建处理后的工作流定义
    const processedWorkflow: ProcessedWorkflowDefinition = {
      ...expandedWorkflow,
      triggers: expandedTriggers, // 显式使用已展开的触发器
      graph: buildResult.graph,
      graphAnalysis,
      validationResult: preprocessValidation,
      subgraphMergeLogs,
      processedAt: now(),
      hasSubgraphs,
      subworkflowIds,
      topologicalOrder: graphAnalysis.topologicalSort.sortedNodes,
    };

    // 注册到全局 GraphRegistry
    graphRegistry.register(workflow.id, buildResult.graph);

    // 缓存处理后的工作流和图
    this.processedWorkflows.set(workflow.id, processedWorkflow);
    this.graphCache.set(workflow.id, buildResult.graph);
  }

  /**
   * 展开节点引用
   * 将工作流中的节点引用展开为完整的节点定义
   * @param nodes 节点数组（可能包含节点引用）
   * @returns 展开后的节点数组
   * @throws ValidationError 如果节点模板不存在
   */
  private expandNodeReferences(nodes: Node[]): Node[] {
    const expandedNodes: Node[] = [];

    for (const node of nodes) {
      // 检查是否为节点引用
      if (this.isNodeReference(node)) {
        const config = node.config as any;
        const templateName = config.templateName;
        const nodeId = config.nodeId;
        const nodeName = config.nodeName;
        const configOverride = config.configOverride;

        // 获取节点模板
        const template = nodeTemplateRegistry.get(templateName);
        if (!template) {
          throw new ValidationError(
            `Node template not found: ${templateName}`,
            `node.${node.id}.config.templateName`
          );
        }

        // 合并配置覆盖
        const mergedConfig = configOverride
          ? { ...template.config, ...configOverride }
          : template.config;

        // 创建展开后的节点
        const expandedNode: Node = {
          id: nodeId,
          type: template.type,
          name: nodeName || template.name,
          config: mergedConfig,
          description: template.description,
          metadata: template.metadata,
          outgoingEdgeIds: node.outgoingEdgeIds,
          incomingEdgeIds: node.incomingEdgeIds
        };

        expandedNodes.push(expandedNode);
      } else {
        // 普通节点，直接添加
        expandedNodes.push(node);
      }
    }

    return expandedNodes;
  }

  /**
   * 检查节点是否为节点引用
   * @param node 节点定义
   * @returns 是否为节点引用
   */
  private isNodeReference(node: Node): boolean {
    // 通过检查config中是否包含templateName字段来判断
    const config = node.config as any;
    return config && typeof config === 'object' && 'templateName' in config;
  }

  /**
   * 展开触发器引用
   * 将工作流中的触发器引用展开为完整的触发器定义
   * @param triggers 触发器数组（可能包含触发器引用）
   * @returns 展开后的触发器数组
   * @throws ValidationError 如果触发器模板不存在
   */
  private expandTriggerReferences(triggers: (WorkflowTrigger | TriggerReference)[]): WorkflowTrigger[] {
    const expandedTriggers: WorkflowTrigger[] = [];

    for (const trigger of triggers) {
      // 检查是否为触发器引用
      if (this.isTriggerReference(trigger)) {
        const reference = trigger as TriggerReference;

        // 使用 TriggerTemplateRegistry 的转换方法
        const workflowTrigger = triggerTemplateRegistry.convertToWorkflowTrigger(
          reference.templateName,
          reference.triggerId,
          reference.triggerName,
          reference.configOverride
        );

        expandedTriggers.push(workflowTrigger);
      } else {
        // 普通触发器，直接添加
        expandedTriggers.push(trigger as WorkflowTrigger);
      }
    }

    return expandedTriggers;
  }

  /**
   * 检查触发器是否为触发器引用
   * @param trigger 触发器定义
   * @returns 是否为触发器引用
   */
  private isTriggerReference(trigger: WorkflowTrigger | TriggerReference): boolean {
    // 通过检查是否包含 templateName 字段来判断
    const triggerObj = trigger as any;
    return triggerObj && typeof triggerObj === 'object' && 'templateName' in triggerObj;
  }

  /**
   * 清除工作流的预处理缓存
   * @param workflowId 工作流ID
   */
  private clearPreprocessCache(workflowId: string): void {
    this.processedWorkflows.delete(workflowId);
    this.graphCache.delete(workflowId);
  }

  /**
   * 注册子图关系
   * @param parentWorkflowId 父工作流ID
   * @param subgraphNodeId SUBGRAPH节点ID
   * @param childWorkflowId 子工作流ID
   */
  registerSubgraphRelationship(
    parentWorkflowId: string,
    subgraphNodeId: string,
    childWorkflowId: string
  ): void {
    // 1. 更新父工作流关系
    const parentRelationship = this.workflowRelationships.get(parentWorkflowId);
    if (parentRelationship) {
      parentRelationship.childWorkflowIds.add(childWorkflowId);
      parentRelationship.referencedBy.set(subgraphNodeId, childWorkflowId);
    } else {
      this.workflowRelationships.set(parentWorkflowId, {
        workflowId: parentWorkflowId,
        childWorkflowIds: new Set([childWorkflowId]),
        referencedBy: new Map([[subgraphNodeId, childWorkflowId]]),
        depth: 0
      });
    }

    // 2. 更新子工作流关系
    const childRelationship = this.workflowRelationships.get(childWorkflowId);
    if (!childRelationship) {
      this.workflowRelationships.set(childWorkflowId, {
        workflowId: childWorkflowId,
        parentWorkflowId,
        childWorkflowIds: new Set(),
        referencedBy: new Map(),
        depth: this.calculateDepth(parentWorkflowId) + 1
      });
    }

  }

  /**
   * 获取工作流层次结构
   * @param workflowId 工作流ID
   * @returns 层次结构信息
   */
  getWorkflowHierarchy(workflowId: string): WorkflowHierarchy {
    const ancestors: string[] = [];
    const descendants: string[] = [];

    // 构建祖先链
    let currentId = workflowId;
    while (currentId) {
      const relationship = this.workflowRelationships.get(currentId);
      if (relationship?.parentWorkflowId) {
        ancestors.unshift(relationship.parentWorkflowId);
        currentId = relationship.parentWorkflowId;
      } else {
        break;
      }
    }

    // 构建后代链（递归）
    this.collectDescendants(workflowId, descendants);

    const relationship = this.workflowRelationships.get(workflowId);
    return {
      ancestors,
      descendants,
      depth: relationship?.depth || 0,
      rootWorkflowId: ancestors[0] || workflowId
    };
  }

  /**
   * 获取父工作流
   * @param workflowId 工作流ID
   * @returns 父工作流ID或null
   */
  getParentWorkflow(workflowId: string): string | null {
    const relationship = this.workflowRelationships.get(workflowId);
    return relationship?.parentWorkflowId || null;
  }

  /**
   * 获取子工作流
   * @param workflowId 工作流ID
   * @returns 子工作流ID数组
   */
  getChildWorkflows(workflowId: string): string[] {
    const relationship = this.workflowRelationships.get(workflowId);
    return relationship ? Array.from(relationship.childWorkflowIds) : [];
  }

  /**
   * 收集所有后代工作流
   */
  private collectDescendants(workflowId: string, result: string[]): void {
    const relationship = this.workflowRelationships.get(workflowId);
    if (!relationship) return;

    for (const childId of relationship.childWorkflowIds) {
      if (!result.includes(childId)) {
        result.push(childId);
        this.collectDescendants(childId, result);
      }
    }
  }

  /**
   * 计算工作流深度
   */
  private calculateDepth(workflowId: string): number {
    const relationship = this.workflowRelationships.get(workflowId);
    return relationship?.depth || 0;
  }
}

/**
 * 全局工作流注册器单例实例
 */
export const workflowRegistry = new WorkflowRegistry({
  maxRecursionDepth: 10
});

/**
 * 导出WorkflowRegistry类供测试使用
 * 注意：生产代码应使用单例 workflowRegistry，此类仅供测试使用
 */
export { WorkflowRegistry };