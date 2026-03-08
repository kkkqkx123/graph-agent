/**
 * WorkflowRegistry - 工作流注册器
 * 负责工作流定义的注册、查询和管理
 * 包括工作流关系管理和引用管理
 *
 * 预处理后的图由 GraphRegistry 管理
 *
 * 本模块只导出类定义，不导出实例
 * 实例通过 SingletonRegistry 统一管理
 */

import type {
  WorkflowDefinition,
  WorkflowMetadata,
  WorkflowRelationship,
  WorkflowHierarchy,
  WorkflowSummary
} from '@modular-agent/types';
import type { WorkflowReferenceInfo, WorkflowReferenceRelation, WorkflowReferenceType } from '@modular-agent/types';
import type { ThreadRegistry } from './thread-registry.js';
import { ExecutionError, ConfigurationValidationError, WorkflowNotFoundError } from '@modular-agent/types';
import type { GraphRegistry } from './graph-registry.js';
import { processWorkflow, type ProcessOptions } from '../graph/workflow-processor.js';
import { getContainer } from '../di/container-config.js';
import * as Identifiers from '../di/service-identifiers.js';
import { getErrorMessage } from '@modular-agent/common-utils';
import { checkWorkflowReferences } from '../../graph/execution/utils/workflow-reference-checker.js';
import { createContextualLogger } from '../../utils/contextual-logger.js';

const logger = createContextualLogger();

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
export class WorkflowRegistry {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private workflowRelationships: Map<string, WorkflowRelationship> = new Map();
  private activeWorkflows: Set<string> = new Set();
  private referenceRelations: Map<string, WorkflowReferenceRelation[]> = new Map();
  private maxRecursionDepth: number;
  private threadRegistry: ThreadRegistry | undefined;

  constructor(
    options: {
      maxRecursionDepth?: number;
    } = {},
    threadRegistry?: ThreadRegistry
  ) {
    this.maxRecursionDepth = options.maxRecursionDepth ?? 10;
    this.threadRegistry = threadRegistry;
  }

  /**
   * 获取ThreadRegistry实例（延迟获取）
   * @returns ThreadRegistry实例或undefined
   */
  private getThreadRegistry(): ThreadRegistry | undefined {
    if (!this.threadRegistry) {
      const container = getContainer();
      this.threadRegistry = container.get(Identifiers.ThreadRegistry);
    }
    return this.threadRegistry;
  }

  /**
   * 获取GraphRegistry实例（延迟获取）
   * @returns GraphRegistry实例
   */
  private getGraphRegistry(): GraphRegistry {
    const container = getContainer();
    return container.get(Identifiers.GraphRegistry);
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
    const hasParentRelationship = this.getParentWorkflow(workflowId) !== null;

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
   * 清理指定工作流的所有引用关系
   * @param workflowId 工作流ID
   */
  cleanupWorkflowReferences(workflowId: string): void {
    // 清空该工作流的引用关系
    this.clearReferenceRelations(workflowId);

    // 从其他工作流的引用关系中移除对该工作流的引用
    for (const [targetId, relations] of this.referenceRelations.entries()) {
      const filteredRelations = relations.filter(
        relation => relation.sourceWorkflowId !== workflowId
      );
      if (filteredRelations.length === 0) {
        this.referenceRelations.delete(targetId);
      } else {
        this.referenceRelations.set(targetId, filteredRelations);
      }
    }
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
      throw new ConfigurationValidationError(
        `Workflow validation failed: ${validationResult.errors.join(', ')}`,
        {
          configType: 'workflow',
          configPath: 'workflow'
        }
      );
    }

    // 检查ID是否已存在
    if (this.workflows.has(workflow.id)) {
      throw new ConfigurationValidationError(
        `Workflow with ID '${workflow.id}' already exists`,
        {
          configType: 'workflow',
          configPath: 'workflow.id'
        }
      );
    }

    // 保存工作流定义
    this.workflows.set(workflow.id, workflow);

    // 预处理工作流（异步，不阻塞注册）
    this.preprocessWorkflow(workflow).catch(error => {
      // 抛出验证错误
      throw new ConfigurationValidationError(
        `Workflow preprocessing failed: ${getErrorMessage(error)}`,
        {
          configType: 'workflow',
          configPath: 'workflow.definition',
          context: {
            workflowId: workflow.id,
            operation: 'workflow_preprocessing'
          }
        }
      );
    });
  }

