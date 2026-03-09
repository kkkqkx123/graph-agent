/**
 * PauseThreadCommand - 暂停线程命令
 */

import { BaseCommand, CommandValidationResult, validationSuccess, validationFailure } from '../../../shared/types/command.js';
import { APIDependencyManager } from '../../../shared/core/sdk-dependencies.js';

/**
 * 暂停线程命令
 */
export class PauseThreadCommand extends BaseCommand<void> {
  constructor(
    private readonly threadId: string,
    private readonly dependencies: APIDependencyManager
  ) {
    super();
  }

  protected async executeInternal(): Promise<void> {
    const lifecycleCoordinator = this.dependencies.getThreadLifecycleCoordinator();
    await lifecycleCoordinator.pauseThread(this.threadId);
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.threadId || this.threadId.trim().length === 0) {
      errors.push('线程ID不能为空');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
