/**
 * 列出会话查询处理器
 */

import { injectable, inject } from 'inversify';
import { BaseQueryHandler } from '../../common/handlers/base-query-handler';
import { ListSessionsQuery, ListSessionsQueryResult } from '../queries/list-sessions-query';
import { SessionService } from '../services/session-service';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 列出会话查询处理器
 */
@injectable()
export class ListSessionsHandler extends BaseQueryHandler {
  constructor(
    @inject('Logger') logger: ILogger,
    @inject('SessionService') private readonly sessionService: SessionService
  ) {
    super(logger);
  }

  async handle(query: ListSessionsQuery): Promise<ListSessionsQueryResult> {
    try {
      this.logQueryStart('列出会话查询');

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

      this.logQuerySuccess('列出会话查询', { total: filteredSessions.length, returned: paginatedSessions.length });
      return new ListSessionsQueryResult(
        filteredSessions.length,
        page,
        pageSize,
        paginatedSessions
      );
    } catch (error) {
      this.logQueryError('列出会话查询', error as Error);
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