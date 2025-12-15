/**
 * 获取会话查询
 */

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
  readonly sessionInfo: {
    sessionId: string;
    userId?: string;
    title?: string;
    status: string;
    messageCount: number;
    createdAt: string;
    lastActivityAt: string;
  } | null;

  constructor(sessionInfo: {
    sessionId: string;
    userId?: string;
    title?: string;
    status: string;
    messageCount: number;
    createdAt: string;
    lastActivityAt: string;
  } | null) {
    this.sessionInfo = sessionInfo;
  }
}