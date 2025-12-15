/**
 * 更新线程状态命令处理器
 */

import { UpdateThreadStatusCommand, UpdateThreadStatusCommandResult } from '../commands/update-thread-status-command';
import { ThreadService } from '../services/thread-service';

/**
 * 更新线程状态命令处理器
 */
export class UpdateThreadStatusHandler {
  constructor(private readonly threadService: ThreadService) {}

  async handle(command: UpdateThreadStatusCommand): Promise<UpdateThreadStatusCommandResult> {
    try {
      const success = await this.threadService.updateThreadStatus(
        command.threadId,
        command.status
      );

      // 获取更新后的线程信息
      const threadInfo = await this.threadService.getThreadInfo(command.threadId);
      
      if (!threadInfo) {
        throw new Error('线程状态更新后无法获取线程信息');
      }

      return new UpdateThreadStatusCommandResult(
        success,
        {
          threadId: threadInfo.threadId,
          sessionId: threadInfo.sessionId,
          status: threadInfo.status,
          priority: threadInfo.priority,
          title: threadInfo.title,
          createdAt: threadInfo.createdAt,
          startedAt: threadInfo.startedAt,
          completedAt: threadInfo.completedAt,
          errorMessage: threadInfo.errorMessage
        }
      );
    } catch (error) {
      console.error('更新线程状态命令处理失败:', error);
      throw error;
    }
  }
}