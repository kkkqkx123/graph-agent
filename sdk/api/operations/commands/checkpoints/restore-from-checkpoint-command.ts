/**
 * RestoreFromCheckpointCommand - 从检查点恢复线程
 */

import { BaseCommand } from '../../../types/command';
import { CommandValidationResult, validationSuccess, validationFailure } from '../../../types/command';
import { CheckpointCoordinator } from '../../../../core/execution/coordinators/checkpoint-coordinator';
import type { Thread } from '../../../../types/thread';
import { globalMessageStorage } from '../../../../core/services/global-message-storage';
import type { APIDependencies } from '../../../core/api-dependencies';

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
  constructor(
    private readonly params: RestoreFromCheckpointParams,
    private readonly dependencies: APIDependencies
  ) {
    super();
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
      errors.push('检查点ID不能为空');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  /**
   * 执行命令
   */
  protected async executeInternal(): Promise<Thread> {
    const dependencies = {
      threadRegistry: this.dependencies.getThreadRegistry(),
      checkpointStateManager: this.dependencies.getCheckpointStateManager(),
      workflowRegistry: this.dependencies.getWorkflowRegistry(),
      globalMessageStorage
    };

    const threadContext = await CheckpointCoordinator.restoreFromCheckpoint(
      this.params.checkpointId,
      dependencies
    );
    return threadContext.thread;
  }
}