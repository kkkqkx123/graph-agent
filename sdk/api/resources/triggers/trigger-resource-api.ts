/**
 * TriggerResourceAPI - 触发器资源管理API
 * 继承GenericResourceAPI，提供统一的CRUD操作
 */

import { GenericResourceAPI } from '../generic-resource-api';
import { threadRegistry, type ThreadRegistry } from '../../../core/services/thread-registry';
import { TriggerStatus } from '../../../types/trigger';
import type { Trigger } from '../../../types/trigger';
import { NotFoundError } from '../../../types/errors';
import type { TriggerFilter } from '../../types/management-types';

/**
 * TriggerResourceAPI - 触发器资源管理API
 */
export class TriggerResourceAPI extends GenericResourceAPI<Trigger, string, TriggerFilter> {
  private registry: ThreadRegistry;

  constructor() {
    super();
    this.registry = threadRegistry;
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 获取单个触发器
   * @param id 触发器ID
   * @returns 触发器对象，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<Trigger | null> {
    // 触发器通常通过线程上下文获取，这里需要遍历所有线程
    const threadContexts = this.registry.getAll();
    for (const context of threadContexts) {
      const triggers = context.triggerManager.getAll();
      const trigger = triggers.find(t => t.id === id);
      if (trigger) {
        return trigger;
      }
    }
    return null;
  }

  /**
   * 获取所有触发器
   * @returns 触发器数组
   */
  protected async getAllResources(): Promise<Trigger[]> {
    const threadContexts = this.registry.getAll();
    const allTriggers: Trigger[] = [];
    
    for (const context of threadContexts) {
      const triggers = context.triggerManager.getAll();
      allTriggers.push(...triggers);
    }
    
    return allTriggers;
  }

  /**
   * 创建触发器（触发器由工作流定义创建，此方法抛出错误）
   */
  protected async createResource(resource: Trigger): Promise<void> {
    throw new Error('触发器不能通过API直接创建，请使用工作流定义');
  }

  /**
   * 更新触发器（触发器由工作流执行更新，此方法抛出错误）
   */
  protected async updateResource(id: string, updates: Partial<Trigger>): Promise<void> {
    throw new Error('触发器不能通过API直接更新，请使用工作流执行引擎');
  }

  /**
   * 删除触发器（触发器由工作流执行删除，此方法抛出错误）
   */
  protected async deleteResource(id: string): Promise<void> {
    throw new Error('触发器不能通过API直接删除，请使用工作流执行引擎');
  }

  /**
   * 应用过滤条件
   */
  protected applyFilter(triggers: Trigger[], filter: TriggerFilter): Trigger[] {
    return triggers.filter(trigger => {
      if (filter.triggerId && trigger.id !== filter.triggerId) {
        return false;
      }
      if (filter.name && !trigger.name.toLowerCase().includes(filter.name.toLowerCase())) {
        return false;
      }
      if (filter.status && trigger.status !== filter.status) {
        return false;
      }
      if (filter.workflowId && trigger.workflowId !== filter.workflowId) {
        return false;
      }
      if (filter.threadId && trigger.threadId !== filter.threadId) {
        return false;
      }
      return true;
    });
  }

  // ============================================================================
  // 触发器特定方法
  // ============================================================================

  /**
   * 获取线程的所有触发器
   * @param threadId 线程ID
   * @param filter 过滤条件
   * @returns 触发器数组
   */
  async getThreadTriggers(threadId: string, filter?: TriggerFilter): Promise<Trigger[]> {
    const triggerManager = await this.getTriggerManager(threadId);
    let triggers = triggerManager.getAll();

    // 应用过滤条件
    if (filter) {
      triggers = triggers.filter(t => this.applyFilter([t], filter).length > 0);
    }

    return triggers;
  }

  /**
   * 获取线程的指定触发器
   * @param threadId 线程ID
   * @param triggerId 触发器ID
   * @returns 触发器对象
   */
  async getThreadTrigger(threadId: string, triggerId: string): Promise<Trigger> {
    const triggerManager = await this.getTriggerManager(threadId);
    const trigger = triggerManager.get(triggerId);
    
    if (!trigger) {
      throw new NotFoundError(`Trigger not found: ${triggerId}`, 'trigger', triggerId);
    }
    
    return trigger;
  }

  /**
   * 启用触发器
   * @param threadId 线程ID
   * @param triggerId 触发器ID
   */
  async enableTrigger(threadId: string, triggerId: string): Promise<void> {
    const triggerManager = await this.getTriggerManager(threadId);
    triggerManager.enable(triggerId);
  }

  /**
   * 禁用触发器
   * @param threadId 线程ID
   * @param triggerId 触发器ID
   */
  async disableTrigger(threadId: string, triggerId: string): Promise<void> {
    const triggerManager = await this.getTriggerManager(threadId);
    triggerManager.disable(triggerId);
  }

  /**
   * 检查触发器是否启用
   * @param threadId 线程ID
   * @param triggerId 触发器ID
   * @returns 是否启用
   */
  async isTriggerEnabled(threadId: string, triggerId: string): Promise<boolean> {
    const trigger = await this.getThreadTrigger(threadId, triggerId);
    return trigger.status === TriggerStatus.ENABLED;
  }

  /**
   * 获取触发器统计信息
   * @param threadId 线程ID
   * @returns 统计信息
   */
  async getTriggerStatistics(threadId: string): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byType: Record<string, number>;
  }> {
    const triggers = await this.getThreadTriggers(threadId);
    
    const stats = {
      total: triggers.length,
      enabled: 0,
      disabled: 0,
      byType: {} as Record<string, number>
    };

    for (const trigger of triggers) {
      if (trigger.status === TriggerStatus.ENABLED) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }

      const type = trigger.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }

