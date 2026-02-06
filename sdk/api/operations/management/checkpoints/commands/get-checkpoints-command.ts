/**
 * GetCheckpointsCommand - 获取检查点列表
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { CheckpointStateManager } from '../../../../../core/execution/managers/checkpoint-state-manager';
import type { Checkpoint } from '../../../../../types/checkpoint';
import type { CheckpointFilter } from '../../../../types/management-types';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';
import { MemoryCheckpointStorage } from '../../../../../core/storage/memory-checkpoint-storage';

/**
 * 获取检查点列表参数
 */
export interface GetCheckpointsParams {
  /** 过滤条件 */
  filter?: CheckpointFilter;
}

/**
 * GetCheckpointsCommand - 获取检查点列表
 */
export class GetCheckpointsCommand extends BaseCommand<Checkpoint[]> {
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
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'GetCheckpoints',
      description: '获取检查点列表',
      category: 'management' as const,
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  /**
   * 验证命令参数
   */
  validate(): CommandValidationResult {
    const errors: string[] = [];

    // 无需验证参数

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<Checkpoint[]>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

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
        return success(checkpoints, Date.now() - startTime);
      }
      
      const filteredCheckpoints = checkpoints.filter(cp => this.applyFilter(cp, this.params.filter!));
      return success(filteredCheckpoints, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
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