/**
 * 列出会话查询处理器
 */

import { ListSessionsQuery, ListSessionsQueryResult } from '../queries/list-sessions-query';
import { SessionService } from '../services/session-service';

/**
 * 列出会话查询处理器
 */
export class ListSessionsHandler {
  constructor(private readonly sessionService: SessionService) {}

  async handle(query: ListSessionsQuery): Promise<ListSessionsQueryResult> {
    try {
      const sessions = await this.sessionService.listSessions();
      
      // 应用过滤条件
      let filteredSessions = sessions;
      if (query.filters) {
        filteredSessions = this.applyFilters(sessions, query.filters);
      }

      // 应用分页
      const page = query.offset && query.limit ? Math.floor(query.offset / query.limit) + 1 : 1;
      const pageSize = query.limit || filteredSessions.length;
      const startIndex = query.offset || 0;
      const endIndex = query.limit ? startIndex + query.limit : filteredSessions.length;
      const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

      return new ListSessionsQueryResult(
        filteredSessions.length,
        page,
        pageSize,
        paginatedSessions
      );
    } catch (error) {
      console.error('列出会话查询处理失败:', error);
      throw error;
    }
  }

  private applyFilters(
    sessions: Array<{
      sessionId: string;
      userId?: string;
      title?: string;
      status: string;
      messageCount: number;
      createdAt: string;
      lastActivityAt: string;
    }>,
    filters: Record<string, unknown>
  ) {
    return sessions.filter(session => {
      for (const [key, value] of Object.entries(filters)) {
        switch (key) {
          case 'userId':
            if (session.userId !== value) return false;
            break;
          case 'status':
            if (session.status !== value) return false;
            break;
          case 'title':
            if (session.title !== value) return false;
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