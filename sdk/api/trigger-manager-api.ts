/**
 * TriggerManagerAPI - 触发器管理API
 * 封装触发器管理功能，提供线程触发器的查询和管理
 * 注意：触发器由workflow的静态定义提供，API提供运行时管理功能
 */

import { threadRegistry as globalThreadRegistry, type ThreadRegistry } from '../core/services/thread-registry';
import type { Trigger, TriggerStatus } from '../types/trigger';
import { NotFoundError, ValidationError } from '../types/errors';

/**
 * 触发器过滤器
 */
export interface TriggerFilter {
  /** 触发器ID */
  triggerId?: string;
  /** 触发器名称 */
  name?: string;
  /** 触发器状态 */
  status?: TriggerStatus;
  /** 关联的工作流ID */
  workflowId?: string;
  /** 关联的线程ID */
  threadId?: string;
}

/**
 * TriggerManagerAPI - 触发器管理API
 * 默认使用全局线程注册表单例
 */
export class TriggerManagerAPI {
  private threadRegistry: ThreadRegistry;

  /**
   * 创建 TriggerManagerAPI 实例
   * @param threadRegistry 线程注册表（可选，默认使用全局单例）
   */
  constructor(threadRegistry?: ThreadRegistry) {
    // 默认使用全局单例，支持依赖注入用于测试
    this.threadRegistry = threadRegistry || globalThreadRegistry;
  }

  /**
   * 获取触发器
   * @param threadId 线程ID
   * @param triggerId 触发器ID
   * @returns 触发器，如果不存在则返回undefined
   * @throws NotFoundError 如果线程不存在
   */
  async getTrigger(threadId: string, triggerId: string): Promise<Trigger | undefined> {
    const triggerManager = await this.getTriggerManager(threadId);
    return triggerManager.get(triggerId);
  }

  /**
   * 获取所有触发器
   * @param threadId 线程ID
   * @param filter 过滤条件（可选）
   * @returns 触发器数组
   * @throws NotFoundError 如果线程不存在
   */
  async getAllTriggers(threadId: string, filter?: TriggerFilter): Promise<Trigger[]> {
    const triggerManager = await this.getTriggerManager(threadId);
    let triggers = triggerManager.getAll();

    // 应用过滤条件
    if (filter) {
      triggers = triggers.filter(t => this.applyFilter(t, filter));
    }

    return triggers;
  }

  /**
   * 获取已启用的触发器
   * @param threadId 线程ID
   * @returns 已启用的触发器数组
   * @throws NotFoundError 如果线程不存在
   */
  async getEnabledTriggers(threadId: string): Promise<Trigger[]> {
    return this.getAllTriggers(threadId, { status: 'enabled' as TriggerStatus });
  }

  /**
   * 获取已禁用的触发器
   * @param threadId 线程ID
   * @returns 已禁用的触发器数组
   * @throws NotFoundError 如果线程不存在
   */
  async getDisabledTriggers(threadId: string): Promise<Trigger[]> {
    return this.getAllTriggers(threadId, { status: 'disabled' as TriggerStatus });
  }

  /**
   * 启用触发器
   * @param threadId 线程ID
   * @param triggerId 触发器ID
   * @throws NotFoundError 如果线程或触发器不存在
   */
  async enableTrigger(threadId: string, triggerId: string): Promise<void> {
    const triggerManager = await this.getTriggerManager(threadId);
    triggerManager.enable(triggerId);
  }

  /**
   * 禁用触发器
   * @param threadId 线程ID
   * @param triggerId 触发器ID
   * @throws NotFoundError 如果线程或触发器不存在
   */
  async disableTrigger(threadId: string, triggerId: string): Promise<void> {
    const triggerManager = await this.getTriggerManager(threadId);
    triggerManager.disable(triggerId);
  }

  /**
   * 批量启用触发器
   * @param threadId 线程ID
   * @param triggerIds 触发器ID数组
   * @throws NotFoundError 如果线程不存在
   */
  async batchEnableTriggers(threadId: string, triggerIds: string[]): Promise<void> {
    const triggerManager = await this.getTriggerManager(threadId);
    for (const triggerId of triggerIds) {
      try {
        triggerManager.enable(triggerId);
      } catch (error) {
        // 静默处理错误，继续处理其他触发器
      }
    }
  }

