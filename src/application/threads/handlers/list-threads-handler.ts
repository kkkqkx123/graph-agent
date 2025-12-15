/**
 * 列出线程查询处理器
 */

import { ListThreadsQuery, ListThreadsQueryResult } from '../queries/list-threads-query';
import { ThreadService } from '../services/thread-service';

/**
 * 列出线程查询处理器
 */
export class ListThreadsHandler {
  constructor(private readonly threadService: ThreadService) {}

  async handle(query: ListThreadsQuery): Promise<ListThreadsQueryResult> {
    try {
      const threads = await this.threadService.listThreads(query.filters, query.limit);
      
      // 应用过滤条件
      let filteredThreads = threads;
      if (query.filters) {
        filteredThreads = this.applyFilters(threads, query.filters);
      }

      // 应用分页
      const page = query.offset && query.limit ? Math.floor(query.offset / query.limit) + 1 : 1;
      const pageSize = query.limit || filteredThreads.length;
      const startIndex = query.offset || 0;
      const endIndex = query.limit ? startIndex + query.limit : filteredThreads.length;
      const paginatedThreads = filteredThreads.slice(startIndex, endIndex);

      return new ListThreadsQueryResult(
        filteredThreads.length,
        page,
        pageSize,
        paginatedThreads
      );
    } catch (error) {
      console.error('列出线程查询处理失败:', error);
      throw error;
    }
  }

  private applyFilters(
    threads: Array<{
      threadId: string;
      sessionId: string;
      workflowId?: string;
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