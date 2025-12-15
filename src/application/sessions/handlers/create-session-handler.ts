/**
 * 创建会话命令处理器
 */

import { CreateSessionCommand, CreateSessionCommandResult } from '../commands/create-session-command';
import { SessionService } from '../services/session-service';

/**
 * 创建会话命令处理器
 */
export class CreateSessionHandler {
  constructor(private readonly sessionService: SessionService) {}

  async handle(command: CreateSessionCommand): Promise<CreateSessionCommandResult> {
    try {
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

      return new CreateSessionCommandResult(sessionId, sessionInfo.status);
    } catch (error) {
      console.error('创建会话命令处理失败:', error);
      throw error;
    }
  }
}