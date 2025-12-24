/**
 * 删除会话命令处理器
 */

import { injectable, inject } from 'inversify';
import { BaseCommandHandler } from '../../common/handlers/base-command-handler';
import { DeleteSessionCommand, DeleteSessionCommandResult } from '../commands/delete-session-command';
import { SessionService } from '../services/session-service';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 删除会话命令处理器
 */
@injectable()
export class DeleteSessionHandler extends BaseCommandHandler {
  constructor(
    @inject('Logger') logger: ILogger,
    @inject('SessionService') private readonly sessionService: SessionService
  ) {
    super(logger);
  }

  async handle(command: DeleteSessionCommand): Promise<DeleteSessionCommandResult> {
    try {
      this.logCommandStart('删除会话命令', { sessionId: command.sessionId });

      const success = await this.sessionService.deleteSession(command.sessionId);
      
      this.logCommandSuccess('删除会话命令', { sessionId: command.sessionId, success });
      return new DeleteSessionCommandResult(success);
    } catch (error) {
      this.logCommandError('删除会话命令', error as Error, { sessionId: command.sessionId });
      throw error;
    }
  }
}