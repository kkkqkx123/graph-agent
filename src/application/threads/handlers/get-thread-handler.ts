/**
 * 获取线程查询处理器
 */

import { injectable, inject } from 'inversify';
import { BaseQueryHandler } from '../../common/handlers/base-query-handler';
import { GetThreadQuery, GetThreadQueryResult } from '../queries/get-thread-query';
import { ThreadService } from '../services/thread-service';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 获取线程查询处理器
 */
@injectable()
export class GetThreadHandler extends BaseQueryHandler {
  constructor(
    @inject('Logger') logger: ILogger,
    @inject('ThreadService') private readonly threadService: ThreadService
  ) {
    super(logger);
  }

  async handle(query: GetThreadQuery): Promise<GetThreadQueryResult> {
    try {
      this.logQueryStart('获取线程查询', { threadId: query.threadId });

      const threadInfo = await this.threadService.getThreadInfo(query.threadId);
      
      this.logQuerySuccess('获取线程查询', { threadId: query.threadId, found: threadInfo !== null });
      return new GetThreadQueryResult(threadInfo);
    } catch (error) {
      this.logQueryError('获取线程查询', error as Error, { threadId: query.threadId });
      throw error;
    }
  }
}