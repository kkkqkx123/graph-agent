/**
 * 创建线程命令处理器
 */

import { injectable, inject } from 'inversify';
import { BaseCommandHandler } from '../../common/handlers/base-command-handler';
import { CreateThreadCommand, CreateThreadCommandResult } from '../commands/create-thread-command';
import { ThreadService } from '../services/thread-service';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 创建线程命令处理器
 */
@injectable()
export class CreateThreadHandler extends BaseCommandHandler {
  constructor(
    @inject('Logger') logger: ILogger,
    @inject('ThreadService') private readonly threadService: ThreadService
  ) {
    super(logger);
  }

  async handle(command: CreateThreadCommand): Promise<CreateThreadCommandResult> {
    try {
      this.logCommandStart('创建线程命令', {
        sessionId: command.sessionId,
        workflowId: command.workflowId
      });

      const threadId = await this.threadService.createThread({
        sessionId: command.sessionId,
        workflowId: command.workflowId || '',
        priority: command.priority,
        title: command.title,
        description: command.description,
        metadata: command.metadata
      });

      // 获取线程信息以获取状态
      const threadInfo = await this.threadService.getThreadInfo(threadId);
      
      if (!threadInfo) {
        throw new Error('线程创建后无法获取线程信息');
      }

      this.logCommandSuccess('创建线程命令', { threadId });
      return new CreateThreadCommandResult(threadId, threadInfo.status);
    } catch (error) {
      this.logCommandError('创建线程命令', error as Error);
      throw error;
    }
  }
}