/**
 * GetCheckpointsQuery - 获取检查点列表
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../core/query';
import { CheckpointStateManager } from '../../../../core/execution/managers/checkpoint-state-manager';
import type { Checkpoint } from '../../../../types/checkpoint';
import type { CheckpointFilter } from '../../../types/management-types';
import { MemoryCheckpointStorage } from '../../../../core/storage/memory-checkpoint-storage';

/**
 * 获取检查点列表参数
 */
export interface GetCheckpointsParams {
  /** 过滤条件 */
  filter?: CheckpointFilter;
}

/**
 * GetCheckpointsQuery - 获取检查点列表
 */
export class GetCheckpointsQuery extends BaseQuery<Checkpoint[]> {
  private stateManager: CheckpointStateManager;

  constructor(
    private readonly params: GetCheckpointsParams,
    stateManager?: CheckpointStateManager
  ) {
    super();

    if (stateManager) {
      this.stateManager = stateManager;
    } else {
      // 创建默认的检查点状态管理器
      const storage = new MemoryCheckpointStorage();
      this.stateManager = new CheckpointStateManager(storage);
    }
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'GetCheckpoints',
      description: '获取检查点列表',
      category: 'checkpoints',
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  /**
   * 执行查询
   */
  async execute() {
    try {
      // 获取所有检查点ID
      const checkpointIds = await this.stateManager.list();
      
      // 加载所有检查点
      const checkpoints: Checkpoint[] = [];
      for (const checkpointId of checkpointIds) {
        const checkpoint = await this.stateManager.get(checkpointId);
        if (checkpoint) {
          checkpoints.push(checkpoint);
        }
      }
      
      // 应用过滤条件
      if (!this.params.filter) {
        return querySuccess(checkpoints, this.getExecutionTime());
      }
      
      const filteredCheckpoints = checkpoints.filter(cp => this.applyFilter(cp, this.params.filter!));
      return querySuccess(filteredCheckpoints, this.getExecutionTime());
    } catch (error) {
      return queryFailure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.getExecutionTime()
      );
    }
  }

  /**
   * 应用过滤条件
   */
  private applyFilter(checkpoint: Checkpoint, filter: CheckpointFilter): boolean {
    if (filter.threadId && checkpoint.threadId !== filter.threadId) {
      return false;
    }
    if (filter.workflowId && checkpoint.workflowId !== filter.workflowId) {
      return false;
    }
    if (filter.startTimeFrom && checkpoint.timestamp < filter.startTimeFrom) {
      return false;
    }
    if (filter.startTimeTo && checkpoint.timestamp > filter.startTimeTo) {
      return false;
    }
    if (filter.tags && checkpoint.metadata?.tags) {
      if (!filter.tags.every(tag => checkpoint.metadata?.tags?.includes(tag))) {
        return false;
      }
    }
    return true;
  }
}