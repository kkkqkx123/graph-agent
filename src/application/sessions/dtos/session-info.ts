/**
 * 会话信息DTO接口定义
 */

export interface SessionInfo {
  sessionId: string;
  userId?: string;
  title?: string;
  status: string;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface SessionStatistics {
  total: number;
  active: number;
  suspended: number;
  terminated: number;
}