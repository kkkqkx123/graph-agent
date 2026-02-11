/**
 * ResumeThreadCommand - 恢复线程命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '@modular-agent/sdk/api/types/command';
import type { ThreadResult } from '@modular-agent/types/thread';
import { ThreadLifecycleCoordinator } from '../../core/execution/coordinators/thread-lifecycle-coordinator';

/**
 * 恢复线程命令
 */
export class ResumeThreadCommand extends BaseCommand<ThreadResult> {
  constructor(
    private readonly threadId: string,
    private readonly lifecycleCoordinator: ThreadLifecycleCoordinator,
  ) {
    super();
  }

  protected async executeInternal(): Promise<ThreadResult> {
    const result = await this.lifecycleCoordinator.resumeThread(this.threadId);
    return result;
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