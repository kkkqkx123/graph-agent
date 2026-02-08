/**
 * RestoreFromCheckpointCommand - 从检查点恢复线程
 */

import { BaseCommand } from '../../../types/command';
import { CommandValidationResult } from '../../../types/command';
import { CheckpointCoordinator } from '../../../../core/execution/coordinators/checkpoint-coordinator';
import { CheckpointStateManager } from '../../../../core/execution/managers/checkpoint-state-manager';
import type { Thread } from '../../../../types/thread';
import { NotFoundError } from '../../../../types/errors';
import type { ExecutionResult } from '../../../types/execution-result';
import { success, failure } from '../../../types/execution-result';
import { MemoryCheckpointStorage } from '../../../../core/storage/memory-checkpoint-storage';
import { globalMessageStorage } from '../../../../core/services/global-message-storage';
import { SingletonRegistry } from '../../../../core/execution/context/singleton-registry';

/**
 * 从检查点恢复参数
 */
export interface RestoreFromCheckpointParams {
  /** 检查点ID */
  checkpointId: string;
}

/**
 * RestoreFromCheckpointCommand - 从检查点恢复线程
 */
export class RestoreFromCheckpointCommand extends BaseCommand<Thread> {
  private stateManager: CheckpointStateManager;

  constructor(
    private readonly params: RestoreFromCheckpointParams,
    stateManager?: CheckpointStateManager
  ) {
    super();

    if (stateManager) {
      this.stateManager = stateManager;
    } else {
      // 创建默认的检查点管理组件
      const storage = new MemoryCheckpointStorage();
      this.stateManager = new CheckpointStateManager(storage);
    }
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'RestoreFromCheckpoint',
      description: '从检查点恢复线程',
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
  async execute(): Promise<ExecutionResult<Thread>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

      try {
        // 从SingletonRegistry获取全局服务
        SingletonRegistry.initialize();
        const threadRegistry = SingletonRegistry.get<any>('threadRegistry');
        const workflowRegistry = SingletonRegistry.get<any>('workflowRegistry');

        const dependencies = {
          threadRegistry,
          checkpointStateManager: this.stateManager,
          workflowRegistry,
          globalMessageStorage
        };

        const threadContext = await CheckpointCoordinator.restoreFromCheckpoint(
          this.params.checkpointId,
          dependencies
        );
        return success(threadContext.thread, Date.now() - startTime);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return failure(
            new NotFoundError(`Checkpoint not found: ${this.params.checkpointId}`, 'checkpoint', this.params.checkpointId).message,
            Date.now() - startTime
          );
        }
        throw error;
      }
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }
}