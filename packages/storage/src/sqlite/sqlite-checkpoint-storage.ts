/**
 * SQLite 检查点存储实现
 * 基于 better-sqlite3 的检查点持久化存储
 */

import Database, { SqliteError } from 'better-sqlite3';
import type { CheckpointStorageMetadata, CheckpointListOptions } from '@modular-agent/types';
import type { CheckpointStorageCallback } from '../types/checkpoint-callback.js';
import { StorageError, StorageInitializationError } from '../types/storage-errors.js';

/**
 * SQLite 检查点存储配置
 */
export interface SqliteCheckpointStorageConfig {
  /** 数据库文件路径 */
  dbPath: string;
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 是否以只读模式打开 */
  readonly?: boolean;
  /** 数据库文件不存在时是否抛出错误 */
  fileMustExist?: boolean;
  /** 数据库锁定时的超时时间（毫秒） */
  timeout?: number;
}

/**
 * SQLite 检查点存储
 * 实现 CheckpointStorageCallback 接口
 */
export class SqliteCheckpointStorage implements CheckpointStorageCallback {
  private db: Database.Database | null = null;
  private initialized: boolean = false;

  constructor(private readonly config: SqliteCheckpointStorageConfig) {}

  /**
   * 初始化存储
   * 创建数据库连接和表结构
   */
  async initialize(): Promise<void> {
    try {
      const options: Database.Options = {
        readonly: this.config.readonly ?? false,
        fileMustExist: this.config.fileMustExist ?? false,
        timeout: this.config.timeout ?? 5000
      };

      this.db = new Database(this.config.dbPath, options);

      // 启用 WAL 模式提高并发性能
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('wal_autocheckpoint = 1000');
      this.db.pragma('synchronous = NORMAL');

      // 创建表结构（只读模式下跳过）
      if (!this.config.readonly) {
        this.db.exec(`
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
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id ON checkpoints(thread_id)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_checkpoints_workflow_id ON checkpoints(workflow_id)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp)`);
      }

      this.initialized = true;
    } catch (error) {
      throw new StorageInitializationError(
        `Failed to initialize SQLite storage: ${this.config.dbPath}`,
        error as Error
      );
    }
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        'initialize'
      );
    }
  }

  /**
   * 获取数据库实例
   */
  private getDb(): Database.Database {
    this.ensureInitialized();
    return this.db!;
  }

  /**
   * 处理 SQLite 错误
   */
  private handleSqliteError(error: unknown, operation: string, context?: Record<string, unknown>): never {
    if (error instanceof SqliteError) {
      throw new StorageError(
        `SQLite error [${error.code}]: ${error.message}`,
        operation,
        { ...context, code: error.code },
        error
      );
    }

    throw new StorageError(
      `Storage operation failed: ${operation}`,
      operation,
      context,
      error as Error
    );
  }

  /**
   * 保存检查点
   */
  async saveCheckpoint(
    checkpointId: string,
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
        checkpointId,
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
      this.handleSqliteError(error, 'save', { checkpointId });
    }
  }

  /**
   * 加载检查点数据
   */
  async loadCheckpoint(checkpointId: string): Promise<Uint8Array | null> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`SELECT data FROM checkpoints WHERE id = ?`);
      const row = stmt.get(checkpointId) as { data: Buffer } | undefined;

      if (!row) {
        return null;
      }

      return new Uint8Array(row.data);
    } catch (error) {
      this.handleSqliteError(error, 'load', { checkpointId });
    }
  }

  /**
   * 删除检查点
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`DELETE FROM checkpoints WHERE id = ?`);
      stmt.run(checkpointId);
    } catch (error) {
      this.handleSqliteError(error, 'delete', { checkpointId });
    }
  }

  /**
   * 列出检查点ID
   */
  async listCheckpoints(options?: CheckpointListOptions): Promise<string[]> {
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
   * 检查检查点是否存在
   */
  async checkpointExists(checkpointId: string): Promise<boolean> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`SELECT 1 FROM checkpoints WHERE id = ?`);
      const row = stmt.get(checkpointId);
      return row !== undefined;
    } catch (error) {
      this.handleSqliteError(error, 'exists', { checkpointId });
    }
  }

  /**
   * 清空所有检查点
   */
  async clear(): Promise<void> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`DELETE FROM checkpoints`);
      stmt.run();
    } catch (error) {
      this.handleSqliteError(error, 'clear', {});
    }
  }

  /**
   * 关闭存储连接
   */
  async close(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
      } catch (error) {
        if (this.config.enableLogging) {
          console.error('Error closing database:', error);
        }
      } finally {
        this.db = null;
        this.initialized = false;
      }
    }
  }
}
