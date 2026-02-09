/**
 * WorkflowRegistryAPI - 工作流管理API
 * 继承GenericResourceAPI，提供统一的CRUD操作
 */

import {
  validateRequiredFields,
  validateStringLength,
  validateArray,
  validatePattern
} from '../../validation/validation-strategy';

import { GenericResourceAPI } from '../generic-resource-api';
import { workflowRegistry, type WorkflowRegistry } from '../../../core/services/workflow-registry';
import type { WorkflowDefinition } from '../../../types/workflow';
import type { WorkflowFilter, WorkflowSummary } from '../../types/registry-types';

/**
 * WorkflowRegistryAPI - 工作流管理API
 */
export class WorkflowRegistryAPI extends GenericResourceAPI<WorkflowDefinition, string, WorkflowFilter> {
  private registry: WorkflowRegistry;

  constructor() {
    super();
    this.registry = workflowRegistry;
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 从注册表获取工作流
   */
  protected async getResource(id: string): Promise<WorkflowDefinition | null> {
    return this.registry.get(id) || null;
  }

  /**
   * 从注册表获取所有工作流
   */
  protected async getAllResources(): Promise<WorkflowDefinition[]> {
    const summaries = this.registry.list();
    const workflows: WorkflowDefinition[] = [];
    for (const summary of summaries) {
      const workflow = this.registry.get(summary.id);
      if (workflow) {
        workflows.push(workflow);
      }
    }
    return workflows;
  }

  /**
   * 创建工作流
   */
  protected async createResource(workflow: WorkflowDefinition): Promise<void> {
    this.registry.register(workflow);
  }

  /**
   * 更新工作流
   */
  protected async updateResource(id: string, updates: Partial<WorkflowDefinition>): Promise<void> {
    const existing = this.registry.get(id);
    if (!existing) {
      throw new Error(`Workflow not found: ${id}`);
    }
    const updated = { ...existing, ...updates };
    this.registry.update(updated);
  }

  /**
   * 删除工作流
   */
  protected async deleteResource(id: string): Promise<void> {
    this.registry.unregister(id);
  }

  /**
   * 应用过滤条件
   */
  protected applyFilter(workflows: WorkflowDefinition[], filter: WorkflowFilter): WorkflowDefinition[] {
    return workflows.filter(workflow => {
      if (filter.id && !workflow.id.includes(filter.id)) {
        return false;
      }
      if (filter.name && !workflow.name.includes(filter.name)) {
        return false;
      }
      if (filter.version && workflow.version !== filter.version) {
        return false;
      }
      if (filter.tags && workflow.metadata?.tags) {
        if (!filter.tags.every(tag => workflow.metadata?.tags?.includes(tag))) {
          return false;
        }
      }
      if (filter.category && workflow.metadata?.category !== filter.category) {
        return false;
      }
      if (filter.author && workflow.metadata?.author !== filter.author) {
        return false;
      }
      return true;
    });
  }

  /**
   * 清空所有工作流
   */
  protected override async clearResources(): Promise<void> {
    this.registry.clear();
  }

  /**
   * 验证工作流
   * @param workflow 工作流定义
   * @param context 验证上下文
   * @returns 验证结果
   */
  protected override async validateResource(
    workflow: WorkflowDefinition,
    context?: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 使用简化验证工具验证必需字段
    const requiredResult = validateRequiredFields(workflow, ['id', 'name', 'version'], 'workflow');
    if (requiredResult.isErr()) {
      errors.push(...requiredResult.unwrapOrElse(err => err.map(error => error.message)));
    }

    // 验证节点数组
    const arrayResult = validateArray(workflow.nodes, '工作流节点', 1);
    if (arrayResult.isErr()) {
      errors.push(...arrayResult.unwrapOrElse(err => err.map(error => error.message)));
    }

    // 验证ID长度
    if (workflow.id) {
      const idResult = validateStringLength(workflow.id, '工作流ID', 1, 100);
      if (idResult.isErr()) {
        errors.push(...idResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    // 验证名称长度
    if (workflow.name) {
      const nameResult = validateStringLength(workflow.name, '工作流名称', 1, 200);
      if (nameResult.isErr()) {
        errors.push(...nameResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    // 验证版本格式（简单验证）
    if (workflow.version) {
      const versionPattern = /^[0-9]+\.[0-9]+\.[0-9]+$/;
      const versionResult = validatePattern(workflow.version, '工作流版本', versionPattern, '工作流版本格式不正确，应为x.y.z格式');
      if (versionResult.isErr()) {
        errors.push(...versionResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // 工作流特定方法
  // ============================================================================

  /**
   * 获取工作流摘要列表
   * @param filter 过滤条件
   * @returns 工作流摘要数组
   */
  async getWorkflowSummaries(filter?: WorkflowFilter): Promise<WorkflowSummary[]> {
    const summaries = this.registry.list();

    if (!filter) {
      return summaries;
    }

    // 应用过滤条件
    return summaries.filter(summary => {
      if (filter.id && !summary.id.includes(filter.id)) {
        return false;
      }
      if (filter.name && !summary.name.includes(filter.name)) {
        return false;
      }
      if (filter.version && summary.version !== filter.version) {
        return false;
      }
      if (filter.tags && summary.metadata?.tags) {
        if (!filter.tags.every(tag => summary.metadata?.tags?.includes(tag))) {
          return false;
        }
      }
      if (filter.category && summary.metadata?.category !== filter.category) {
        return false;
      }
      if (filter.author && summary.metadata?.author !== filter.author) {
        return false;
      }
      return true;
    });
  }

  /**
   * 按名称获取工作流
   * @param name 工作流名称
   * @returns 工作流定义，如果不存在则返回null
   */
  async getWorkflowByName(name: string): Promise<WorkflowDefinition | null> {
    const workflow = this.registry.getByName(name);
    if (workflow) {
      // 缓存更新逻辑（如果需要缓存，可以在这里实现）
    }
    return workflow || null;
  }

  /**
   * 按标签获取工作流列表
   * @param tags 标签数组
   * @returns 工作流定义数组
   */
  async getWorkflowsByTags(tags: string[]): Promise<WorkflowDefinition[]> {
    return this.registry.getByTags(tags);
  }

  /**
   * 按分类获取工作流列表
   * @param category 分类
   * @returns 工作流定义数组
   */
  async getWorkflowsByCategory(category: string): Promise<WorkflowDefinition[]> {
    return this.registry.getByCategory(category);
  }

  /**
   * 按作者获取工作流列表
   * @param author 作者
   * @returns 工作流定义数组
   */
  async getWorkflowsByAuthor(author: string): Promise<WorkflowDefinition[]> {
    return this.registry.getByAuthor(author);
  }

  /**
   * 搜索工作流
   * @param keyword 搜索关键词
   * @returns 工作流摘要数组
   */
  async searchWorkflows(keyword: string): Promise<WorkflowSummary[]> {
    return this.registry.search(keyword);
  }

  /**
   * 导出工作流
   * @param workflowId 工作流ID
   * @returns JSON字符串
   */
  async exportWorkflow(workflowId: string): Promise<string> {
    return this.registry.export(workflowId);
  }

  /**
   * 导入工作流
   * @param json JSON字符串
   * @returns 工作流ID
   */
  async importWorkflow(json: string): Promise<string> {
    const workflowId = this.registry.import(json);
    // 更新缓存
    const workflow = this.registry.get(workflowId);
    if (workflow) {
      // 缓存更新逻辑（如果需要缓存，可以在这里实现）
    }
    return workflowId;
  }

  /**
   * 获取工作流的所有版本
   * @param workflowId 工作流ID
   * @returns 版本信息数组
   */
  async getWorkflowVersions(workflowId: string): Promise<any[]> {
    return this.registry.getVersions(workflowId);
  }

  /**
   * 回滚到指定版本
   * @param workflowId 工作流ID
   * @param version 版本号
   */
  async rollbackWorkflow(workflowId: string, version: string): Promise<void> {
    this.registry.rollback(workflowId, version);
    // 更新缓存
    const workflow = this.registry.get(workflowId);
    if (workflow) {
      // 缓存更新逻辑（如果需要缓存，可以在这里实现）
    }
  }

  /**
   * 获取处理后的工作流定义
   * @param workflowId 工作流ID
   * @returns 处理后的工作流定义，如果不存在则返回null
   */
  async getProcessedWorkflow(workflowId: string): Promise<any | null> {
    const processed = this.registry.getProcessed(workflowId);
    return processed || null;
  }

  /**
   * 预处理并存储工作流
   * @param workflow 工作流定义
   * @returns 处理后的工作流定义
   */
  async preprocessAndStoreWorkflow(workflow: any): Promise<any> {
    const processed = await this.registry.preprocessAndStore(workflow);
    // 更新缓存
    // 缓存更新逻辑（如果需要缓存，可以在这里实现）
    return processed;
  }

  /**
   * 获取工作流图结构
   * @param workflowId 工作流ID
   * @returns 图结构，如果不存在则返回null
   */
  async getWorkflowGraph(workflowId: string): Promise<any | null> {
    const graph = this.registry.getGraph(workflowId);
    return graph || null;
  }

  /**
   * 注册子图关系
   * @param parentWorkflowId 父工作流ID
   * @param subgraphNodeId SUBGRAPH节点ID
   * @param childWorkflowId 子工作流ID
   */
  async registerSubgraphRelationship(
    parentWorkflowId: string,
    subgraphNodeId: string,
    childWorkflowId: string
  ): Promise<void> {
    this.registry.registerSubgraphRelationship(parentWorkflowId, subgraphNodeId, childWorkflowId);
  }

  /**
   * 获取工作流层次结构
   * @param workflowId 工作流ID
   * @returns 层次结构信息
   */
  async getWorkflowHierarchy(workflowId: string): Promise<any> {
    return this.registry.getWorkflowHierarchy(workflowId);
  }

  /**
   * 获取父工作流
   * @param workflowId 工作流ID
   * @returns 父工作流ID或null
   */
  async getParentWorkflow(workflowId: string): Promise<string | null> {
    return this.registry.getParentWorkflow(workflowId);
  }

  /**
   * 获取子工作流
   * @param workflowId 工作流ID
   * @returns 子工作流ID数组
   */
  async getChildWorkflows(workflowId: string): Promise<string[]> {
    return this.registry.getChildWorkflows(workflowId);
  }

  /**
   * 获取底层WorkflowRegistry实例
   * @returns WorkflowRegistry实例
   */
  getRegistry(): WorkflowRegistry {
    return this.registry;
  }
}