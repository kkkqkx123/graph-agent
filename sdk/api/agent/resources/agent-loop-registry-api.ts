/**
 * AgentLoopRegistryAPI - Agent Loop 注册表管理API
 * 继承GenericResourceAPI，提供统一的CRUD操作
 *
 * 职责：
 * - 封装 AgentLoopRegistry，提供 Agent Loop 实例的查询和管理
 * - 提供统计信息、状态查询等功能
 * - 参考 ThreadRegistryAPI 的设计模式
 */

import { GenericResourceAPI } from '../../shared/resources/generic-resource-api.js';
import type { AgentLoopRegistry } from '../../../agent/services/agent-loop-registry.js';
import type { AgentLoopEntity } from '../../../agent/entities/agent-loop-entity.js';
import { AgentLoopStatus, type ID } from '@modular-agent/types';
import { getErrorMessage, isSuccess, getData } from '../../shared/types/execution-result.js';
import { getContainer } from '../../../core/di/index.js';
import * as Identifiers from '../../../core/di/service-identifiers.js';

/**
 * Agent Loop 过滤器
 */
export interface AgentLoopFilter {
  /** ID列表 */
  ids?: ID[];
  /** 状态过滤 */
  status?: AgentLoopStatus;
  /** 创建时间范围 */
  createdAtRange?: {
    start?: number;
    end?: number;
  };
}

/**
 * Agent Loop 摘要信息
 */
export interface AgentLoopSummary {
  /** 实例ID */
  id: ID;
  /** 当前状态 */
  status: AgentLoopStatus;
  /** 当前迭代次数 */
  currentIteration: number;
  /** 工具调用次数 */
  toolCallCount: number;
  /** 开始时间 */
  startTime: number | null;
  /** 结束时间 */
  endTime: number | null;
  /** 执行时间（毫秒） */
  executionTime?: number;
}

/**
 * AgentLoopRegistryAPI - Agent Loop 注册表管理API
 *
 * 核心职责：
 * - 管理活跃的 AgentLoopEntity 实例
 * - 提供实例的注册、查询、删除功能
 * - 支持按状态过滤查询
 * - 提供统计信息
 */
export class AgentLoopRegistryAPI extends GenericResourceAPI<AgentLoopEntity, ID, AgentLoopFilter> {
  private registry: AgentLoopRegistry;

