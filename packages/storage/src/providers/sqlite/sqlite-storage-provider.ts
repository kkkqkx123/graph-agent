/**
 * SQLite 存储提供者
 * 基于 better-sqlite3 的存储实现
 */

import Database, { SqliteError } from 'better-sqlite3';
import type {
  StorageProvider,
  ListOptions,
  ListResult,
  StorageMetadata
} from '../../types/index.js';
import { StorageError, SerializationError, StorageInitializationError } from '../../types/storage-errors.js';
import { INIT_STATEMENTS } from './schema.js';

/**
 * SQLite 存储配置
 */
export interface SqliteStorageConfig {
  /** 数据库文件路径 */
  dbPath: string;
  /** 实体类型（用于表名） */
  entityType: 'checkpoint' | 'thread';
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
 * 数据库行记录格式
 */
interface DbRow {
  id: string;
  data: Buffer | string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

/**
 * SQLite 存储提供者
 */
export class SqliteStorageProvider<T> implements StorageProvider<T> {
  private db: Database.Database | null = null;
  private initialized: boolean = false;
  private tableName: string;

  constructor(private readonly config: SqliteStorageConfig) {
    this.tableName = config.entityType === 'checkpoint' ? 'checkpoints' : 'threads';
  }

  /**
   * 初始化存储
   * 创建数据库连接和表结构
   */
  async initialize(): Promise<void> {
    try {
      // 构建数据库连接选项
      const options: Database.Options = {
        readonly: this.config.readonly ?? false,
        fileMustExist: this.config.fileMustExist ?? false,
        timeout: this.config.timeout ?? 5000
      };
      
      this.db = new Database(this.config.dbPath, options);
      
      // 启用 WAL 模式提高并发性能
      this.db.pragma('journal_mode = WAL');
      
      // 配置 WAL 模式参数，避免 checkpoint 饥饿
      this.db.pragma('wal_autocheckpoint = 1000'); // 每 1000 页执行一次 checkpoint
      this.db.pragma('synchronous = NORMAL'); // 平衡性能和数据安全
      
      // 执行初始化语句（只读模式下跳过）
      if (!this.config.readonly) {
        for (const statement of INIT_STATEMENTS) {
          this.db.exec(statement);
        }
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
   * 将实体数据转换为存储格式
   */
  private serializeEntity(entity: T): Buffer {
    try {
      const json = JSON.stringify(entity);
      return Buffer.from(json, 'utf-8');
    } catch (error) {
      throw new SerializationError(
        'Failed to serialize entity',
        'unknown',
        error as Error
      );
    }
  }

  /**
   * 从存储格式还原实体数据
   */
  private deserializeEntity(data: Buffer | string): T {
    try {
      const json = typeof data === 'string' ? data : data.toString('utf-8');
      const parsed = JSON.parse(json);
      
      // 如果是 Uint8Array，需要转换回正确的类型
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // 检查是否是类数组对象（可能是 Uint8Array 的 JSON 表示）
        const keys = Object.keys(parsed);
        if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
          // 转换回 Uint8Array
          const arr = new Uint8Array(keys.length);
          for (let i = 0; i < keys.length; i++) {
            arr[i] = parsed[i];
          }
          return arr as unknown as T;
        }
      }
      
      return parsed as T;
    } catch (error) {
      throw new SerializationError(
        'Failed to deserialize entity',
        'unknown',
        error as Error
      );
    }
  }

  /**
   * 处理 SQLite 错误并转换为适当的存储错误
   */
  private handleSqliteError(error: unknown, operation: string, context?: Record<string, unknown>): never {
    if (error instanceof SqliteError) {
      // 根据 SQLite 错误代码进行分类处理
      switch (error.code) {
        case 'SQLITE_CONSTRAINT_UNIQUE':
        case 'SQLITE_CONSTRAINT_PRIMARYKEY':
          throw new StorageError(
            `Entity already exists or constraint violation: ${error.message}`,
            operation,
            { ...context, code: error.code },
            error
          );
        case 'SQLITE_BUSY':
        case 'SQLITE_LOCKED':
          throw new StorageError(
            `Database is locked or busy: ${error.message}`,
            operation,
            { ...context, code: error.code },
            error
          );
        case 'SQLITE_FULL':
        case 'SQLITE_IOERR':
          throw new StorageError(
            `Database I/O error: ${error.message}`,
            operation,
            { ...context, code: error.code },
            error
          );
        default:
          throw new StorageError(
            `SQLite error [${error.code}]: ${error.message}`,
            operation,
            { ...context, code: error.code },
            error
          );
      }
    }
    
    // 非 SQLite 错误，直接包装
    throw new StorageError(
      `Storage operation failed: ${operation}`,
      operation,
      context,
      error as Error
    );
  }

  async save(id: string, entity: T, metadata?: StorageMetadata): Promise<void> {
    const db = this.getDb();
    const now = Date.now();
    const data = this.serializeEntity(entity);

    try {
      if (this.config.entityType === 'checkpoint') {
        // 检查点表
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
          metadata?.parentId ?? '',
          metadata?.workflowId ?? '',
          metadata?.customFields?.['timestamp'] ?? now,
          data,
          metadata?.tags ? JSON.stringify(metadata.tags) : null,
          metadata?.customFields ? JSON.stringify(metadata.customFields) : null,
          now,
          now
        );
      } else {
        // 线程表
        const stmt = db.prepare(`
          INSERT INTO threads (id, workflow_id, status, start_time, end_time, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            workflow_id = excluded.workflow_id,
            status = excluded.status,
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            data = excluded.data,
            updated_at = excluded.updated_at
        `);

        stmt.run(
          id,
          metadata?.workflowId ?? '',
          metadata?.customFields?.['status'] ?? 'pending',
          metadata?.customFields?.['startTime'] ?? now,
          metadata?.customFields?.['endTime'] ?? null,
          data.toString('utf-8'),
          now,
          now
        );
      }
    } catch (error) {
      this.handleSqliteError(error, 'save', { id });
    }
  }

