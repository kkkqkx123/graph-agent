/**
 * 列出线程查询
 */

/**
 * 列出线程查询
 */
export class ListThreadsQuery {
  readonly filters?: Record<string, unknown>;
  readonly limit?: number;
  readonly offset?: number;

  constructor(filters?: Record<string, unknown>, limit?: number, offset?: number) {
    this.filters = filters;
    this.limit = limit;
    this.offset = offset;
  }
}

/**
 * 列出线程查询结果
 */
export class ListThreadsQueryResult {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly items: Array<{
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
  }>;

  constructor(
    total: number,
    page: number,
    pageSize: number,
    items: Array<{
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
    }>
  ) {
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.items = items;
  }
}