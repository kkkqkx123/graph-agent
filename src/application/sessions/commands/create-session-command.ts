/**
 * 创建会话命令
 */

import { CreateSessionRequest, SessionValidator } from '../dtos';

/**
 * 创建会话命令
 */
export class CreateSessionCommand {
  readonly userId?: string;
  readonly title?: string;
  readonly config?: Record<string, unknown>;

  constructor(data: any) {
    const request = SessionValidator.validateCreateSessionRequest(data);
    this.userId = request.userId;
    this.title = request.title;
    this.config = request.config;
  }
}

/**
 * 创建会话命令结果
 */
export class CreateSessionCommandResult {
  readonly sessionId: string;
  readonly status: string;

  constructor(sessionId: string, status: string) {
    this.sessionId = sessionId;
    this.status = status;
  }
}