/**
 * 线程信息DTO
 */

/**
 * 线程信息DTO
 */
export class ThreadInfoDto {
  readonly threadId: string;
  readonly sessionId: string;
  readonly workflowId?: string;
  readonly status: string;
  readonly priority: number;
  readonly title?: string;
  readonly description?: string;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
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
    // 基本类型验证
    if (typeof threadId !== 'string') {
      throw new Error('threadId must be string');
    }
    if (typeof sessionId !== 'string') {
      throw new Error('sessionId must be string');
    }
    if (typeof status !== 'string') {
      throw new Error('status must be string');
    }
    if (typeof priority !== 'number') {
      throw new Error('priority must be number');
    }
    if (typeof createdAt !== 'string') {
      throw new Error('createdAt must be string');
    }
    if (workflowId && typeof workflowId !== 'string') {
      throw new Error('workflowId must be string');
    }
    if (title && typeof title !== 'string') {
      throw new Error('title must be string');
    }
    if (description && typeof description !== 'string') {
      throw new Error('description must be string');
    }
    if (startedAt && typeof startedAt !== 'string') {
      throw new Error('startedAt must be string');
    }
    if (completedAt && typeof completedAt !== 'string') {
      throw new Error('completedAt must be string');
    }
    if (errorMessage && typeof errorMessage !== 'string') {
      throw new Error('errorMessage must be string');
    }
    
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
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly items: ThreadInfoDto[];

  constructor(total: number, page: number, pageSize: number, items: ThreadInfoDto[]) {
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
 * 线程统计信息DTO
 */
export class ThreadStatisticsDto {
  readonly total: number;
  readonly pending: number;
  readonly running: number;
  readonly paused: number;
  readonly completed: number;
  readonly failed: number;
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
    if (typeof total !== 'number') {
      throw new Error('total must be number');
    }
    if (typeof pending !== 'number') {
      throw new Error('pending must be number');
    }
    if (typeof running !== 'number') {
      throw new Error('running must be number');
    }
    if (typeof paused !== 'number') {
      throw new Error('paused must be number');
    }
    if (typeof completed !== 'number') {
      throw new Error('completed must be number');
    }
    if (typeof failed !== 'number') {
      throw new Error('failed must be number');
    }
    if (typeof cancelled !== 'number') {
      throw new Error('cancelled must be number');
    }
    
    this.total = total;
    this.pending = pending;
    this.running = running;
    this.paused = paused;
    this.completed = completed;
    this.failed = failed;
    this.cancelled = cancelled;
  }
}