  /**
   * 获取所有线程的触发器统计
   * @returns 全局统计信息
   */
  async getGlobalTriggerStatistics(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byThread: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const threadContexts = this.registry.getAll();
    const stats = {
      total: 0,
      enabled: 0,
      disabled: 0,
      byThread: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    for (const context of threadContexts) {
      const threadId = context.thread.id;
      const triggers = context.triggerManager.getAll();
      
      stats.byThread[threadId] = triggers.length;
      stats.total += triggers.length;

      for (const trigger of triggers) {
        if (trigger.status === TriggerStatus.ENABLED) {
          stats.enabled++;
        } else {
          stats.disabled++;
        }

        const type = trigger.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 搜索触发器
   * @param query 搜索关键词
   * @returns 匹配的触发器数组
   */
  async searchTriggers(query: string): Promise<Trigger[]> {
    const allTriggers = await this.getAllResources();
    return allTriggers.filter(trigger => 
      trigger.name.toLowerCase().includes(query.toLowerCase()) ||
      trigger.id.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * 获取触发器的执行历史
   * @param threadId 线程ID
   * @param triggerId 触发器ID
   * @returns 执行历史数组（简化实现）
   */
  async getTriggerExecutionHistory(threadId: string, triggerId: string): Promise<Array<{
    timestamp: number;
    result: any;
    success: boolean;
  }>> {
    // 简化实现，实际项目中可以从事件系统获取
    const trigger = await this.getThreadTrigger(threadId, triggerId);
    return [{
      timestamp: Date.now(),
      result: `Trigger ${triggerId} is ${trigger.status}`,
      success: trigger.status === TriggerStatus.ENABLED
    }];
  }

  /**
   * 导出线程触发器
   * @param threadId 线程ID
   * @returns JSON字符串
   */
  async exportThreadTriggers(threadId: string): Promise<string> {
    const triggers = await this.getThreadTriggers(threadId);
    return JSON.stringify(triggers, null, 2);
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  /**
   * 获取触发器管理器
   */
  private async getTriggerManager(threadId: string) {
    const threadContext = this.registry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'thread', threadId);
    }
    return threadContext.triggerManager;
  }

  /**
   * 获取底层ThreadRegistry实例
   * @returns ThreadRegistry实例
   */
  getRegistry(): ThreadRegistry {
    return this.registry;
  }
}