  async load(id: string): Promise<T | null> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`SELECT data FROM ${this.tableName} WHERE id = ?`);
      const row = stmt.get(id) as DbRow | undefined;

      if (!row) {
        return null;
      }

      return this.deserializeEntity(row.data);
    } catch (error) {
      this.handleSqliteError(error, 'load', { id });
    }
  }

  async delete(id: string): Promise<void> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
      stmt.run(id);
    } catch (error) {
      this.handleSqliteError(error, 'delete', { id });
    }
  }

  async exists(id: string): Promise<boolean> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ?`);
      const row = stmt.get(id);
      return row !== undefined;
    } catch (error) {
      this.handleSqliteError(error, 'exists', { id });
    }
  }

  async list(options?: ListOptions): Promise<ListResult<string>> {
    const db = this.getDb();

    try {
      let sql = `SELECT id FROM ${this.tableName}`;
      const params: unknown[] = [];
      const conditions: string[] = [];

      // 构建过滤条件
      if (options?.filter) {
        const { filter } = options;

        if (filter['parentId'] !== undefined) {
          conditions.push('thread_id = ?');
          params.push(filter['parentId']);
        }

        if (filter['workflowId'] !== undefined) {
          conditions.push('workflow_id = ?');
          params.push(filter['workflowId']);
        }

        if (filter['tags'] !== undefined && Array.isArray(filter['tags'])) {
          // 标签匹配：使用 JSON 查询或 LIKE
          conditions.push(`tags LIKE ?`);
          params.push(`%"${filter['tags'][0]}"%`);
        }

        if (filter['status'] !== undefined) {
          conditions.push('status = ?');
          params.push(filter['status']);
        }
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      // 排序
      const orderBy = options?.orderBy ?? (this.config.entityType === 'checkpoint' ? 'timestamp' : 'updated_at');
      const orderDirection = options?.orderDirection ?? 'desc';
      sql += ` ORDER BY ${orderBy} ${orderDirection.toUpperCase()}`;

      // 获取总数
      const countSql = sql.replace('SELECT id', 'SELECT COUNT(*) as total');
      const countStmt = db.prepare(countSql);
      const countRow = countStmt.get(...params) as { total: number };
      const total = countRow?.total ?? 0;

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

      return {
        items: rows.map(row => row.id),
        total,
        hasMore: options?.offset !== undefined && options?.limit !== undefined
          ? options.offset + options.limit < total
          : false
      };
    } catch (error) {
      this.handleSqliteError(error, 'list', { options });
    }
  }

  async getMetadata(id: string): Promise<StorageMetadata | null> {
    const db = this.getDb();

    try {
      if (this.config.entityType === 'checkpoint') {
        const stmt = db.prepare(`
          SELECT thread_id, workflow_id, timestamp, tags, custom_fields, created_at, updated_at
          FROM checkpoints WHERE id = ?
        `);
        const row = stmt.get(id) as {
          thread_id: string;
          workflow_id: string;
          timestamp: number;
          tags: string | null;
          custom_fields: string | null;
          created_at: number;
          updated_at: number;
        } | undefined;

        if (!row) return null;

        return {
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          modelType: 'checkpoint',
          parentId: row.thread_id,
          workflowId: row.workflow_id,
          tags: row.tags ? JSON.parse(row.tags) : undefined,
          customFields: row.custom_fields ? JSON.parse(row.custom_fields) : undefined
        };
      } else {
        const stmt = db.prepare(`
          SELECT workflow_id, status, start_time, end_time, created_at, updated_at
          FROM threads WHERE id = ?
        `);
        const row = stmt.get(id) as {
          workflow_id: string;
          status: string;
          start_time: number;
          end_time: number | null;
          created_at: number;
          updated_at: number;
        } | undefined;

        if (!row) return null;

        return {
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          modelType: 'thread',
          workflowId: row.workflow_id,
          customFields: {
            status: row.status,
            startTime: row.start_time,
            endTime: row.end_time ?? undefined
          }
        };
      }
    } catch (error) {
      this.handleSqliteError(error, 'getMetadata', { id });
    }
  }

  async saveBatch(items: Array<{ id: string; entity: T; metadata?: StorageMetadata }>): Promise<void> {
    const db = this.getDb();

    try {
      // 使用事务批量保存，优化：在事务外 prepare 语句，在事务内复用
      if (this.config.entityType === 'checkpoint') {
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

        const transaction = db.transaction(() => {
          for (const item of items) {
            const now = Date.now();
            const data = this.serializeEntity(item.entity);
            stmt.run(
              item.id,
              item.metadata?.parentId ?? '',
              item.metadata?.workflowId ?? '',
              item.metadata?.customFields?.['timestamp'] ?? now,
              data,
              item.metadata?.tags ? JSON.stringify(item.metadata.tags) : null,
              item.metadata?.customFields ? JSON.stringify(item.metadata.customFields) : null,
              now,
              now
            );
          }
        });

        transaction();
      } else {
        const stmt = db.prepare(`
          INSERT INTO threads (id, workflow_id, status, start_time, end_time, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            workflow_id = excluded.workflow_id,
            status = excluded.status,
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            data = excluded.data,
            updated_at = excluded.updated_at
        `);

        const transaction = db.transaction(() => {
          for (const item of items) {
            const now = Date.now();
            const data = this.serializeEntity(item.entity);
            stmt.run(
              item.id,
              item.metadata?.workflowId ?? '',
              item.metadata?.customFields?.['status'] ?? 'pending',
              item.metadata?.customFields?.['startTime'] ?? now,
              item.metadata?.customFields?.['endTime'] ?? null,
              data.toString('utf-8'),
              now,
              now
            );
          }
        });

        transaction();
      }
    } catch (error) {
      this.handleSqliteError(error, 'saveBatch', { count: items.length });
    }
  }

  async deleteBatch(ids: string[]): Promise<void> {
    const db = this.getDb();

    try {
      const placeholders = ids.map(() => '?').join(',');
      const stmt = db.prepare(`DELETE FROM ${this.tableName} WHERE id IN (${placeholders})`);
      stmt.run(...ids);
    } catch (error) {
      this.handleSqliteError(error, 'deleteBatch', { count: ids.length });
    }
  }

  async clear(): Promise<void> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`DELETE FROM ${this.tableName}`);
      stmt.run();
    } catch (error) {
      this.handleSqliteError(error, 'clear', {});
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
      } catch (error) {
        // 记录错误但不抛出，确保资源状态正确更新
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
