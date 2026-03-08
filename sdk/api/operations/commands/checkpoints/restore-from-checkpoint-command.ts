/**
 * RestoreFromCheckpointCommand - 从检查点恢复线程
 */

import { BaseCommand, CommandValidationResult, validationSuccess, validationFailure } from '../../../types/command.js';
import { CheckpointCoordinator } from '../../../../graph/execution/coordinators/checkpoint-coordinator.js';
import type { Thread } from '@modular-agent/types';
import { getContainer } from '../../../../core/di/index.js';
import type { APIDependencyManager } from '../../../core/sdk-dependencies.js';

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
    private readonly dependencies: APIDependencyManager
  ) {
    super();
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
    const container = getContainer();
    const dependencies = {
      threadRegistry: this.dependencies.getThreadRegistry(),
      checkpointStateManager: this.dependencies.getCheckpointStateManager(),
      workflowRegistry: this.dependencies.getWorkflowRegistry(),
      graphRegistry: this.dependencies.getGraphRegistry()
    };

    const threadContext = await CheckpointCoordinator.restoreFromCheckpoint(
      this.params.checkpointId,
      dependencies
    );
    return threadContext.thread;
  }
}