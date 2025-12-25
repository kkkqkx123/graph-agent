/**
 * 创建会话命令处理器
 */

import { injectable, inject } from 'inversify';
import { BaseCommandHandler } from '../../common/handlers/base-command-handler';
import { CreateSessionCommand, CreateSessionCommandResult } from '../commands/create-session-command';
import { SessionService } from '../services/session-service';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 创建会话命令处理器
 */
@injectable()
export class CreateSessionHandler extends BaseCommandHandler {
  constructor(
    @inject('Logger') logger: ILogger,
    @inject('SessionService') private readonly sessionService: SessionService
  ) {
    super(logger);
  }

  async handle(command: CreateSessionCommand): Promise<CreateSessionCommandResult> {
    try {
      this.logCommandStart('创建会话命令', {
        userId: command.userId,
        title: command.title
      });

      const sessionId = await this.sessionService.createSession({
        userId: command.userId,
        title: command.title,
        config: command.config
      });

      // 获取会话信息以获取状态
      const sessionInfo = await this.sessionService.getSessionInfo(sessionId);
      
      if (!sessionInfo) {
        throw new Error('会话创建后无法获取会话信息');
      }

      this.logCommandSuccess('创建会话命令', { sessionId });
      return new CreateSessionCommandResult(sessionId, sessionInfo.status.getValue());
    } catch (error) {
      this.logCommandError('创建会话命令', error as Error);
      throw error;
    }
  }
}