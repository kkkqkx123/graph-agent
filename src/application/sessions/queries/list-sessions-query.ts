/**
 * 列出会话查询
 */

/**
 * 列出会话查询
 */
export class ListSessionsQuery {
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
 * 列出会话查询结果
 */
export class ListSessionsQueryResult {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly items: Array<{
    sessionId: string;
    userId?: string;
    title?: string;
    status: string;
    messageCount: number;
    createdAt: string;
    lastActivityAt: string;
  }>;

  constructor(
    total: number,
    page: number,
    pageSize: number,
    items: Array<{
      sessionId: string;
      userId?: string;
      title?: string;
      status: string;
      messageCount: number;
      createdAt: string;
      lastActivityAt: string;
    }>
  ) {
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.items = items;
  }
}