/**
 * WorkflowRegistry - 工作流注册器
 * 负责工作流定义的注册、查询和管理
 * 预处理逻辑委托给 processWorkflow 函数
 * 引用管理委托给 WorkflowReferenceManager
 * 
 * 同时管理基础工作流和预处理后的工作流
 *
 * 本模块导出全局单例实例，不导出类定义
 */

import type {
  WorkflowDefinition,
  WorkflowMetadata,
  WorkflowRelationship,
  WorkflowHierarchy,
  WorkflowSummary
} from '@modular-agent/types';
import { ProcessedWorkflowDefinition, WorkflowType } from '@modular-agent/types';
import type { WorkflowReferenceInfo, WorkflowReferenceRelation, WorkflowReferenceType } from '@modular-agent/types';
import { processWorkflow, type ProcessOptions } from '../graph/workflow-processor';
import { WorkflowReferenceManager } from '../execution/managers/workflow-reference-manager';
import { ValidationError, ExecutionError, ConfigurationValidationError, WorkflowNotFoundError } from '@modular-agent/types';

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
  private workflowRelationships: Map<string, WorkflowRelationship> = new Map();
  private activeWorkflows: Set<string> = new Set();
  private referenceManager: WorkflowReferenceManager;
  private maxRecursionDepth: number;

  constructor(options: {
    maxRecursionDepth?: number;
    threadRegistry?: any;
  } = {}) {
    this.maxRecursionDepth = options.maxRecursionDepth ?? 10;
    this.referenceManager = new WorkflowReferenceManager(this, options.threadRegistry);
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
    this.referenceManager.addReferenceRelation(relation);
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
    this.referenceManager.removeReferenceRelation(sourceWorkflowId, targetWorkflowId, referenceType);
  }

  /**
   * 检查工作流是否有引用
   * @param workflowId 工作流ID
   * @returns 是否有引用
   */
  hasReferences(workflowId: string): boolean {
    return this.referenceManager.hasReferences(workflowId);
  }

  /**
   * 获取工作流引用关系
   * @param workflowId 工作流ID
   * @returns 引用关系列表
   */
  getReferenceRelations(workflowId: string): WorkflowReferenceRelation[] {
    return this.referenceManager.getReferenceRelations(workflowId);
  }

  /**
   * 清空工作流引用关系
   * @param workflowId 工作流ID
   */
  clearReferenceRelations(workflowId: string): void {
    this.referenceManager.clearReferenceRelations(workflowId);
  }

  /**
   * 获取所有活跃工作流ID
   * @returns 活跃工作流ID数组
   */
  getActiveWorkflows(): string[] {
    return Array.from(this.activeWorkflows);
  }

  /**
   * 确保工作流已预处理（统一预处理入口）
   * @param workflowId 工作流ID
   * @returns 处理后的工作流定义
   * @throws ValidationError 如果工作流不存在或预处理失败
   */
  async ensureProcessed(workflowId: string): Promise<ProcessedWorkflowDefinition> {
    // 检查缓存
    let processed = this.getProcessed(workflowId);
    if (processed) return processed;

    // 获取原始定义
    const workflow = this.get(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(
        `Workflow with ID '${workflowId}' not found`,
        workflowId
      );
    }

    // 预处理（会递归处理所有子工作流）
    processed = await this.preprocessAndStore(workflow);

    return processed;
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

    // 仅预处理无外部依赖的工作流
    // STANDALONE和TRIGGERED_SUBWORKFLOW类型：立即预处理
    // DEPENDENT类型：延迟到Thread构建时预处理，以确保所有依赖都已注册
    if (workflow.type === WorkflowType.STANDALONE || workflow.type === WorkflowType.TRIGGERED_SUBWORKFLOW) {
      // 注意：这里不 await，因为 register 是同步方法
      // 预处理会在后台进行，但通常很快完成
      this.preprocessAndStore(workflow).catch(error => {
        // 抛出验证错误
        throw new ConfigurationValidationError(
          `Workflow preprocessing failed: ${error instanceof Error ? error.message : String(error)}`,
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
    return this.referenceManager.checkWorkflowReferences(workflowId);
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
      const checkResult = this.referenceManager.canSafelyDelete(workflowId, options);
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
        // 抛出执行错误，标记为警告级别
        throw new ExecutionError(
          'Deleting workflow with active references',
          undefined,
          workflowId,
          {
            workflowId,
            operation: 'workflow_delete',
            severity: 'warning'
          }
        );
      }
    }

    this.workflows.delete(workflowId);
    this.processedWorkflows.delete(workflowId);

    // 清理引用关系
    this.referenceManager.cleanupWorkflowReferences(workflowId);
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
    this.workflowRelationships.clear();
    this.activeWorkflows.clear();
    // 重新创建引用管理器，不传递 threadRegistry
    this.referenceManager = new WorkflowReferenceManager(this, null as any);
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
        `Failed to import workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          configType: 'workflow',
          configPath: 'json'
        }
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

    // 调用 processWorkflow 进行预处理
    const processOptions: ProcessOptions = {
      workflowRegistry: this,
      maxRecursionDepth: this.maxRecursionDepth,
      validate: true,
      computeTopologicalOrder: true,
      detectCycles: true,
      analyzeReachability: true,
    };

    const processed = await processWorkflow(workflow, processOptions);

    // 缓存处理结果
    this.processedWorkflows.set(workflow.id, processed);

    return processed;
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