  constructor() {
    super();
    const container = getContainer();
    this.registry = container.get(Identifiers.AgentLoopRegistry);
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 获取单个 Agent Loop 实例
   * @param id 实例ID
   * @returns Agent Loop 实体，如果不存在则返回null
   */
  protected async getResource(id: ID): Promise<AgentLoopEntity | null> {
    return this.registry.get(id) || null;
  }

  /**
   * 获取所有 Agent Loop 实例
   * @returns Agent Loop 实体数组
   */
  protected async getAllResources(): Promise<AgentLoopEntity[]> {
    return this.registry.getAll();
  }

  /**
   * 创建 Agent Loop（实例由执行引擎创建，此方法抛出错误）
   * @param resource Agent Loop 实体
   * @throws Error - Agent Loop 不能通过API直接创建
   */
  protected async createResource(resource: AgentLoopEntity): Promise<void> {
    throw new Error('Agent Loop 不能通过API直接创建，请使用执行引擎');
  }

  /**
   * 更新 Agent Loop（实例由执行引擎更新，此方法抛出错误）
   * @param id 实例ID
   * @param updates 更新内容
   * @throws Error - Agent Loop 不能通过API直接更新
   */
  protected async updateResource(id: ID, updates: Partial<AgentLoopEntity>): Promise<void> {
    throw new Error('Agent Loop 不能通过API直接更新，请使用执行引擎');
  }

  /**
   * 删除 Agent Loop 实例
   * @param id 实例ID
   */
  protected async deleteResource(id: ID): Promise<void> {
    this.registry.unregister(id);
  }

  /**
   * 应用过滤条件
   * @param resources Agent Loop 实体数组
   * @param filter 过滤条件
   * @returns 过滤后的实体数组
   */
  protected applyFilter(resources: AgentLoopEntity[], filter: AgentLoopFilter): AgentLoopEntity[] {
    return resources.filter(entity => {
      if (filter.ids && !filter.ids.some(id => entity.id === id)) {
        return false;
      }
      if (filter.status && entity.getStatus() !== filter.status) {
        return false;
      }
      if (filter.createdAtRange) {
        const startTime = entity.state.startTime;
        if (startTime === null) {
          return false;
        }
        if (filter.createdAtRange.start && startTime < filter.createdAtRange.start) {
          return false;
        }
        if (filter.createdAtRange.end && startTime > filter.createdAtRange.end) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 清空所有资源
   */
  protected override async clearResources(): Promise<void> {
    this.registry.clear();
  }

  // ============================================================================
  // Agent Loop 特定方法
  // ============================================================================

  /**
   * 获取 Agent Loop 摘要列表
   * @param filter 过滤条件
   * @returns Agent Loop 摘要数组
   */
  async getAgentLoopSummaries(filter?: AgentLoopFilter): Promise<AgentLoopSummary[]> {
    const result = await this.getAll(filter);
    if (!isSuccess(result)) {
      throw new Error(getErrorMessage(result) || 'Failed to get agent loop summaries');
    }
    const entities = getData(result) || [];

    return entities.map(entity => {
      const startTime = entity.state.startTime;
      const endTime = entity.state.endTime;
      return {
        id: entity.id,
        status: entity.getStatus(),
        currentIteration: entity.state.currentIteration,
        toolCallCount: entity.state.toolCallCount,
        startTime,
        endTime,
        executionTime: startTime !== null && endTime !== null
          ? endTime - startTime
          : undefined
      };
    });
  }

  /**
   * 获取 Agent Loop 状态
   * @param id 实例ID
   * @returns 状态，如果不存在则返回null
   */
  async getAgentLoopStatus(id: ID): Promise<AgentLoopStatus | null> {
    const result = await this.get(id);
    if (!isSuccess(result)) {
      throw new Error(getErrorMessage(result) || 'Failed to get agent loop status');
    }
    const entity = getData(result);
    if (!entity) {
      return null;
    }
    return entity.getStatus();
  }

  /**
   * 获取正在运行的 Agent Loop
   * @returns Agent Loop 实体数组
   */
  async getRunningAgentLoops(): Promise<AgentLoopEntity[]> {
    return this.registry.getRunning();
  }

  /**
   * 获取已暂停的 Agent Loop
   * @returns Agent Loop 实体数组
   */
  async getPausedAgentLoops(): Promise<AgentLoopEntity[]> {
    return this.registry.getPaused();
  }

  /**
   * 获取已完成的 Agent Loop
   * @returns Agent Loop 实体数组
   */
  async getCompletedAgentLoops(): Promise<AgentLoopEntity[]> {
    return this.registry.getCompleted();
  }

  /**
   * 获取失败的 Agent Loop
   * @returns Agent Loop 实体数组
   */
  async getFailedAgentLoops(): Promise<AgentLoopEntity[]> {
    return this.registry.getFailed();
  }

  /**
   * 获取 Agent Loop 统计信息
   * @returns 统计信息
   */
  async getAgentLoopStatistics(): Promise<{
    total: number;
    byStatus: Record<AgentLoopStatus, number>;
  }> {
    const result = await this.getAll();
    if (!isSuccess(result)) {
      throw new Error(getErrorMessage(result) || 'Failed to get agent loop statistics');
    }
    const entities = getData(result) || [];

    const byStatus: Record<AgentLoopStatus, number> = {
      [AgentLoopStatus.CREATED]: 0,
      [AgentLoopStatus.RUNNING]: 0,
      [AgentLoopStatus.PAUSED]: 0,
      [AgentLoopStatus.COMPLETED]: 0,
      [AgentLoopStatus.FAILED]: 0,
      [AgentLoopStatus.CANCELLED]: 0
    };

    for (const entity of entities) {
      const status = entity.getStatus();
      byStatus[status]++;
    }

    return {
      total: entities.length,
      byStatus
    };
  }

  /**
   * 清理已完成的 Agent Loop
   * @returns 清理的实例数量
   */
  async cleanupCompletedAgentLoops(): Promise<number> {
    return this.registry.cleanupCompleted();
  }

  /**
   * 检查 Agent Loop 是否存在
   * @param id 实例ID
   * @returns 是否存在
   */
  async hasAgentLoop(id: ID): Promise<boolean> {
    return this.registry.has(id);
  }

  /**
   * 获取 Agent Loop 数量
   * @returns 实例数量
   */
  async getAgentLoopCount(): Promise<number> {
    return this.registry.size();
  }

  /**
   * 获取底层 AgentLoopRegistry 实例
   * @returns AgentLoopRegistry 实例
   */
  getRegistry(): AgentLoopRegistry {
    return this.registry;
  }
}
