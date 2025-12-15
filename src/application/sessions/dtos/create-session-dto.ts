/**
 * 创建会话DTO
 */

import { IsOptional, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 会话配置DTO
 */
export class SessionConfigDto {
  @IsOptional()
  @IsObject()
  readonly value?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  readonly timeoutMinutes?: string;

  @IsOptional()
  @IsString()
  readonly maxDuration?: string;

  @IsOptional()
  @IsString()
  readonly maxMessages?: string;
}

/**
 * 创建会话请求DTO
 */
export class CreateSessionDto {
  @IsOptional()
  @IsString()
  readonly userId?: string;

  @IsOptional()
  @IsString()
  readonly title?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SessionConfigDto)
  readonly config?: SessionConfigDto;
}

/**
 * 创建会话响应DTO
 */
export class CreateSessionResponseDto {
  @IsString()
  readonly sessionId: string;

  @IsString()
  readonly status: string;

  constructor(sessionId: string, status: string) {
    this.sessionId = sessionId;
    this.status = status;
  }
}