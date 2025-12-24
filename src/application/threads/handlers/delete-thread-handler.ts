/**
 * 删除线程命令处理器
 */

import { injectable, inject } from 'inversify';
import { BaseCommandHandler } from '../../common/handlers/base-command-handler';
import { DeleteThreadCommand, DeleteThreadCommandResult } from '../commands/delete-thread-command';
import { ThreadService } from '../services/thread-service';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 删除线程命令处理器
 */
@injectable()
export class DeleteThreadHandler extends BaseCommandHandler {
  constructor(
    @inject('Logger') logger: ILogger,
    @inject('ThreadService') private readonly threadService: ThreadService
  ) {
    super(logger);
  }

  async handle(command: DeleteThreadCommand): Promise<DeleteThreadCommandResult> {
    try {
      this.logCommandStart('删除线程命令', { threadId: command.threadId });

      const success = await this.threadService.deleteThread(command.threadId);
      
      this.logCommandSuccess('删除线程命令', { threadId: command.threadId, success });
      return new DeleteThreadCommandResult(success);
    } catch (error) {
      this.logCommandError('删除线程命令', error as Error, { threadId: command.threadId });
      throw error;
    }
  }
}