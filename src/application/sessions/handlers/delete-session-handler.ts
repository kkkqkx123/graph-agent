/**
 * 删除会话命令处理器
 */

import { DeleteSessionCommand, DeleteSessionCommandResult } from '../commands/delete-session-command';
import { SessionService } from '../services/session-service';

/**
 * 删除会话命令处理器
 */
export class DeleteSessionHandler {
  constructor(private readonly sessionService: SessionService) {}

  async handle(command: DeleteSessionCommand): Promise<DeleteSessionCommandResult> {
    try {
      const success = await this.sessionService.deleteSession(command.sessionId);
      
      return new DeleteSessionCommandResult(success);
    } catch (error) {
      console.error('删除会话命令处理失败:', error);
      throw error;
    }
  }
}