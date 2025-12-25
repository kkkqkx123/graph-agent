/**
 * 获取会话查询
 */

import { Session } from '../../../domain/sessions/entities/session';

/**
 * 获取会话查询
 */
export class GetSessionQuery {
  readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }
}

/**
 * 获取会话查询结果
 */
export class GetSessionQueryResult {
  readonly session: Session | null;

  constructor(session: Session | null) {
    this.session = session;
  }
}