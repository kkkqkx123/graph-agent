/**
 * SQLite 线程存储实现
 * 基于 better-sqlite3 的线程持久化存储
 */

import Database, { SqliteError } from 'better-sqlite3';
import type {
  ThreadStorageMetadata,
  ThreadListOptions,
  ThreadStatus
} from '@modular-agent/types';
import type { ThreadStorageCallback } from '../types/thread-callback.js';
import { StorageError, StorageInitializationError } from '../types/storage-errors.js';

/**
 * SQLite 线程存储配置
 */
export interface SqliteThreadStorageConfig {
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
 * SQLite 线程存储
 * 实现 ThreadStorageCallback 接口
 */
export class SqliteThreadStorage implements ThreadStorageCallback {
  private db: Database.Database | null = null;
  private initialized: boolean = false;

  constructor(private readonly config: SqliteThreadStorageConfig) {}

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
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_workflow_id ON threads(workflow_id)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_start_time ON threads(start_time)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_parent_thread_id ON threads(parent_thread_id)`);
      }

      this.initialized = true;
    } catch (error) {
      throw new StorageInitializationError(
        `Failed to initialize SQLite thread storage: ${this.config.dbPath}`,
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
   * 加载线程数据
   */
  async load(id: string): Promise<Uint8Array | null> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`SELECT data FROM threads WHERE id = ?`);
      const row = stmt.get(id) as { data: Buffer } | undefined;

      if (!row) {
        return null;
      }

      return new Uint8Array(row.data);
    } catch (error) {
      this.handleSqliteError(error, 'load', { id });
    }
  }

  /**
   * 删除线程
   */
  async delete(id: string): Promise<void> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`DELETE FROM threads WHERE id = ?`);
      stmt.run(id);
    } catch (error) {
      this.handleSqliteError(error, 'delete', { id });
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
   * 检查线程是否存在
   */
  async exists(id: string): Promise<boolean> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`SELECT 1 FROM threads WHERE id = ?`);
      const row = stmt.get(id);
      return row !== undefined;
    } catch (error) {
      this.handleSqliteError(error, 'exists', { id });
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

  /**
   * 清空所有线程
   */
  async clear(): Promise<void> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`DELETE FROM threads`);
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
