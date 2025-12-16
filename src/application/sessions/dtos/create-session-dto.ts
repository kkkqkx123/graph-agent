/**
 * 创建会话DTO
 */

/**
 * 会话配置DTO
 */
export class SessionConfigDto {
  readonly value?: Record<string, unknown>;
  readonly timeoutMinutes?: string;
  readonly maxDuration?: string;
  readonly maxMessages?: string;

  constructor(data?: any) {
    if (data) {
      this.value = data.value;
      this.timeoutMinutes = data.timeoutMinutes;
      this.maxDuration = data.maxDuration;
      this.maxMessages = data.maxMessages;
    }
  }
}

/**
 * 创建会话请求DTO
 */
export class CreateSessionDto {
  readonly userId?: string;
  readonly title?: string;
  readonly config?: SessionConfigDto;

  constructor(data: any) {
    // 基本类型验证
    if (data.userId && typeof data.userId !== 'string') {
      throw new Error('userId must be string');
    }
    if (data.title && typeof data.title !== 'string') {
      throw new Error('title must be string');
    }
    
    this.userId = data.userId;
    this.title = data.title;
    this.config = data.config ? new SessionConfigDto(data.config) : undefined;
  }
}

/**
 * 创建会话响应DTO
 */
export class CreateSessionResponseDto {
  readonly sessionId: string;
  readonly status: string;

  constructor(sessionId: string, status: string) {
    this.sessionId = sessionId;
    this.status = status;
  }
}