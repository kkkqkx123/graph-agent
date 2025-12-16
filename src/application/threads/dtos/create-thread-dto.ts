/**
 * 创建线程DTO
 */

/**
 * 创建线程请求DTO
 */
export class CreateThreadDto {
  readonly sessionId: string;
  readonly workflowId?: string;
  readonly priority?: number;
  readonly title?: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;

  constructor(data: any) {
    // 基本类型验证
    if (typeof data.sessionId !== 'string') {
      throw new Error('sessionId must be string');
    }
    if (data.workflowId && typeof data.workflowId !== 'string') {
      throw new Error('workflowId must be string');
    }
    if (data.priority && typeof data.priority !== 'number') {
      throw new Error('priority must be number');
    }
    if (data.title && typeof data.title !== 'string') {
      throw new Error('title must be string');
    }
    if (data.description && typeof data.description !== 'string') {
      throw new Error('description must be string');
    }
    if (data.metadata && typeof data.metadata !== 'object') {
      throw new Error('metadata must be object');
    }
    
    this.sessionId = data.sessionId;
    this.workflowId = data.workflowId;
    this.priority = data.priority;
    this.title = data.title;
    this.description = data.description;
    this.metadata = data.metadata;
  }
}

/**
 * 创建线程响应DTO
 */
export class CreateThreadResponseDto {
  readonly threadId: string;
  readonly status: string;

  constructor(threadId: string, status: string) {
    if (typeof threadId !== 'string') {
      throw new Error('threadId must be string');
    }
    if (typeof status !== 'string') {
      throw new Error('status must be string');
    }
    
    this.threadId = threadId;
    this.status = status;
  }
}