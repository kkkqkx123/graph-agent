/**
 * 创建会话命令
 */

import { CreateSessionDto } from '../dtos/create-session-dto';

/**
 * 创建会话命令
 */
export class CreateSessionCommand {
  readonly userId?: string;
  readonly title?: string;
  readonly config?: Record<string, unknown>;

  constructor(data: any) {
    const dto = new CreateSessionDto(data);
    this.userId = dto.userId;
    this.title = dto.title;
    this.config = dto.config?.value;
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