/**
 * 存储工厂
 * 提供创建不同类型存储实例的工厂方法
 */

import type { Thread } from '@modular-agent/types';
import { JsonStorageProvider, type JsonStorageConfig } from '../providers/json/index.js';
import { SqliteStorageProvider, type SqliteStorageConfig } from '../providers/sqlite/index.js';
import { CheckpointStorageAdapter } from '../adapters/checkpoint-storage-adapter.js';
import { ThreadStorageAdapter } from '../adapters/thread-storage-adapter.js';
import type { StorageProvider } from '../types/index.js';

/**
 * JSON 存储配置选项
 */
export interface JsonStorageOptions {
  /** 基础目录路径 */
  baseDir: string;
  /** 是否启用文件锁 */
  enableFileLock?: boolean;
  /** 是否启用元数据索引 */
  enableMetadataIndex?: boolean;
}

/**
 * SQLite 存储配置选项
 */
export interface SqliteStorageOptions {
  /** 数据库文件路径 */
  dbPath: string;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/**
 * 存储工厂
 * 提供创建存储实例的便捷方法
 */
export class StorageFactory {
  /**
   * 创建 JSON 检查点存储提供者
   * @param options 配置选项
   */
  static async createJsonCheckpointStorage(options: JsonStorageOptions): Promise<JsonStorageProvider<Uint8Array>> {
    const config: JsonStorageConfig = {
      baseDir: options.baseDir,
      entityType: 'checkpoints',
      enableFileLock: options.enableFileLock ?? true,
      enableMetadataIndex: options.enableMetadataIndex ?? true
    };

    const storage = new JsonStorageProvider<Uint8Array>(config);
    await storage.initialize();
    return storage;
  }

  /**
   * 创建 JSON 线程存储提供者
   * @param options 配置选项
   */
  static async createJsonThreadStorage(options: JsonStorageOptions): Promise<JsonStorageProvider<Thread>> {
    const config: JsonStorageConfig = {
      baseDir: options.baseDir,
      entityType: 'threads',
      enableFileLock: options.enableFileLock ?? true,
      enableMetadataIndex: options.enableMetadataIndex ?? true
    };

    const storage = new JsonStorageProvider<Thread>(config);
    await storage.initialize();
    return storage;
  }

  /**
   * 创建 SQLite 检查点存储提供者
   * @param options 配置选项
   */
  static async createSqliteCheckpointStorage(options: SqliteStorageOptions): Promise<SqliteStorageProvider<Uint8Array>> {
    const config: SqliteStorageConfig = {
      dbPath: options.dbPath,
      entityType: 'checkpoint',
      enableLogging: options.enableLogging
    };

    const storage = new SqliteStorageProvider<Uint8Array>(config);
    await storage.initialize();
    return storage;
  }

  /**
   * 创建 SQLite 线程存储提供者
   * @param options 配置选项
   */
  static async createSqliteThreadStorage(options: SqliteStorageOptions): Promise<SqliteStorageProvider<Thread>> {
    const config: SqliteStorageConfig = {
      dbPath: options.dbPath,
      entityType: 'thread',
      enableLogging: options.enableLogging
    };

    const storage = new SqliteStorageProvider<Thread>(config);
    await storage.initialize();
    return storage;
  }

  /**
   * 创建检查点存储适配器
   * @param storage 存储提供者
   */
  static createCheckpointAdapter(storage: StorageProvider<Uint8Array>): CheckpointStorageAdapter {
    return new CheckpointStorageAdapter(storage);
  }

  /**
   * 创建线程存储适配器
   * @param storage 存储提供者
   */
  static createThreadAdapter(storage: StorageProvider<Thread>): ThreadStorageAdapter {
    return new ThreadStorageAdapter(storage);
  }

  /**
   * 创建完整的 JSON 存储套件
   * 包含检查点和线程存储及适配器
   * @param options 配置选项
   */
  static async createJsonStorageSuite(options: JsonStorageOptions): Promise<{
    checkpointStorage: JsonStorageProvider<Uint8Array>;
    threadStorage: JsonStorageProvider<Thread>;
    checkpointAdapter: CheckpointStorageAdapter;
    threadAdapter: ThreadStorageAdapter;
  }> {
    const [checkpointStorage, threadStorage] = await Promise.all([
      this.createJsonCheckpointStorage(options),
      this.createJsonThreadStorage(options)
    ]);

    return {
      checkpointStorage,
      threadStorage,
      checkpointAdapter: this.createCheckpointAdapter(checkpointStorage),
      threadAdapter: this.createThreadAdapter(threadStorage)
    };
  }

  /**
   * 创建完整的 SQLite 存储套件
   * 包含检查点和线程存储及适配器
   * @param options 配置选项
   */
  static async createSqliteStorageSuite(options: SqliteStorageOptions): Promise<{
    checkpointStorage: SqliteStorageProvider<Uint8Array>;
    threadStorage: SqliteStorageProvider<Thread>;
    checkpointAdapter: CheckpointStorageAdapter;
    threadAdapter: ThreadStorageAdapter;
  }> {
    const [checkpointStorage, threadStorage] = await Promise.all([
      this.createSqliteCheckpointStorage(options),
      this.createSqliteThreadStorage(options)
    ]);

    return {
      checkpointStorage,
      threadStorage,
      checkpointAdapter: this.createCheckpointAdapter(checkpointStorage),
      threadAdapter: this.createThreadAdapter(threadStorage)
    };
  }
}
