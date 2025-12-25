/**
 * 列出会话查询
 */

import { Session } from '../../../domain/sessions/entities/session';

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
  readonly items: Session[];

  constructor(
    total: number,
    page: number,
    pageSize: number,
    items: Session[]
  ) {
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.items = items;
  }
}