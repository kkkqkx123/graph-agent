/**
 * 会话信息DTO
 */

import { IsString, IsOptional, IsNumber } from 'class-validator';

/**
 * 会话信息DTO
 */
export class SessionInfoDto {
  @IsString()
  readonly sessionId: string;

  @IsOptional()
  @IsString()
  readonly userId?: string;

  @IsOptional()
  @IsString()
  readonly title?: string;

  @IsString()
  readonly status: string;

  @IsNumber()
  readonly messageCount: number;

  @IsString()
  readonly createdAt: string;

  @IsString()
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
  @IsNumber()
  readonly total: number;

  @IsNumber()
  readonly page: number;

  @IsNumber()
  readonly pageSize: number;

  readonly items: SessionInfoDto[];

  constructor(total: number, page: number, pageSize: number, items: SessionInfoDto[]) {
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
  @IsNumber()
  readonly total: number;

  @IsNumber()
  readonly active: number;

  @IsNumber()
  readonly suspended: number;

  @IsNumber()
  readonly terminated: number;

  constructor(total: number, active: number, suspended: number, terminated: number) {
    this.total = total;
    this.active = active;
    this.suspended = suspended;
    this.terminated = terminated;
  }
}