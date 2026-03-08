/**
 * SQLite 检查点存储实现
 * 基于 better-sqlite3 的检查点持久化存储
 */

import type { CheckpointStorageMetadata, CheckpointListOptions } from '@modular-agent/types';
import type { CheckpointStorageCallback } from '../types/callback/index.js';
import { BaseSqliteStorage, BaseSqliteStorageConfig } from './base-sqlite-storage.js';

/**
 * SQLite 检查点存储
 * 实现 CheckpointStorageCallback 接口
 */
export class SqliteCheckpointStorage extends BaseSqliteStorage<CheckpointStorageMetadata> implements CheckpointStorageCallback {
  constructor(config: BaseSqliteStorageConfig) {
    super(config);
  }

  /**
   * 获取表名
   */
  protected getTableName(): string {
    return 'checkpoints';
  }

  /**
   * 创建表结构
   */
  protected createTableSchema(): void {
    const db = this.getDb();

    db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        data BLOB NOT NULL,
        tags TEXT,
        custom_fields TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建索引
    db.exec(`CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id ON checkpoints(thread_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_checkpoints_workflow_id ON checkpoints(workflow_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp)`);
  }

  /**
   * 保存检查点
   */
  async save(
    id: string,
    data: Uint8Array,
    metadata: CheckpointStorageMetadata
  ): Promise<void> {
    const db = this.getDb();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        INSERT INTO checkpoints (id, thread_id, workflow_id, timestamp, data, tags, custom_fields, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          thread_id = excluded.thread_id,
          workflow_id = excluded.workflow_id,
          timestamp = excluded.timestamp,
          data = excluded.data,
          tags = excluded.tags,
          custom_fields = excluded.custom_fields,
          updated_at = excluded.updated_at
      `);

      stmt.run(
        id,
        metadata.threadId,
        metadata.workflowId,
        metadata.timestamp,
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
   * 列出检查点ID
   */
  async list(options?: CheckpointListOptions): Promise<string[]> {
    const db = this.getDb();

    try {
      let sql = `SELECT id FROM checkpoints`;
      const params: unknown[] = [];
      const conditions: string[] = [];

      // 构建过滤条件
      if (options?.threadId) {
        conditions.push('thread_id = ?');
        params.push(options.threadId);
      }

      if (options?.workflowId) {
        conditions.push('workflow_id = ?');
        params.push(options.workflowId);
      }

      if (options?.tags && options.tags.length > 0) {
        conditions.push(`tags LIKE ?`);
        params.push(`%"${options.tags[0]}"%`);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      // 按时间戳降序排列
      sql += ' ORDER BY timestamp DESC';

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
  async getMetadata(id: string): Promise<CheckpointStorageMetadata | null> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`
        SELECT thread_id, workflow_id, timestamp, tags, custom_fields
        FROM checkpoints WHERE id = ?
      `);
      const row = stmt.get(id) as {
        thread_id: string;
        workflow_id: string;
        timestamp: number;
        tags: string | null;
        custom_fields: string | null;
      } | undefined;

      if (!row) {
        return null;
      }

      return {
        threadId: row.thread_id,
        workflowId: row.workflow_id,
        timestamp: row.timestamp,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        customFields: row.custom_fields ? JSON.parse(row.custom_fields) : undefined
      };
    } catch (error) {
      this.handleSqliteError(error, 'getMetadata', { id });
    }
  }
}
