/**
 * ResumeThreadCommand - 恢复线程命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../../core/command';
import { success, failure, ExecutionResult } from '../../../../types/execution-result';
import type { ThreadResult } from '../../../../../types/thread';
import { ThreadLifecycleCoordinator } from '../../../../../core/execution/coordinators/thread-lifecycle-coordinator';

/**
 * 恢复线程命令
 */
export class ResumeThreadCommand extends BaseCommand<ThreadResult> {
  constructor(
    private readonly threadId: string,
    private readonly lifecycleCoordinator: ThreadLifecycleCoordinator
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<ThreadResult>> {
    try {
      const result = await this.lifecycleCoordinator.resumeThread(this.threadId);
      return success(result, this.getExecutionTime());
    } catch (error) {
      return failure<ThreadResult>(
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
      name: 'ResumeThreadCommand',
      description: '恢复线程执行',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}