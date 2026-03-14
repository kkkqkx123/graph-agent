/**
 * SQLite 存储基类
 * 提供通用的数据库存储功能，包括连接管理、错误处理、初始化等
 */

import Database, { SqliteError } from 'better-sqlite3';
import { StorageError, StorageInitializationError } from '../types/storage-errors.js';
import { createPackageLogger } from '@modular-agent/common-utils';

const logger = createPackageLogger('storage').child('sqlite-storage');

/**
 * SQLite 存储基础配置
 */
export interface BaseSqliteStorageConfig {
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
 * SQLite 文件存储抽象基类
 * @template TMetadata 元数据类型
 */
export abstract class BaseSqliteStorage<TMetadata> {
  protected db: Database.Database | null = null;
  protected initialized: boolean = false;

  constructor(protected readonly config: BaseSqliteStorageConfig) { }

  /**
   * 获取表名
   * 子类必须实现此方法返回对应的表名
   */
  protected abstract getTableName(): string;

  /**
   * 创建表结构
   * 子类必须实现此方法创建具体的表结构
   */
  protected abstract createTableSchema(): void;

  /**
   * 初始化存储
   * 创建数据库连接和表结构
   */
  async initialize(): Promise<void> {
    logger.debug('Initializing SQLite storage', {
      dbPath: this.config.dbPath,
      readonly: this.config.readonly
    });

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

      // 标记为已初始化，以便 createTableSchema 可以使用 getDb
      this.initialized = true;

      // 创建表结构（只读模式下跳过）
      if (!this.config.readonly) {
        this.createTableSchema();
      }

      logger.info('SQLite storage initialized', {
        dbPath: this.config.dbPath,
        tableName: this.getTableName()
      });
    } catch (error) {
      this.initialized = false;
      logger.error('Failed to initialize SQLite storage', {
        dbPath: this.config.dbPath,
        error: (error as Error).message
      });
      throw new StorageInitializationError(
        `Failed to initialize SQLite storage: ${this.config.dbPath}`,
        error as Error
      );
    }
  }

  /**
   * 确保已初始化
   */
  protected ensureInitialized(): void {
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
  protected getDb(): Database.Database {
    this.ensureInitialized();
    return this.db!;
  }

  /**
   * 处理 SQLite 错误
   */
  protected handleSqliteError(error: unknown, operation: string, context?: Record<string, unknown>): never {
    logger.error('SQLite operation failed', { operation, context, error: (error as Error).message });

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
   * 从数据库加载数据
   */
  async load(id: string): Promise<Uint8Array | null> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`SELECT data FROM ${this.getTableName()} WHERE id = ?`);
      const row = stmt.get(id) as { data: Buffer } | undefined;

      if (!row) {
        logger.debug('Data not found in SQLite', { id, table: this.getTableName() });
        return null;
      }

      logger.debug('Data loaded from SQLite', { id, dataSize: row.data.length });
      return new Uint8Array(row.data);
    } catch (error) {
      this.handleSqliteError(error, 'load', { id });
    }
  }

  /**
   * 删除数据
   */
  async delete(id: string): Promise<void> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`DELETE FROM ${this.getTableName()} WHERE id = ?`);
      stmt.run(id);
      logger.debug('Data deleted from SQLite', { id, table: this.getTableName() });
    } catch (error) {
      this.handleSqliteError(error, 'delete', { id });
    }
  }

  /**
   * 检查数据是否存在
   */
  async exists(id: string): Promise<boolean> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`SELECT 1 FROM ${this.getTableName()} WHERE id = ?`);
      const row = stmt.get(id);
      return row !== undefined;
    } catch (error) {
      this.handleSqliteError(error, 'exists', { id });
    }
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`DELETE FROM ${this.getTableName()}`);
      stmt.run();
      logger.info('SQLite table cleared', { table: this.getTableName() });
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
        logger.info('SQLite storage closed', { dbPath: this.config.dbPath });
      } catch (error) {
        logger.error('Error closing SQLite database', {
          dbPath: this.config.dbPath,
          error: (error as Error).message
        });
      } finally {
        this.db = null;
        this.initialized = false;
      }
    }
  }
}
