/**
 * AgentLoopCheckpointResourceAPI - Agent Loop 检查点资源管理API
 * 继承GenericResourceAPI，提供统一的CRUD操作
 *
 * 职责：
 * - 封装 AgentLoopCheckpointCoordinator，提供检查点的创建、恢复、查询功能
 * - 支持完整检查点和增量检查点
 * - 提供检查点统计信息
 */

import { GenericResourceAPI } from '../../shared/resources/generic-resource-api.js';
import type { AgentLoopCheckpoint, CheckpointMetadata, ID } from '@modular-agent/types';
import { getErrorMessage, isSuccess, getData } from '../../shared/types/execution-result.js';
import type { AgentLoopEntity } from '../../../agent/entities/agent-loop-entity.js';
import {
  AgentLoopCheckpointCoordinator,
  type CheckpointDependencies,
  type CheckpointOptions
} from '../../../agent/checkpoint/checkpoint-coordinator.js';

/**
 * 检查点过滤器
 */
export interface AgentLoopCheckpointFilter {
  /** ID列表 */
  ids?: ID[];
  /** Agent Loop ID */
  agentLoopId?: ID;
  /** 检查点类型 */
  type?: 'FULL' | 'DELTA';
  /** 时间范围 */
  timestampRange?: {
    start?: number;
    end?: number;
  };
}

/**
 * 检查点存储接口
 */
export interface CheckpointStorage {
  /** 保存检查点 */
  saveCheckpoint: (checkpoint: AgentLoopCheckpoint) => Promise<string>;
  /** 获取检查点 */
  getCheckpoint: (id: string) => Promise<AgentLoopCheckpoint | null>;
  /** 列出检查点 */
  listCheckpoints: (agentLoopId: string) => Promise<string[]>;
  /** 删除检查点 */
  deleteCheckpoint: (id: string) => Promise<void>;
}

/**
 * AgentLoopCheckpointResourceAPI - Agent Loop 检查点资源管理API
 */
export class AgentLoopCheckpointResourceAPI extends GenericResourceAPI<AgentLoopCheckpoint, string, AgentLoopCheckpointFilter> {
  private storage: CheckpointStorage;
  private checkpoints: Map<string, AgentLoopCheckpoint> = new Map();
  private checkpointsByAgentLoop: Map<string, string[]> = new Map();

  constructor(storage?: CheckpointStorage) {
    super();
    this.storage = storage ?? this.createDefaultStorage();
  }

