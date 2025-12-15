/**
 * 线程信息DTO
 */

import { IsString, IsOptional, IsNumber } from 'class-validator';

/**
 * 线程信息DTO
 */
export class ThreadInfoDto {
  @IsString()
  readonly threadId: string;

  @IsString()
  readonly sessionId: string;

  @IsOptional()
  @IsString()
  readonly workflowId?: string;

  @IsString()
  readonly status: string;

  @IsNumber()
  readonly priority: number;

  @IsOptional()
  @IsString()
  readonly title?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsString()
  readonly createdAt: string;

  @IsOptional()
  @IsString()
  readonly startedAt?: string;

  @IsOptional()
  @IsString()
  readonly completedAt?: string;

  @IsOptional()
  @IsString()
  readonly errorMessage?: string;

  constructor(
    threadId: string,
    sessionId: string,
    status: string,
    priority: number,
    createdAt: string,
    workflowId?: string,
    title?: string,
    description?: string,
    startedAt?: string,
    completedAt?: string,
    errorMessage?: string
  ) {
    this.threadId = threadId;
    this.sessionId = sessionId;
    this.workflowId = workflowId;
    this.status = status;
    this.priority = priority;
    this.title = title;
    this.description = description;
    this.createdAt = createdAt;
    this.startedAt = startedAt;
    this.completedAt = completedAt;
    this.errorMessage = errorMessage;
  }
}

/**
 * 线程列表响应DTO
 */
export class ThreadListResponseDto {
  @IsNumber()
  readonly total: number;

  @IsNumber()
  readonly page: number;

  @IsNumber()
  readonly pageSize: number;

  readonly items: ThreadInfoDto[];

  constructor(total: number, page: number, pageSize: number, items: ThreadInfoDto[]) {
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.items = items;
  }
}

/**
 * 线程统计信息DTO
 */
export class ThreadStatisticsDto {
  @IsNumber()
  readonly total: number;

  @IsNumber()
  readonly pending: number;

  @IsNumber()
  readonly running: number;

  @IsNumber()
  readonly paused: number;

  @IsNumber()
  readonly completed: number;

  @IsNumber()
  readonly failed: number;

  @IsNumber()
  readonly cancelled: number;

  constructor(
    total: number,
    pending: number,
    running: number,
    paused: number,
    completed: number,
    failed: number,
    cancelled: number
  ) {
    this.total = total;
    this.pending = pending;
    this.running = running;
    this.paused = paused;
    this.completed = completed;
    this.failed = failed;
    this.cancelled = cancelled;
  }
}