/**
 * 删除线程命令处理器
 */

import { DeleteThreadCommand, DeleteThreadCommandResult } from '../commands/delete-thread-command';
import { ThreadService } from '../services/thread-service';

/**
 * 删除线程命令处理器
 */
export class DeleteThreadHandler {
  constructor(private readonly threadService: ThreadService) {}

  async handle(command: DeleteThreadCommand): Promise<DeleteThreadCommandResult> {
    try {
      const success = await this.threadService.deleteThread(command.threadId);
      
      return new DeleteThreadCommandResult(success);
    } catch (error) {
      console.error('删除线程命令处理失败:', error);
      throw error;
    }
  }
}