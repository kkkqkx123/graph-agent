/**
 * 获取会话查询处理器
 */

import { GetSessionQuery, GetSessionQueryResult } from '../queries/get-session-query';
import { SessionService } from '../services/session-service';

/**
 * 获取会话查询处理器
 */
export class GetSessionHandler {
  constructor(private readonly sessionService: SessionService) {}

  async handle(query: GetSessionQuery): Promise<GetSessionQueryResult> {
    try {
      const sessionInfo = await this.sessionService.getSessionInfo(query.sessionId);
      
      return new GetSessionQueryResult(sessionInfo);
    } catch (error) {
      console.error('获取会话查询处理失败:', error);
      throw error;
    }
  }
}