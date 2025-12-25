/**
 * 创建会话命令
 * 使用新的Zod-based DTO验证
 */

import { CreateSessionRequest, CreateSessionRequestDto } from '../dtos';
import { DtoValidationError } from '../../common/dto';

/**
 * 创建会话命令
 */
export class CreateSessionCommand {
  readonly userId?: string;
  readonly title?: string;
  readonly config?: Record<string, unknown>;

  constructor(data: unknown) {
    const dto = new CreateSessionRequestDto();
    const request = dto.validate(data);
    this.userId = request.userId;
    this.title = request.title;
    this.config = request.config;
  }

  /**
   * 安全创建命令（不抛出异常）
   */
  static safeCreate(data: unknown): { success: boolean; command?: CreateSessionCommand; error?: string } {
    try {
      const command = new CreateSessionCommand(data);
      return { success: true, command };
    } catch (error) {
      if (error instanceof DtoValidationError) {
        return {
          success: false,
          error: `创建会话请求验证失败: ${error.message}`
        };
      }
      return {
        success: false,
        error: `创建会话请求失败: ${error}`
      };
    }
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