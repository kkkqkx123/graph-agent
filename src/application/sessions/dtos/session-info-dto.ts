/**
 * 会话信息DTO
 */

/**
 * 会话信息DTO
 */
export class SessionInfoDto {
  readonly sessionId: string;
  readonly userId?: string;
  readonly title?: string;
  readonly status: string;
  readonly messageCount: number;
  readonly createdAt: string;
  readonly lastActivityAt: string;

  constructor(
    sessionId: string,
    status: string,
    messageCount: number,
    createdAt: string,
    lastActivityAt: string,
    userId?: string,
    title?: string
  ) {
    // 基本类型验证
    if (typeof sessionId !== 'string') {
      throw new Error('sessionId must be string');
    }
    if (typeof status !== 'string') {
      throw new Error('status must be string');
    }
    if (typeof messageCount !== 'number') {
      throw new Error('messageCount must be number');
    }
    if (typeof createdAt !== 'string') {
      throw new Error('createdAt must be string');
    }
    if (typeof lastActivityAt !== 'string') {
      throw new Error('lastActivityAt must be string');
    }
    if (userId && typeof userId !== 'string') {
      throw new Error('userId must be string');
    }
    if (title && typeof title !== 'string') {
      throw new Error('title must be string');
    }
    
    this.sessionId = sessionId;
    this.userId = userId;
    this.title = title;
    this.status = status;
    this.messageCount = messageCount;
    this.createdAt = createdAt;
    this.lastActivityAt = lastActivityAt;
  }
}

/**
 * 会话列表响应DTO
 */
export class SessionListResponseDto {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly items: SessionInfoDto[];

  constructor(total: number, page: number, pageSize: number, items: SessionInfoDto[]) {
    if (typeof total !== 'number') {
      throw new Error('total must be number');
    }
    if (typeof page !== 'number') {
      throw new Error('page must be number');
    }
    if (typeof pageSize !== 'number') {
      throw new Error('pageSize must be number');
    }
    if (!Array.isArray(items)) {
      throw new Error('items must be array');
    }
    
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.items = items;
  }
}

/**
 * 会话统计信息DTO
 */
export class SessionStatisticsDto {
  readonly total: number;
  readonly active: number;
  readonly suspended: number;
  readonly terminated: number;

  constructor(total: number, active: number, suspended: number, terminated: number) {
    if (typeof total !== 'number') {
      throw new Error('total must be number');
    }
    if (typeof active !== 'number') {
      throw new Error('active must be number');
    }
    if (typeof suspended !== 'number') {
      throw new Error('suspended must be number');
    }
    if (typeof terminated !== 'number') {
      throw new Error('terminated must be number');
    }
    
    this.total = total;
    this.active = active;
    this.suspended = suspended;
    this.terminated = terminated;
  }
}