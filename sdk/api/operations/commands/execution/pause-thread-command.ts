/**
 * PauseThreadCommand - 暂停线程命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../core/command';
import { success, failure, ExecutionResult } from '../../../types/execution-result';
import { ThreadLifecycleCoordinator } from '../../../../core/execution/coordinators/thread-lifecycle-coordinator';

/**
 * 暂停线程命令
 */
export class PauseThreadCommand extends BaseCommand<void> {
  constructor(
    private readonly threadId: string,
    private readonly lifecycleCoordinator: ThreadLifecycleCoordinator
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<void>> {
    try {
      await this.lifecycleCoordinator.pauseThread(this.threadId);
      return success<void>(undefined, this.getExecutionTime());
    } catch (error) {
      return failure<void>(
        error instanceof Error ? error.message : String(error),
        this.getExecutionTime()
      );
    }
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.threadId || this.threadId.trim().length === 0) {
      errors.push('线程ID不能为空');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'PauseThreadCommand',
      description: '暂停线程执行',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}