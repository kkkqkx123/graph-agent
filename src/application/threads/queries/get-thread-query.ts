/**
 * 获取线程查询
 */

/**
 * 获取线程查询
 */
export class GetThreadQuery {
  readonly threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }
}

/**
 * 获取线程查询结果
 */
export class GetThreadQueryResult {
  readonly threadInfo: {
    threadId: string;
    sessionId: string;
    workflowId?: string;
    status: string;
    priority: number;
    title?: string;
    description?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
  } | null;

  constructor(threadInfo: {
    threadId: string;
    sessionId: string;
    workflowId?: string;
    status: string;
    priority: number;
    title?: string;
    description?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
  } | null) {
    this.threadInfo = threadInfo;
  }
}