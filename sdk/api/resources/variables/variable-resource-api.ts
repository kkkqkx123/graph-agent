/**
 * VariableResourceAPI - 变量资源管理API
 * 继承GenericResourceAPI，提供统一的CRUD操作
 */

import { GenericResourceAPI } from '../generic-resource-api';
import { threadRegistry, type ThreadRegistry } from '../../../core/services/thread-registry';
import type { Thread, VariableFilter } from '@modular-agent/types';
import { NotFoundError, ThreadContextNotFoundError } from '@modular-agent/types';

// 重新导出 VariableFilter 供外部使用
export type { VariableFilter };

/**
 * 变量定义信息
 */
export interface VariableDefinition {
  /** 变量名称 */
  name: string;
  /** 变量类型 */
  type: string;
  /** 变量描述 */
  description?: string;
  /** 默认值 */
  defaultValue?: any;
  /** 是否必需 */
  required?: boolean;
}

/**
 * VariableResourceAPI - 变量资源管理API
 */
export class VariableResourceAPI extends GenericResourceAPI<any, string, VariableFilter> {
  private registry: ThreadRegistry;

  constructor() {
    super();
    this.registry = threadRegistry;
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 获取单个变量值
   * @param id 变量名称（格式：threadId:variableName）
   * @returns 变量值，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<any | null> {
    const [threadId, variableName] = this.parseVariableId(id);
    const thread = await this.getThread(threadId);
    
    if (!(variableName in thread.variableScopes.thread)) {
      return null;
    }
    
    return thread.variableScopes.thread[variableName];
  }

  /**
   * 获取所有变量值
   * @returns 变量值记录
   */
  protected async getAllResources(): Promise<any[]> {
    // 变量不适合返回数组，这里返回空数组，使用特定方法获取变量
    return [];
  }

  /**
   * 创建变量（变量由工作流执行创建，此方法抛出错误）
   */
  protected async createResource(resource: any): Promise<void> {
    throw new Error('变量不能通过API直接创建，请使用工作流执行引擎');
  }

  /**
   * 更新变量（变量由工作流执行更新，此方法抛出错误）
   */
  protected async updateResource(id: string, updates: Partial<any>): Promise<void> {
    throw new Error('变量不能通过API直接更新，请使用工作流执行引擎');
  }

  /**
   * 删除变量（变量由工作流执行删除，此方法抛出错误）
   */
  protected async deleteResource(id: string): Promise<void> {
    throw new Error('变量不能通过API直接删除，请使用工作流执行引擎');
  }

  /**
   * 应用过滤条件
   */
  protected applyFilter(variables: any[], filter: VariableFilter): any[] {
    // 变量不适合通用过滤，使用特定方法
    return variables;
  }

  // ============================================================================
  // 变量特定方法
  // ============================================================================

  /**
   * 获取线程的所有变量值
   * @param threadId 线程ID
   * @returns 变量值记录
   */
  async getThreadVariables(threadId: string): Promise<Record<string, any>> {
    const thread = await this.getThread(threadId);
    return { ...thread.variableScopes.thread };
  }

  /**
   * 获取线程的指定变量值
   * @param threadId 线程ID
   * @param name 变量名称
   * @returns 变量值
   */
  async getThreadVariable(threadId: string, name: string): Promise<any> {
    const thread = await this.getThread(threadId);
    
    if (!(name in thread.variableScopes.thread)) {
      throw new NotFoundError(`Variable not found: ${name}`, 'Variable', name);
    }
    
    return thread.variableScopes.thread[name];
  }

  /**
   * 检查线程的指定变量是否存在
   * @param threadId 线程ID
   * @param name 变量名称
   * @returns 是否存在
   */
  async hasThreadVariable(threadId: string, name: string): Promise<boolean> {
    const thread = await this.getThread(threadId);
    return name in thread.variableScopes.thread;
  }

  /**
   * 获取线程的变量定义
   * @param threadId 线程ID
   * @returns 变量定义记录
   */
  async getThreadVariableDefinitions(threadId: string): Promise<Record<string, any>> {
    const thread = await this.getThread(threadId);
    // 变量定义信息需要从其他来源获取，这里返回空对象
    return {};
  }

  /**
   * 获取所有线程的变量统计
   * @returns 统计信息
   */
  async getVariableStatistics(): Promise<{
    totalThreads: number;
    totalVariables: number;
    byThread: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const threadContexts = this.registry.getAll();
    const stats = {
      totalThreads: threadContexts.length,
      totalVariables: 0,
      byThread: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    for (const context of threadContexts) {
      const thread = context.thread;
      const threadId = thread.id;
      const variables = thread.variableScopes.thread;
      
      stats.byThread[threadId] = Object.keys(variables).length;
      stats.totalVariables += Object.keys(variables).length;

      // 统计变量类型（简化实现）
      for (const [name, value] of Object.entries(variables)) {
        const type = typeof value;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 获取变量作用域信息
   * @param threadId 线程ID
   * @returns 作用域信息
   */
  async getVariableScopes(threadId: string): Promise<{
    thread: Record<string, any>;
    global: Record<string, any>;
    local: Record<string, any>;
    loop: Record<string, any>;
  }> {
    const thread = await this.getThread(threadId);
    return {
      thread: { ...thread.variableScopes.thread },
      global: { ...thread.variableScopes.global },
      local: thread.variableScopes.local.length > 0
        ? { ...thread.variableScopes.local[thread.variableScopes.local.length - 1] }
        : {},
      loop: thread.variableScopes.loop.length > 0
        ? { ...thread.variableScopes.loop[thread.variableScopes.loop.length - 1] }
        : {}
    };
  }

  /**
   * 搜索变量
   * @param threadId 线程ID
   * @param query 搜索关键词
   * @returns 匹配的变量名称数组
   */
  async searchVariables(threadId: string, query: string): Promise<string[]> {
    const thread = await this.getThread(threadId);
    const variables = thread.variableScopes.thread;
    
    return Object.keys(variables).filter(name => 
      name.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * 导出线程变量
   * @param threadId 线程ID
   * @returns JSON字符串
   */
  async exportThreadVariables(threadId: string): Promise<string> {
    const variables = await this.getThreadVariables(threadId);
    return JSON.stringify(variables, null, 2);
  }

  /**
   * 获取变量变更历史
   * @param threadId 线程ID
   * @param variableName 变量名称
   * @returns 变更历史数组（简化实现）
   */
  async getVariableHistory(threadId: string, variableName: string): Promise<Array<{
    timestamp: number;
    value: any;
    source: string;
  }>> {
    // 简化实现，实际项目中可以从事件系统获取
    const currentValue = await this.getThreadVariable(threadId, variableName);
    return [{
      timestamp: Date.now(),
      value: currentValue,
      source: 'current'
    }];
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  /**
   * 解析变量ID
   * @param id 变量ID（格式：threadId:variableName）
   * @returns [threadId, variableName]
   */
  private parseVariableId(id: string): [string, string] {
    const parts = id.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid variable ID format: ${id}. Expected format: threadId:variableName`);
    }
    return [parts[0]!, parts[1]!];
  }

  /**
   * 获取线程实例
   */
  private async getThread(threadId: string): Promise<Thread> {
    const threadContext = this.registry.get(threadId);
    if (!threadContext) {
      throw new ThreadContextNotFoundError(`Thread not found: ${threadId}`, threadId);
    }
    return threadContext.thread;
  }

  /**
   * 获取底层ThreadRegistry实例
   * @returns ThreadRegistry实例
   */
  getRegistry(): ThreadRegistry {
    return this.registry;
  }
}