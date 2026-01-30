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
  WorkflowConfig,
  ProcessedWorkflowDefinition,
  SubgraphMergeLog,
  PreprocessValidationResult,
  WorkflowRelationship,
  WorkflowHierarchy
} from '../../types/workflow';
import type { GraphBuildOptions } from '../../types';
import type { ID } from '../../types/common';
import { WorkflowValidator } from '../validation/workflow-validator';
import { GraphBuilder } from '../graph/graph-builder';
import { GraphValidator } from '../validation/graph-validator';
import { GraphData } from '../entities/graph-data';
import { ValidationError } from '../../types/errors';
import { now } from '../../utils';

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
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * WorkflowRegistry - 工作流注册器
 */
class WorkflowRegistry {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private versions: Map<string, WorkflowVersion[]> = new Map();
  private processedWorkflows: Map<string, ProcessedWorkflowDefinition> = new Map();
  private graphCache: Map<string, GraphData> = new Map();
  private workflowRelationships: Map<string, WorkflowRelationship> = new Map();
  private validator: WorkflowValidator;
  private enableVersioning: boolean;
  private maxVersions: number;
  private enablePreprocessing: boolean;
  private maxRecursionDepth: number;

  constructor(options: {
    enableVersioning?: boolean;
    maxVersions?: number;
    enablePreprocessing?: boolean;
    maxRecursionDepth?: number;
  } = {}) {
    this.validator = new WorkflowValidator();
    this.enableVersioning = options.enableVersioning ?? true;
    this.maxVersions = options.maxVersions ?? 10;
    this.enablePreprocessing = options.enablePreprocessing ?? true;
    this.maxRecursionDepth = options.maxRecursionDepth ?? 10;
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

    // 如果启用预处理，进行图构建和验证
    if (this.enablePreprocessing) {
      this.preprocessWorkflow(workflow);
    }

    // 如果启用版本管理，保存初始版本
    if (this.enableVersioning) {
      this.saveVersion(workflow);
    }
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
   * 获取特定版本的工作流定义
   * @param workflowId 工作流ID
   * @param version 版本号
   * @returns 工作流定义，如果不存在则返回undefined
   */
  getVersion(workflowId: string, version: string): WorkflowDefinition | undefined {
    if (!this.enableVersioning) {
      return this.get(workflowId);
    }

    const versions = this.versions.get(workflowId);
    if (!versions) {
      return undefined;
    }

    const versionInfo = versions.find(v => v.version === version);
    return versionInfo?.workflow;
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
   * 更新工作流定义
   * @param workflow 工作流定义
   * @throws ValidationError 如果工作流定义无效或不存在
   */
  update(workflow: WorkflowDefinition): void {
    // 验证工作流定义
    const validationResult = this.validate(workflow);
    if (!validationResult.valid) {
      throw new ValidationError(
        `Workflow validation failed: ${validationResult.errors.join(', ')}`,
        'workflow'
      );
    }

    // 检查工作流是否存在
    if (!this.workflows.has(workflow.id)) {
      throw new ValidationError(
        `Workflow with ID '${workflow.id}' does not exist`,
        'workflow.id'
      );
    }

    // 如果启用版本管理，保存旧版本
    if (this.enableVersioning) {
      const oldWorkflow = this.workflows.get(workflow.id);
      if (oldWorkflow) {
        this.saveVersion(oldWorkflow);
      }
    }

    // 更新工作流定义
    this.workflows.set(workflow.id, workflow);

    // 清除预处理缓存
    if (this.enablePreprocessing) {
      this.clearPreprocessCache(workflow.id);
      // 重新预处理
      this.preprocessWorkflow(workflow);
    }
  }

  /**
   * 更新工作流元数据
   * @param workflowId 工作流ID
   * @param metadata 元数据
   * @throws ValidationError 如果工作流不存在
   */
  updateMetadata(workflowId: string, metadata: Partial<WorkflowMetadata>): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new ValidationError(
        `Workflow with ID '${workflowId}' does not exist`,
        'workflowId'
      );
    }

    // 如果启用版本管理，保存旧版本
    if (this.enableVersioning) {
      this.saveVersion(workflow);
    }

    // 更新元数据
    workflow.metadata = {
      ...workflow.metadata,
      ...metadata
    };
    workflow.updatedAt = now();
  }

