/**
 * 创建会话DTO接口定义
 */

export interface CreateSessionRequest {
  userId?: string;
  title?: string;
  config?: Record<string, unknown>;
}

export interface SessionConfig {
  value?: Record<string, unknown>;
  timeoutMinutes?: string;
  maxDuration?: string;
  maxMessages?: string;
}