/**
 * 获取会话查询处理器
 */

import { injectable, inject } from 'inversify';
import { BaseQueryHandler } from '../../common/handlers/base-query-handler';
import { GetSessionQuery, GetSessionQueryResult } from '../queries/get-session-query';
import { SessionService } from '../services/session-service';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 获取会话查询处理器
 */
@injectable()
export class GetSessionHandler extends BaseQueryHandler {
  constructor(
    @inject('Logger') logger: ILogger,
    @inject('SessionService') private readonly sessionService: SessionService
  ) {
    super(logger);
  }

  async handle(query: GetSessionQuery): Promise<GetSessionQueryResult> {
    try {
      this.logQueryStart('获取会话查询', { sessionId: query.sessionId });

      const sessionInfo = await this.sessionService.getSessionInfo(query.sessionId);
      
      this.logQuerySuccess('获取会话查询', { sessionId: query.sessionId, found: sessionInfo !== null });
      return new GetSessionQueryResult(sessionInfo);
    } catch (error) {
      this.logQueryError('获取会话查询', error as Error, { sessionId: query.sessionId });
      throw error;
    }
  }
}