  /**
   * 批量禁用触发器
   * @param threadId 线程ID
   * @param triggerIds 触发器ID数组
   * @throws NotFoundError 如果线程不存在
   */
  async batchDisableTriggers(threadId: string, triggerIds: string[]): Promise<void> {
    const triggerManager = await this.getTriggerManager(threadId);
    for (const triggerId of triggerIds) {
      try {
        triggerManager.disable(triggerId);
      } catch (error) {
        // 静默处理错误，继续处理其他触发器
      }
    }
  }

  /**
   * 获取触发器状态
   * @param threadId 线程ID
   * @param triggerId 触发器ID
   * @returns 触发器状态，如果不存在则返回undefined
   * @throws NotFoundError 如果线程不存在
   */
  async getTriggerStatus(threadId: string, triggerId: string): Promise<TriggerStatus | undefined> {
    const trigger = await this.getTrigger(threadId, triggerId);
    return trigger?.status;
  }

  /**
   * 获取触发器数量
   * @param threadId 线程ID
   * @param filter 过滤条件（可选）
   * @returns 触发器数量
   * @throws NotFoundError 如果线程不存在
   */
  async getTriggerCount(threadId: string, filter?: TriggerFilter): Promise<number> {
    const triggers = await this.getAllTriggers(threadId, filter);
    return triggers.length;
  }

  /**
   * 检查触发器是否存在
   * @param threadId 线程ID
   * @param triggerId 触发器ID
   * @returns 是否存在
   * @throws NotFoundError 如果线程不存在
   */
  async hasTrigger(threadId: string, triggerId: string): Promise<boolean> {
    const trigger = await this.getTrigger(threadId, triggerId);
    return trigger !== undefined;
  }

  /**
   * 清空所有触发器
   * @param threadId 线程ID
   * @throws NotFoundError 如果线程不存在
   */
  async clearTriggers(threadId: string): Promise<void> {
    const triggerManager = await this.getTriggerManager(threadId);
    triggerManager.clear();
  }

  /**
   * 按工作流ID获取触发器
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @returns 触发器数组
   * @throws NotFoundError 如果线程不存在
   */
  async getTriggersByWorkflow(threadId: string, workflowId: string): Promise<Trigger[]> {
    return this.getAllTriggers(threadId, { workflowId });
  }

  /**
   * 按名称搜索触发器
   * @param threadId 线程ID
   * @param name 触发器名称（支持模糊匹配）
   * @returns 触发器数组
   * @throws NotFoundError 如果线程不存在
   */
  async searchTriggersByName(threadId: string, name: string): Promise<Trigger[]> {
    const triggers = await this.getAllTriggers(threadId);
    return triggers.filter(t => t.name.toLowerCase().includes(name.toLowerCase()));
  }

  /**
   * 获取触发器统计信息
   * @param threadId 线程ID
   * @returns 统计信息
   * @throws NotFoundError 如果线程不存在
   */
  async getTriggerStatistics(threadId: string): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    triggered: number;
  }> {
    const triggers = await this.getAllTriggers(threadId);
    return {
      total: triggers.length,
      enabled: triggers.filter(t => t.status === 'enabled').length,
      disabled: triggers.filter(t => t.status === 'disabled').length,
      triggered: triggers.filter(t => t.status === 'triggered').length
    };
  }

  /**
   * 获取底层ThreadRegistry实例
   * @returns ThreadRegistry实例
   */
  getThreadRegistry(): ThreadRegistry {
    return this.threadRegistry;
  }

  /**
   * 获取触发器管理器
   * @param threadId 线程ID
   * @returns 触发器管理器实例
   * @throws NotFoundError 如果线程不存在
   */
  private async getTriggerManager(threadId: string) {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'thread', threadId);
    }
    return threadContext.triggerManager;
  }

  /**
   * 应用过滤条件
   * @param trigger 触发器
   * @param filter 过滤条件
   * @returns 是否匹配
   */
  private applyFilter(trigger: Trigger, filter: TriggerFilter): boolean {
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
  }
}

/**
 * 全局触发器管理器 API 实例
 */
export const triggerManagerAPI = new TriggerManagerAPI();