  /**
   * 预处理工作流
   * @param workflow 工作流定义
   * @returns 预处理后的图
   */
  private async preprocessWorkflow(workflow: WorkflowDefinition): Promise<void> {
    const graphRegistry = this.getGraphRegistry();

    // 检查是否已经预处理过
    if (graphRegistry.has(workflow.id)) {
      return;
    }

    // 调用 processWorkflow 进行预处理
    const processOptions: ProcessOptions = {
      workflowRegistry: this,
      maxRecursionDepth: this.maxRecursionDepth,
      validate: true,
      computeTopologicalOrder: true,
      detectCycles: true,
      analyzeReachability: true,
    };

    const processedGraph = await processWorkflow(workflow, processOptions);

    // 缓存处理结果
    graphRegistry.register(processedGraph);
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
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        tags: workflow.metadata?.tags,
        category: workflow.metadata?.category
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
    const threadRegistry = this.getThreadRegistry();
    if (!threadRegistry) {
      throw new ExecutionError(
        'ThreadRegistry not available',
        undefined,
        workflowId,
        { operation: 'check_workflow_references' }
      );
    }
    return checkWorkflowReferences(this, threadRegistry, workflowId);
  }

  /**
   * 格式化引用详情信息
   * @param references 引用列表
   * @returns 格式化的字符串
   */
  private formatReferenceDetails(references: import('@modular-agent/types').WorkflowReference[]): string {
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
   * 检查是否可以安全删除工作流
   * @param workflowId 工作流ID
   * @param options 删除选项
   * @returns 是否可以删除及详细信息
   */
  canSafelyDelete(workflowId: string, options?: { force?: boolean }): { canDelete: boolean; details: string } {
    const referenceInfo = this.checkWorkflowReferences(workflowId);

    if (!referenceInfo.hasReferences) {
      return { canDelete: true, details: 'No references found' };
    }

    if (options?.force) {
      if (referenceInfo.stats.runtimeReferences > 0) {
        const runtimeReferences = referenceInfo.references.filter(ref => ref.isRuntimeReference);
        const runtimeDetails = this.formatReferenceDetails(runtimeReferences);
        return {
          canDelete: true,
          details: `Force deleting workflow with ${referenceInfo.stats.runtimeReferences} active references:\n${runtimeDetails}`
        };
      }
      return { canDelete: true, details: 'Force delete enabled' };
    }

    const referenceDetails = this.formatReferenceDetails(referenceInfo.references);
    return {
      canDelete: false,
      details: `Cannot delete workflow: it is referenced by ${referenceInfo.references.length} other components.\n\nReferences:\n${referenceDetails}\n\nUse force=true to override, or check references first.`
    };
  }

  /**
   * 获取所有引用目标工作流的源工作流ID
   * @param targetWorkflowId 目标工作流ID
   * @returns 源工作流ID数组
   */
  getReferencingWorkflows(targetWorkflowId: string): string[] {
    const referencingWorkflows = new Set<string>();

    // 从引用关系中查找
    const relations = this.getReferenceRelations(targetWorkflowId);
    relations.forEach(relation => {
      referencingWorkflows.add(relation.sourceWorkflowId);
    });

    // 从父子关系中查找
    const parentId = this.getParentWorkflow(targetWorkflowId);
    if (parentId) {
      referencingWorkflows.add(parentId);
    }

    return Array.from(referencingWorkflows);
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
      const checkResult = this.canSafelyDelete(workflowId, options);
      if (!checkResult.canDelete) {
        throw new ConfigurationValidationError(
          checkResult.details,
          {
            configType: 'workflow',
            configPath: 'workflow.delete.referenced'
          }
        );
      }

      if (options?.force && checkResult.details.includes('active references')) {
        // 记录警告但不中断执行
        logger.warn(
          'Deleting workflow with active references',
          {
            workflowId,
            operation: 'workflow_delete'
          }
        );
      }
    }

    this.workflows.delete(workflowId);

    // 清理引用关系
    this.cleanupWorkflowReferences(workflowId);
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
    this.workflowRelationships.clear();
    this.activeWorkflows.clear();
    this.referenceRelations.clear();
  }

  /**
   * 验证工作流定义（基本验证）
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
      throw new WorkflowNotFoundError(
        `Workflow with ID '${workflowId}' does not exist`,
        workflowId
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
      throw new ConfigurationValidationError(
        `Failed to import workflow: ${getErrorMessage(error)}`,
        {
          configType: 'workflow',
          configPath: 'json'
        }
      );
    }
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