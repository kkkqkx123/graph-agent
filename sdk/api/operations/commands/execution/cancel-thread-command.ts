/**
 * CancelThreadCommand - 取消线程命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../types/command';
import { ThreadLifecycleCoordinator } from '../../../../core/execution/coordinators/thread-lifecycle-coordinator';

/**
 * 取消线程命令
 */
export class CancelThreadCommand extends BaseCommand<void> {
  constructor(
    private readonly threadId: string,
    private readonly lifecycleCoordinator: ThreadLifecycleCoordinator
  ) {
    super();
  }

  protected async executeInternal(): Promise<void> {
    await this.lifecycleCoordinator.stopThread(this.threadId);
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
      name: 'CancelThreadCommand',
      description: '取消线程执行',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}