  /**
   * 更新工作流配置
   * @param workflowId 工作流ID
   * @param config 配置
   * @throws ValidationError 如果工作流不存在
   */
  updateConfig(workflowId: string, config: WorkflowConfig): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new ValidationError(
        `Workflow with ID '${workflowId}' does not exist`,
        'workflowId'
      );
    }

    // 如果启用版本管理，保存旧版本
    if (this.enableVersioning) {
      this.saveVersion(workflow);
    }

    // 更新配置
    workflow.config = config;
    workflow.updatedAt = now();
  }

  /**
   * 移除工作流定义
   * @param workflowId 工作流ID
   */
  unregister(workflowId: string): void {
    this.workflows.delete(workflowId);
    this.versions.delete(workflowId);
    this.clearPreprocessCache(workflowId);
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
    this.versions.clear();
    this.processedWorkflows.clear();
    this.graphCache.clear();
    this.workflowRelationships.clear();
  }

  /**
   * 获取工作流的所有版本
   * @param workflowId 工作流ID
   * @returns 版本信息列表
   */
  getVersions(workflowId: string): WorkflowVersion[] {
    if (!this.enableVersioning) {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        return [];
      }
      return [{
        version: workflow.version,
        createdAt: workflow.createdAt,
        workflow
      }];
    }

    return this.versions.get(workflowId) || [];
  }

  /**
   * 回滚到指定版本
   * @param workflowId 工作流ID
   * @param version 版本号
   * @throws ValidationError 如果工作流或版本不存在
   */
  rollback(workflowId: string, version: string): void {
    if (!this.enableVersioning) {
      throw new ValidationError(
        'Version management is not enabled',
        'versioning'
      );
    }

    const versionInfo = this.getVersion(workflowId, version);
    if (!versionInfo) {
      throw new ValidationError(
        `Version '${version}' of workflow '${workflowId}' does not exist`,
        'version'
      );
    }

    // 保存当前版本
    const currentWorkflow = this.workflows.get(workflowId);
    if (currentWorkflow) {
      this.saveVersion(currentWorkflow);
    }

    // 恢复到指定版本
    this.workflows.set(workflowId, versionInfo);
  }

  /**
   * 验证工作流定义
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  validate(workflow: WorkflowDefinition): ValidationResult {
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
    if (!validatorResult.valid) {
      errors.push(...validatorResult.errors.map(e => e.message));
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
  validateBatch(workflows: WorkflowDefinition[]): ValidationResult[] {
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
   * 保存工作流版本
   * @param workflow 工作流定义
   */
  private saveVersion(workflow: WorkflowDefinition): void {
    if (!this.enableVersioning) {
      return;
    }

    let versions = this.versions.get(workflow.id);
    if (!versions) {
      versions = [];
      this.versions.set(workflow.id, versions);
    }

    // 检查版本是否已存在
    const existingVersion = versions.find(v => v.version === workflow.version);
    if (existingVersion) {
      return;
    }

    // 添加新版本
    versions.push({
      version: workflow.version,
      createdAt: workflow.createdAt,
      workflow: { ...workflow }
    });

    // 按创建时间排序
    versions.sort((a, b) => a.createdAt - b.createdAt);

    // 限制版本数量
    if (versions.length > this.maxVersions) {
      versions.splice(0, versions.length - this.maxVersions);
    }
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
    // 构建图
    const buildOptions: GraphBuildOptions = {
      validate: true,
      computeTopologicalOrder: true,
      detectCycles: true,
      analyzeReachability: true,
      maxRecursionDepth: this.maxRecursionDepth,
      workflowRegistry: this,
    };

    const buildResult = GraphBuilder.buildAndValidate(workflow, buildOptions);
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
    if (!validationResult.valid) {
      const errors = validationResult.errors.map(e => e.message).join(', ');
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
      ...workflow,
      graph: buildResult.graph,
      graphAnalysis,
      validationResult: preprocessValidation,
      subgraphMergeLogs,
      processedAt: now(),
      hasSubgraphs,
      subworkflowIds,
      topologicalOrder: graphAnalysis.topologicalSort.sortedNodes,
    };

    // 缓存处理后的工作流和图
    this.processedWorkflows.set(workflow.id, processedWorkflow);
    this.graphCache.set(workflow.id, buildResult.graph);
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
  enablePreprocessing: true,
  maxRecursionDepth: 10
});

/**
 * 导出WorkflowRegistry类型供类型注解使用
 */
export type { WorkflowRegistry };