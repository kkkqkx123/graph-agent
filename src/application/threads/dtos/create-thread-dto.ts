/**
 * 创建线程DTO
 */

import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

/**
 * 创建线程请求DTO
 */
export class CreateThreadDto {
  @IsString()
  readonly sessionId: string;

  @IsOptional()
  @IsString()
  readonly workflowId?: string;

  @IsOptional()
  @IsNumber()
  readonly priority?: number;

  @IsOptional()
  @IsString()
  readonly title?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsObject()
  readonly metadata?: Record<string, unknown>;
}

/**
 * 创建线程响应DTO
 */
export class CreateThreadResponseDto {
  @IsString()
  readonly threadId: string;

  @IsString()
  readonly status: string;

  constructor(threadId: string, status: string) {
    this.threadId = threadId;
    this.status = status;
  }
}