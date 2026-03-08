/**
 * SQLite 线程存储实现
 * 基于 better-sqlite3 的线程持久化存储
 */

import type {
  ThreadStorageMetadata,
  ThreadListOptions,
  ThreadStatus
} from '@modular-agent/types';
import type { ThreadStorageCallback } from '../types/callback/index.js';
import { BaseSqliteStorage, BaseSqliteStorageConfig } from './base-sqlite-storage.js';

/**
 * SQLite 线程存储
 * 实现 ThreadStorageCallback 接口
 */
export class SqliteThreadStorage extends BaseSqliteStorage<ThreadStorageMetadata> implements ThreadStorageCallback {
  constructor(config: BaseSqliteStorageConfig) {
    super(config);
  }

  /**
   * 获取表名
   */
  protected getTableName(): string {
    return 'threads';
  }

  /**
   * 创建表结构
   */
  protected createTableSchema(): void {
    const db = this.getDb();

    db.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        workflow_version TEXT NOT NULL,
        status TEXT NOT NULL,
        thread_type TEXT,
        current_node_id TEXT,
        parent_thread_id TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        data BLOB NOT NULL,
        tags TEXT,
        custom_fields TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建索引
    db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_workflow_id ON threads(workflow_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_start_time ON threads(start_time)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_parent_thread_id ON threads(parent_thread_id)`);
  }

  /**
   * 保存线程
   */
  async save(
    id: string,
    data: Uint8Array,
    metadata: ThreadStorageMetadata
  ): Promise<void> {
    const db = this.getDb();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        INSERT INTO threads (
          id, workflow_id, workflow_version, status, thread_type,
          current_node_id, parent_thread_id, start_time, end_time,
          data, tags, custom_fields, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          workflow_id = excluded.workflow_id,
          workflow_version = excluded.workflow_version,
          status = excluded.status,
          thread_type = excluded.thread_type,
          current_node_id = excluded.current_node_id,
          parent_thread_id = excluded.parent_thread_id,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          data = excluded.data,
          tags = excluded.tags,
          custom_fields = excluded.custom_fields,
          updated_at = excluded.updated_at
      `);

      stmt.run(
        id,
        metadata.workflowId,
        metadata.workflowVersion,
        metadata.status,
        metadata.threadType ?? null,
        metadata.currentNodeId ?? null,
        metadata.parentThreadId ?? null,
        metadata.startTime,
        metadata.endTime ?? null,
        Buffer.from(data),
        metadata.tags ? JSON.stringify(metadata.tags) : null,
        metadata.customFields ? JSON.stringify(metadata.customFields) : null,
        now,
        now
      );
    } catch (error) {
      this.handleSqliteError(error, 'save', { id });
    }
  }

  /**
   * 列出线程ID
   */
  async list(options?: ThreadListOptions): Promise<string[]> {
    const db = this.getDb();

    try {
      let sql = `SELECT id FROM threads`;
      const params: unknown[] = [];
      const conditions: string[] = [];

      // 构建过滤条件
      if (options?.workflowId) {
        conditions.push('workflow_id = ?');
        params.push(options.workflowId);
      }

      if (options?.status) {
        if (Array.isArray(options.status)) {
          conditions.push(`status IN (${options.status.map(() => '?').join(', ')})`);
          params.push(...options.status);
        } else {
          conditions.push('status = ?');
          params.push(options.status);
        }
      }

      if (options?.threadType) {
        conditions.push('thread_type = ?');
        params.push(options.threadType);
      }

      if (options?.parentThreadId) {
        conditions.push('parent_thread_id = ?');
        params.push(options.parentThreadId);
      }

      if (options?.startTimeFrom) {
        conditions.push('start_time >= ?');
        params.push(options.startTimeFrom);
      }

      if (options?.startTimeTo) {
        conditions.push('start_time <= ?');
        params.push(options.startTimeTo);
      }

      if (options?.endTimeFrom) {
        conditions.push('end_time >= ?');
        params.push(options.endTimeFrom);
      }

      if (options?.endTimeTo) {
        conditions.push('end_time <= ?');
        params.push(options.endTimeTo);
      }

      if (options?.tags && options.tags.length > 0) {
        conditions.push(`tags LIKE ?`);
        params.push(`%"${options.tags[0]}"%`);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      // 排序
      const sortBy = options?.sortBy ?? 'startTime';
      const sortOrder = options?.sortOrder ?? 'desc';
      sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // 分页
      if (options?.limit !== undefined) {
        sql += ' LIMIT ?';
        params.push(options.limit);
      }

      if (options?.offset !== undefined) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }

      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as Array<{ id: string }>;

      return rows.map(row => row.id);
    } catch (error) {
      this.handleSqliteError(error, 'list', { options });
    }
  }

  /**
   * 获取元数据
   */
  async getMetadata(id: string): Promise<ThreadStorageMetadata | null> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`
        SELECT
          id, workflow_id, workflow_version, status, thread_type,
          current_node_id, parent_thread_id, start_time, end_time,
          tags, custom_fields
        FROM threads WHERE id = ?
      `);
      const row = stmt.get(id) as {
        id: string;
        workflow_id: string;
        workflow_version: string;
        status: string;
        thread_type: string | null;
        current_node_id: string | null;
        parent_thread_id: string | null;
        start_time: number;
        end_time: number | null;
        tags: string | null;
        custom_fields: string | null;
      } | undefined;

      if (!row) {
        return null;
      }

      return {
        threadId: row.id,
        workflowId: row.workflow_id,
        workflowVersion: row.workflow_version,
        status: row.status as ThreadStatus,
        threadType: row.thread_type as import('@modular-agent/types').ThreadType | undefined,
        currentNodeId: row.current_node_id ?? undefined,
        parentThreadId: row.parent_thread_id ?? undefined,
        startTime: row.start_time,
        endTime: row.end_time ?? undefined,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        customFields: row.custom_fields ? JSON.parse(row.custom_fields) : undefined
      };
    } catch (error) {
      this.handleSqliteError(error, 'getMetadata', { id });
    }
  }

  /**
   * 更新线程状态
   */
  async updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
    const db = this.getDb();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        UPDATE threads SET status = ?, updated_at = ? WHERE id = ?
      `);
      stmt.run(status, now, threadId);
    } catch (error) {
      this.handleSqliteError(error, 'updateStatus', { threadId, status });
    }
  }
}
