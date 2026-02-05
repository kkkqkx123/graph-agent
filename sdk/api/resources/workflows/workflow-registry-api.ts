/**
 * WorkflowRegistryAPI - 工作流管理API
 * 封装WorkflowRegistry，提供CRUD操作
 */

import { workflowRegistry, type WorkflowRegistry } from '../../../core/services/workflow-registry';
import type { WorkflowDefinition } from '../../../types/workflow';
import type { WorkflowFilter, WorkflowSummary } from '../../types/registry-types';

/**
 * WorkflowRegistryAPI - 工作流管理API
 */
export class WorkflowRegistryAPI {
  private registry: WorkflowRegistry;
  private cache: Map<string, WorkflowDefinition> = new Map();

  constructor(options?: {
    enableVersioning?: boolean;
    maxVersions?: number;
  }) {
    this.registry = workflowRegistry;
  }

  /**
   * 注册工作流
   * @param workflow 工作流定义
   */
  async registerWorkflow(workflow: WorkflowDefinition): Promise<void> {
    this.registry.register(workflow);
    // 更新缓存
    this.cache.set(workflow.id, workflow);
  }

  /**
   * 批量注册工作流
   * @param workflows 工作流定义数组
   */
  async registerWorkflows(workflows: WorkflowDefinition[]): Promise<void> {
    // 使用Promise.all并行注册
    await Promise.all(
      workflows.map(workflow => this.registerWorkflow(workflow))
    );
  }

  /**
   * 获取工作流
   * @param workflowId 工作流ID
   * @returns 工作流定义，如果不存在则返回null
   */
  async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    // 先从缓存获取
    if (this.cache.has(workflowId)) {
      return this.cache.get(workflowId)!;
    }

    // 从注册表获取
    const workflow = this.registry.get(workflowId);
    if (workflow) {
      this.cache.set(workflowId, workflow);
    }

    return workflow || null;
  }

  /**
   * 获取工作流列表
   * @param filter 过滤条件
   * @returns 工作流定义数组
   */
  async getWorkflows(filter?: WorkflowFilter): Promise<WorkflowDefinition[]> {
    let workflows = this.getAllWorkflows();

    // 应用过滤条件
    if (filter) {
      workflows = this.applyFilter(workflows, filter);
    }

    return workflows;
  }

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
   * 更新工作流
   * @param workflowId 工作流ID
   * @param workflow 工作流定义
   */
  async updateWorkflow(workflowId: string, workflow: WorkflowDefinition): Promise<void> {
    // 更新工作流（Core层会检查工作流是否存在）
    this.registry.update(workflow);
    // 更新缓存
    this.cache.set(workflowId, workflow);
  }

  /**
   * 删除工作流
   * @param workflowId 工作流ID
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    // 删除工作流（Core层会检查工作流是否存在）
    this.registry.unregister(workflowId);
    // 清除缓存
    this.cache.delete(workflowId);
  }

  /**
   * 按名称获取工作流
   * @param name 工作流名称
   * @returns 工作流定义，如果不存在则返回null
   */
  async getWorkflowByName(name: string): Promise<WorkflowDefinition | null> {
    const workflow = this.registry.getByName(name);
    if (workflow) {
      this.cache.set(workflow.id, workflow);
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
   * 检查工作流是否存在
   * @param workflowId 工作流ID
   * @returns 是否存在
   */
  async hasWorkflow(workflowId: string): Promise<boolean> {
    return this.registry.has(workflowId);
  }

  /**
   * 获取工作流数量
   * @returns 工作流数量
   */
  async getWorkflowCount(): Promise<number> {
    return this.registry.size();
  }

  /**
   * 清空所有工作流
   */
  async clearWorkflows(): Promise<void> {
    this.registry.clear();
    this.cache.clear();
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
      this.cache.set(workflowId, workflow);
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
      this.cache.set(workflowId, workflow);
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
    this.cache.set(workflow.id, workflow);
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
   * 应用过滤条件
   * @param workflows 工作流数组
   * @param filter 过滤条件
   * @returns 过滤后的工作流数组
   */
  private applyFilter(workflows: WorkflowDefinition[], filter: WorkflowFilter): WorkflowDefinition[] {
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
   * 获取所有工作流（辅助方法）
   * @returns 工作流定义数组
   */
  private getAllWorkflows(): WorkflowDefinition[] {
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
}