  /**
   * 创建默认存储实现
   */
  private createDefaultStorage(): CheckpointStorage {
    return {
      saveCheckpoint: async (checkpoint: AgentLoopCheckpoint) => {
        this.checkpoints.set(checkpoint.id, checkpoint);
        const list = this.checkpointsByAgentLoop.get(checkpoint.agentLoopId) || [];
        list.unshift(checkpoint.id);
        this.checkpointsByAgentLoop.set(checkpoint.agentLoopId, list);
        return checkpoint.id;
      },
      getCheckpoint: async (id: string) => {
        return this.checkpoints.get(id) || null;
      },
      listCheckpoints: async (agentLoopId: string) => {
        return this.checkpointsByAgentLoop.get(agentLoopId) || [];
      },
      deleteCheckpoint: async (id: string) => {
        const checkpoint = this.checkpoints.get(id);
        if (checkpoint) {
          this.checkpoints.delete(id);
          const list = this.checkpointsByAgentLoop.get(checkpoint.agentLoopId) || [];
          const index = list.indexOf(id);
          if (index > -1) {
            list.splice(index, 1);
          }
        }
      }
    };
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 获取单个检查点
   * @param id 检查点ID
   * @returns 检查点对象，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<AgentLoopCheckpoint | null> {
    return this.storage.getCheckpoint(id);
  }

  /**
   * 获取所有检查点
   * @returns 检查点数组
   */
  protected async getAllResources(): Promise<AgentLoopCheckpoint[]> {
    const checkpoints: AgentLoopCheckpoint[] = [];
    for (const checkpoint of this.checkpoints.values()) {
      checkpoints.push(checkpoint);
    }
    return checkpoints;
  }

  /**
   * 创建检查点（检查点由 createCheckpoint 方法创建，此方法抛出错误）
   */
  protected async createResource(resource: AgentLoopCheckpoint): Promise<void> {
    throw new Error('检查点不能通过API直接创建，请使用 createCheckpoint 方法');
  }

  /**
   * 更新检查点（检查点不可更新，此方法抛出错误）
   */
  protected async updateResource(id: string, updates: Partial<AgentLoopCheckpoint>): Promise<void> {
    throw new Error('检查点不能通过API直接更新');
  }

  /**
   * 删除检查点
   * @param id 检查点ID
   */
  protected async deleteResource(id: string): Promise<void> {
    await this.storage.deleteCheckpoint(id);
  }

  /**
   * 应用过滤条件
   */
  protected applyFilter(checkpoints: AgentLoopCheckpoint[], filter: AgentLoopCheckpointFilter): AgentLoopCheckpoint[] {
    return checkpoints.filter(cp => {
      if (filter.ids && !filter.ids.some(id => cp.id === id)) {
        return false;
      }
      if (filter.agentLoopId && cp.agentLoopId !== filter.agentLoopId) {
        return false;
      }
      if (filter.type && cp.type !== filter.type) {
        return false;
      }
      if (filter.timestampRange?.start && cp.timestamp < filter.timestampRange.start) {
        return false;
      }
      if (filter.timestampRange?.end && cp.timestamp > filter.timestampRange.end) {
        return false;
      }
      return true;
    });
  }

  /**
   * 清空所有检查点
   */
  protected override async clearResources(): Promise<void> {
    this.checkpoints.clear();
    this.checkpointsByAgentLoop.clear();
  }

  // ============================================================================
  // 检查点特定方法
  // ============================================================================

  /**
   * 创建 Agent Loop 检查点
   * @param entity Agent Loop 实体
   * @param options 创建选项
   * @returns 检查点ID
   */
  async createCheckpoint(
    entity: AgentLoopEntity,
    options?: CheckpointOptions
  ): Promise<string> {
    const dependencies: CheckpointDependencies = {
      saveCheckpoint: this.storage.saveCheckpoint,
      getCheckpoint: this.storage.getCheckpoint,
      listCheckpoints: this.storage.listCheckpoints
    };

    return AgentLoopCheckpointCoordinator.createCheckpoint(entity, dependencies, options);
  }

  /**
   * 从检查点恢复 Agent Loop
   * @param checkpointId 检查点ID
   * @returns 恢复的 Agent Loop 实体
   */
  async restoreFromCheckpoint(checkpointId: string): Promise<AgentLoopEntity> {
    const dependencies: CheckpointDependencies = {
      saveCheckpoint: this.storage.saveCheckpoint,
      getCheckpoint: this.storage.getCheckpoint,
      listCheckpoints: this.storage.listCheckpoints
    };

    return AgentLoopCheckpointCoordinator.restoreFromCheckpoint(checkpointId, dependencies);
  }

  /**
   * 获取 Agent Loop 的检查点列表
   * @param agentLoopId Agent Loop ID
   * @returns 检查点数组
   */
  async getAgentLoopCheckpoints(agentLoopId: string): Promise<AgentLoopCheckpoint[]> {
    const checkpointIds = await this.storage.listCheckpoints(agentLoopId);
    const checkpoints: AgentLoopCheckpoint[] = [];

    for (const id of checkpointIds) {
      const checkpoint = await this.storage.getCheckpoint(id);
      if (checkpoint) {
        checkpoints.push(checkpoint);
      }
    }

    return checkpoints;
  }

  /**
   * 获取最新的检查点
   * @param agentLoopId Agent Loop ID
   * @returns 最新检查点，如果不存在则返回null
   */
  async getLatestCheckpoint(agentLoopId: string): Promise<AgentLoopCheckpoint | null> {
    const checkpointIds = await this.storage.listCheckpoints(agentLoopId);
    if (checkpointIds.length === 0) {
      return null;
    }

    return this.storage.getCheckpoint(checkpointIds[0]!);
  }

  /**
   * 获取检查点统计信息
   * @returns 统计信息
   */
  async getCheckpointStatistics(): Promise<{
    total: number;
    byAgentLoop: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const result = await this.getAll();
    if (!isSuccess(result)) {
      throw new Error(getErrorMessage(result) || 'Failed to get checkpoint statistics');
    }
    const checkpoints = getData(result) || [];

    const byAgentLoop: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const checkpoint of checkpoints) {
      byAgentLoop[checkpoint.agentLoopId] = (byAgentLoop[checkpoint.agentLoopId] || 0) + 1;
      byType[checkpoint.type] = (byType[checkpoint.type] || 0) + 1;
    }

    return {
      total: checkpoints.length,
      byAgentLoop,
      byType
    };
  }

  /**
   * 删除 Agent Loop 的所有检查点
   * @param agentLoopId Agent Loop ID
   * @returns 删除的检查点数量
   */
  async deleteAgentLoopCheckpoints(agentLoopId: string): Promise<number> {
    const checkpointIds = await this.storage.listCheckpoints(agentLoopId);
    let count = 0;

    for (const id of checkpointIds) {
      await this.storage.deleteCheckpoint(id);
      count++;
    }

    return count;
  }

  /**
   * 获取检查点链
   * @param checkpointId 检查点ID
   * @returns 检查点链（从最新到最旧）
   */
  async getCheckpointChain(checkpointId: string): Promise<AgentLoopCheckpoint[]> {
    const chain: AgentLoopCheckpoint[] = [];
    let currentId: string | undefined = checkpointId;

    while (currentId) {
      const checkpoint = await this.storage.getCheckpoint(currentId);
      if (!checkpoint) {
        break;
      }
      chain.push(checkpoint);
      currentId = checkpoint.previousCheckpointId;
    }

    return chain;
  }

  /**
   * 获取存储实例
   * @returns 存储实例
   */
  getStorage(): CheckpointStorage {
    return this.storage;
  }
}
