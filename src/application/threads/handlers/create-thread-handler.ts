/**
 * 创建线程命令处理器
 */

import { CreateThreadCommand, CreateThreadCommandResult } from '../commands/create-thread-command';
import { ThreadService } from '../services/thread-service';

/**
 * 创建线程命令处理器
 */
export class CreateThreadHandler {
  constructor(private readonly threadService: ThreadService) {}

  async handle(command: CreateThreadCommand): Promise<CreateThreadCommandResult> {
    try {
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

      return new CreateThreadCommandResult(threadId, threadInfo.status);
    } catch (error) {
      console.error('创建线程命令处理失败:', error);
      throw error;
    }
  }
}