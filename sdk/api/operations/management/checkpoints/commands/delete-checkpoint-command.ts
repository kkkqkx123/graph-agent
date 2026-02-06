/**
 * DeleteCheckpointCommand - 删除检查点
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { CheckpointStateManager } from '../../../../../core/execution/managers/checkpoint-state-manager';
import { NotFoundError } from '../../../../../types/errors';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';
import { MemoryCheckpointStorage } from '../../../../../core/storage/memory-checkpoint-storage';

/**
 * 删除检查点参数
 */
export interface DeleteCheckpointParams {
  /** 检查点ID */
  checkpointId: string;
}

/**
 * DeleteCheckpointCommand - 删除检查点
 */
export class DeleteCheckpointCommand extends BaseCommand<void> {
  private stateManager: CheckpointStateManager;

  constructor(
    private readonly params: DeleteCheckpointParams,
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
      name: 'DeleteCheckpoint',
      description: '删除检查点',
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

    if (!this.params.checkpointId || this.params.checkpointId.trim() === '') {
      errors.push('checkpointId is required and cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<void>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

      const checkpoint = await this.stateManager.get(this.params.checkpointId);
      if (!checkpoint) {
        return failure(
          new NotFoundError(`Checkpoint not found: ${this.params.checkpointId}`, 'checkpoint', this.params.checkpointId).message,
          Date.now() - startTime
        );
      }
      
      await this.stateManager.delete(this.params.checkpointId);

      return success(undefined, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }
}