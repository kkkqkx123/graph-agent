/**
 * 创建线程命令
 */

import { CreateThreadRequest, ThreadValidator } from '../dtos';

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

  constructor(data: any) {
    const request = ThreadValidator.validateCreateThreadRequest(data);
    this.sessionId = request.sessionId;
    this.workflowId = request.workflowId;
    this.priority = request.priority;
    this.title = request.title;
    this.description = request.description;
    this.metadata = request.metadata;
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