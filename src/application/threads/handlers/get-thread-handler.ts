/**
 * 获取线程查询处理器
 */

import { GetThreadQuery, GetThreadQueryResult } from '../queries/get-thread-query';
import { ThreadService } from '../services/thread-service';

/**
 * 获取线程查询处理器
 */
export class GetThreadHandler {
  constructor(private readonly threadService: ThreadService) {}

  async handle(query: GetThreadQuery): Promise<GetThreadQueryResult> {
    try {
      const threadInfo = await this.threadService.getThreadInfo(query.threadId);
      
      return new GetThreadQueryResult(threadInfo);
    } catch (error) {
      console.error('获取线程查询处理失败:', error);
      throw error;
    }
  }
}