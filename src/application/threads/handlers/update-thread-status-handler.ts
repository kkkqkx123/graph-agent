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
      let threadInfo;

      // 根据状态调用相应的方法
      switch (command.status) {
        case 'running':
          threadInfo = await this.threadService.startThread(command.threadId, command.userId);
          break;
        case 'paused':
          threadInfo = await this.threadService.pauseThread(command.threadId, command.userId, command.reason);
          break;
        case 'resumed':
          threadInfo = await this.threadService.resumeThread(command.threadId, command.userId, command.reason);
          break;
        case 'completed':
          threadInfo = await this.threadService.completeThread(command.threadId, command.userId, command.reason);
          break;
        case 'failed':
          threadInfo = await this.threadService.failThread(command.threadId, command.reason || '线程执行失败', command.userId);
          break;
        case 'cancelled':
          threadInfo = await this.threadService.cancelThread(command.threadId, command.userId, command.reason);
          break;
        default:
          throw new Error(`不支持的线程状态: ${command.status}`);
      }

      if (!threadInfo) {
        throw new Error('线程状态更新后无法获取线程信息');
      }

      return new UpdateThreadStatusCommandResult(
        true,
        {
          threadId: threadInfo.threadId,
          sessionId: threadInfo.sessionId,
          workflowId: threadInfo.workflowId,
          status: threadInfo.status,
          priority: threadInfo.priority,
          title: threadInfo.title,
          description: threadInfo.description,
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