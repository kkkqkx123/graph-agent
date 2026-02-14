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
import type { WorkflowDefinition, WorkflowFilter, WorkflowSummary } from '@modular-agent/types';
import type { APIDependencies } from '../../core/api-dependencies';

/**
 * WorkflowRegistryAPI - 工作流管理API
 */
export class WorkflowRegistryAPI extends GenericResourceAPI<WorkflowDefinition, string, WorkflowFilter> {
  private dependencies: APIDependencies;

  constructor(dependencies: APIDependencies) {
    super();
    this.dependencies = dependencies;
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 从注册表获取工作流
   */
  protected async getResource(id: string): Promise<WorkflowDefinition | null> {
    return this.dependencies.getWorkflowRegistry().get(id) || null;
  }

  /**
   * 从注册表获取所有工作流
   */
  protected async getAllResources(): Promise<WorkflowDefinition[]> {
    const summaries = this.dependencies.getWorkflowRegistry().list();
    const workflows: WorkflowDefinition[] = [];
    for (const summary of summaries) {
      const workflow = this.dependencies.getWorkflowRegistry().get(summary.id);
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
    this.dependencies.getWorkflowRegistry().register(workflow);
  }


  /**
   * 删除工作流
   */
  protected async deleteResource(id: string): Promise<void> {
    this.dependencies.getWorkflowRegistry().unregister(id);
  }

  /**
   * 更新工作流 - 创建新版本实例
   * 基于不可变原则，通过创建新工作流实例实现版本更新
   */
  protected async updateResource(
    id: string,
    updates: Partial<WorkflowDefinition>
  ): Promise<void> {
    // 直接调用createVersionedUpdate实现update操作
    await this.createVersionedUpdate(id, updates, {
      keepOriginal: false,
      force: false
    });
  }

  /**
   * 创建版本化更新
   * 基于不可变原则，通过创建新工作流实例实现版本更新
   */
  async createVersionedUpdate(
    id: string,
    updates: Partial<WorkflowDefinition>,
    options?: {
      versionStrategy?: 'patch' | 'minor' | 'major';
      keepOriginal?: boolean;
      force?: boolean;
    }
  ): Promise<string> {
    const existingWorkflow = await this.getResource(id);
    if (!existingWorkflow) {
      throw new Error(`Workflow with ID '${id}' not found`);
    }

    // 使用版本工具类自动递增版本
    const strategy = options?.versionStrategy ?? 'patch';
    const newVersion = this.autoIncrementVersion(existingWorkflow.version, strategy);

    // 创建全新的工作流实例（与之前完全无关）
    const newWorkflow: WorkflowDefinition = {
      ...existingWorkflow,
      ...updates,
      version: newVersion,
      updatedAt: Date.now()
    };

    // 注册新版本的工作流
    await this.createResource(newWorkflow);

    // 可选：是否保留原版本
    if (options?.keepOriginal === false) {
      // 直接调用workflowRegistry的unregister方法，让其内部处理引用检查
      this.dependencies.getWorkflowRegistry().unregister(id, {
        force: options?.force,
        checkReferences: true
      });
    }

    return newWorkflow.id;
  }

  /**
   * 自动递增版本号
   * @param currentVersion 当前版本号
   * @param strategy 版本策略
   * @returns 递增后的版本号
   */
  private autoIncrementVersion(currentVersion: string, strategy: 'patch' | 'minor' | 'major'): string {
    const parts = currentVersion.split('.').map(Number);
    let major = parts[0] || 0;
    let minor = parts[1] || 0;
    let patch = parts[2] || 0;

    switch (strategy) {
      case 'major':
        major += 1;
        minor = 0;
        patch = 0;
        break;
      case 'minor':
        minor += 1;
        patch = 0;
        break;
      case 'patch':
        patch += 1;
        break;
    }

    return `${major}.${minor}.${patch}`;
  }

  /**
   * 应用过滤条件
   */
  protected applyFilter(workflows: WorkflowDefinition[], filter: WorkflowFilter): WorkflowDefinition[] {
    return workflows.filter(workflow => {
      if (filter.ids && !filter.ids.some(id => workflow.id.includes(id))) {
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
    this.dependencies.getWorkflowRegistry().clear();
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
    const summaries = this.dependencies.getWorkflowRegistry().list();

    if (!filter) {
      return summaries;
    }

    // 应用过滤条件
    return summaries.filter((summary: WorkflowSummary) => {
      if (filter.ids && !filter.ids.some(id => summary.id.includes(id))) {
        return false;
      }
      if (filter.name && !summary.name.includes(filter.name)) {
        return false;
      }
      if (filter.version && summary.version !== filter.version) {
        return false;
      }
      if (filter.tags && summary.tags) {
        if (!filter.tags.every(tag => summary.tags?.includes(tag))) {
          return false;
        }
      }
      if (filter.category && summary.category !== filter.category) {
        return false;
      }
      // author 过滤暂时不支持，因为 WorkflowSummary 没有 author 字段
      return true;
    });
  }

  /**
   * 按名称获取工作流
   * @param name 工作流名称
   * @returns 工作流定义，如果不存在则返回null
   */
  async getWorkflowByName(name: string): Promise<WorkflowDefinition | null> {
    const workflow = this.dependencies.getWorkflowRegistry().getByName(name);
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
    return this.dependencies.getWorkflowRegistry().getByTags(tags);
  }

  /**
   * 按分类获取工作流列表
   * @param category 分类
   * @returns 工作流定义数组
   */
  async getWorkflowsByCategory(category: string): Promise<WorkflowDefinition[]> {
    return this.dependencies.getWorkflowRegistry().getByCategory(category);
  }

  /**
   * 按作者获取工作流列表
   * @param author 作者
   * @returns 工作流定义数组
   */
  async getWorkflowsByAuthor(author: string): Promise<WorkflowDefinition[]> {
    return this.dependencies.getWorkflowRegistry().getByAuthor(author);
  }

  /**
   * 搜索工作流
   * @param keyword 搜索关键词
   * @returns 工作流摘要数组
   */
  async searchWorkflows(keyword: string): Promise<WorkflowSummary[]> {
    return this.dependencies.getWorkflowRegistry().search(keyword);
  }

  /**
   * 导出工作流
   * @param workflowId 工作流ID
   * @returns JSON字符串
   */
  async exportWorkflow(workflowId: string): Promise<string> {
    return this.dependencies.getWorkflowRegistry().export(workflowId);
  }

  /**
   * 导入工作流
   * @param json JSON字符串
   * @returns 工作流ID
   */
  async importWorkflow(json: string): Promise<string> {
    const workflowId = this.dependencies.getWorkflowRegistry().import(json);
    // 更新缓存
    const workflow = this.dependencies.getWorkflowRegistry().get(workflowId);
    if (workflow) {
      // 缓存更新逻辑（如果需要缓存，可以在这里实现）
    }
    return workflowId;
  }


  /**
   * 获取处理后的工作流定义
   * @param workflowId 工作流ID
   * @returns 处理后的工作流定义，如果不存在则返回null
   */
  async getProcessedWorkflow(workflowId: string): Promise<any | null> {
    const processed = this.dependencies.getWorkflowRegistry().getProcessed(workflowId);
    return processed || null;
  }

  /**
   * 预处理并存储工作流
   * @param workflow 工作流定义
   * @returns 处理后的工作流定义
   */
  async preprocessAndStoreWorkflow(workflow: any): Promise<any> {
    const processed = await this.dependencies.getWorkflowRegistry().preprocessAndStore(workflow);
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
   try {
     const processed = await this.dependencies.getWorkflowRegistry().ensureProcessed(workflowId);
     return processed.graph || null;
   } catch {
     return null;
   }
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
    this.dependencies.getWorkflowRegistry().registerSubgraphRelationship(parentWorkflowId, subgraphNodeId, childWorkflowId);
  }

  /**
   * 获取工作流层次结构
   * @param workflowId 工作流ID
   * @returns 层次结构信息
   */
  async getWorkflowHierarchy(workflowId: string): Promise<any> {
    return this.dependencies.getWorkflowRegistry().getWorkflowHierarchy(workflowId);
  }

  /**
   * 获取父工作流
   * @param workflowId 工作流ID
   * @returns 父工作流ID或null
   */
  async getParentWorkflow(workflowId: string): Promise<string | null> {
    return this.dependencies.getWorkflowRegistry().getParentWorkflow(workflowId);
  }

  /**
   * 获取子工作流
   * @param workflowId 工作流ID
   * @returns 子工作流ID数组
   */
  async getChildWorkflows(workflowId: string): Promise<string[]> {
    return this.dependencies.getWorkflowRegistry().getChildWorkflows(workflowId);
  }

  /**
   * 获取底层WorkflowRegistry实例
   * @returns WorkflowRegistry实例
   */
  getRegistry() {
    return this.dependencies.getWorkflowRegistry();
  }
}