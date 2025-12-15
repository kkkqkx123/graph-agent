/**
 * 创建线程命令
 */

import { CreateThreadDto } from '../dtos/create-thread-dto';

/**
 * 创建线程命令
 */
export class CreateThreadCommand {
  readonly sessionId: string;
  readonly workflowId?: string;
  readonly priority?: number;
  readonly title?: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;

  constructor(dto: CreateThreadDto) {
    this.sessionId = dto.sessionId;
    this.workflowId = dto.workflowId;
    this.priority = dto.priority;
    this.title = dto.title;
    this.description = dto.description;
    this.metadata = dto.metadata;
  }
}

/**
 * 创建线程命令结果
 */
export class CreateThreadCommandResult {
  readonly threadId: string;
  readonly status: string;

  constructor(threadId: string, status: string) {
    this.threadId = threadId;
    this.status = status;
  }
}