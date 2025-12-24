/**
 * 列出线程查询处理器
 */

import { injectable, inject } from 'inversify';
import { BaseQueryHandler } from '../../common/handlers/base-query-handler';
import { ListThreadsQuery, ListThreadsQueryResult } from '../queries/list-threads-query';
import { ThreadService } from '../services/thread-service';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 列出线程查询处理器
 */
@injectable()
export class ListThreadsHandler extends BaseQueryHandler {
  constructor(
    @inject('Logger') logger: ILogger,
    @inject('ThreadService') private readonly threadService: ThreadService
  ) {
    super(logger);
  }

  async handle(query: ListThreadsQuery): Promise<ListThreadsQueryResult> {
    try {
      this.logQueryStart('列出线程查询');

      const threads = await this.threadService.listThreads(query.filters, query.limit);
      
      // 确保所有线程都有workflowId，将undefined转换为空字符串
      const threadsWithWorkflowId = threads.map(thread => ({
        ...thread,
        workflowId: thread.workflowId || ''
      }));
      
      // 应用过滤条件
      let filteredThreads = threadsWithWorkflowId;
      if (query.filters) {
        filteredThreads = this.applyFilters(threadsWithWorkflowId, query.filters);
      }

      // 应用分页
      const page = query.offset && query.limit ? Math.floor(query.offset / query.limit) + 1 : 1;
      const pageSize = query.limit || filteredThreads.length;
      const startIndex = query.offset || 0;
      const endIndex = query.limit ? startIndex + query.limit : filteredThreads.length;
      const paginatedThreads = filteredThreads.slice(startIndex, endIndex);

      this.logQuerySuccess('列出线程查询', { total: filteredThreads.length, returned: paginatedThreads.length });
      return new ListThreadsQueryResult(
        filteredThreads.length,
        page,
        pageSize,
        paginatedThreads
      );
    } catch (error) {
      this.logQueryError('列出线程查询', error as Error);
      throw error;
    }
  }

  private applyFilters(
    threads: Array<{
      threadId: string;
      sessionId: string;
      workflowId: string;
      status: string;
      priority: number;
      title?: string;
      description?: string;
      createdAt: string;
      startedAt?: string;
      completedAt?: string;
      errorMessage?: string;
    }>,
    filters: Record<string, unknown>
  ) {
    return threads.filter(thread => {
      for (const [key, value] of Object.entries(filters)) {
        switch (key) {
          case 'sessionId':
            if (thread.sessionId !== value) return false;
            break;
          case 'status':
            if (thread.status !== value) return false;
            break;
          case 'workflowId':
            if (thread.workflowId !== value) return false;
            break;
          case 'title':
            if (thread.title !== value) return false;
            break;
          default:
            // 忽略未知的过滤条件
            break;
        }
      }
      return true;
    });
  }
}