/**
 * JSON 文件存储基类
 * 提供通用的文件存储功能，包括元数据索引、文件锁、初始化等
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageError, SerializationError } from '../types/storage-errors.js';
import { createPackageLogger } from '@modular-agent/common-utils';

const logger = createPackageLogger('storage').child('json-storage');

/**
 * JSON 存储基础配置
 */
export interface BaseJsonStorageConfig {
  /** 基础目录路径 */
  baseDir: string;
  /** 是否启用文件锁 */
  enableFileLock?: boolean;
}

/**
 * 存储文件内容格式
 */
interface StorageFileContent<TMetadata> {
  id: string;
  data: number[];  // Uint8Array 序列化为 number[]
  metadata: TMetadata;
}

/**
 * 元数据索引条目
 */
interface MetadataIndexEntry<TMetadata> {
  metadata: TMetadata;
  filePath: string;
}

/**
 * JSON 文件存储抽象基类
 * @template TMetadata 元数据类型
 */
export abstract class BaseJsonStorage<TMetadata> {
  protected metadataIndex: Map<string, MetadataIndexEntry<TMetadata>> = new Map();
  protected initialized: boolean = false;
  protected lockFiles: Map<string, Promise<void>> = new Map();

  constructor(protected readonly config: BaseJsonStorageConfig) {}

  /**
   * 初始化存储
   * 创建必要的目录结构并加载元数据索引
   */
  async initialize(): Promise<void> {
    logger.debug('Initializing JSON storage', { baseDir: this.config.baseDir });

    await fs.mkdir(this.config.baseDir, { recursive: true });
    await this.loadMetadataIndex();
    this.initialized = true;

    logger.info('JSON storage initialized', {
      baseDir: this.config.baseDir,
      indexSize: this.metadataIndex.size
    });
  }

  /**
   * 加载元数据索引
   * 子类可重写此方法以添加额外的目录创建逻辑
   */
  protected async loadMetadataIndex(): Promise<void> {
    try {
      const entries = await fs.readdir(this.config.baseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const filePath = path.join(this.config.baseDir, entry.name);
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content) as StorageFileContent<TMetadata>;
            if (parsed.id && parsed.metadata) {
              this.metadataIndex.set(parsed.id, {
                metadata: parsed.metadata,
                filePath
              });
            }
          } catch {
            // 忽略解析错误的文件
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 确保已初始化
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        'initialize'
      );
    }
  }

  /**
   * 获取文件路径
   */
  protected getFilePath(id: string): string {
    const safeId = this.sanitizeId(id);
    return path.join(this.config.baseDir, `${safeId}.json`);
  }

  /**
   * 清理 ID，防止路径遍历攻击
   */
  protected sanitizeId(id: string): string {
    return id.replace(/[\/\\:\*\?"<>\|]/g, '_');
  }

  /**
   * 获取文件锁
   */
  protected async acquireLock(filePath: string): Promise<() => void> {
    if (!this.config.enableFileLock) {
      return () => {};
    }

    while (this.lockFiles.has(filePath)) {
      await this.lockFiles.get(filePath);
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.lockFiles.set(filePath, lockPromise);

    return () => {
      this.lockFiles.delete(filePath);
      releaseLock!();
    };
  }

  /**
   * 保存数据到文件
   */
  async save(id: string, data: Uint8Array, metadata: TMetadata): Promise<void> {
    this.ensureInitialized();

    const filePath = this.getFilePath(id);
    const releaseLock = await this.acquireLock(filePath);

    logger.debug('Saving data to JSON file', { id, filePath, dataSize: data.length });

    try {
      const content: StorageFileContent<TMetadata> = {
        id,
        data: Array.from(data),
        metadata
      };

      try {
        const jsonContent = JSON.stringify(content, null, 2);
        await fs.writeFile(filePath, jsonContent, 'utf-8');
        this.metadataIndex.set(id, { metadata, filePath });

        logger.debug('Data saved to JSON file', { id, filePath });
      } catch (error) {
        logger.error('Failed to save data to JSON file', { id, filePath, error: (error as Error).message });
        throw new SerializationError(
          `Failed to serialize data: ${id}`,
          id,
          error as Error
        );
      }
    } finally {
      releaseLock();
    }
  }

  /**
   * 从文件加载数据
   */
  async load(id: string): Promise<Uint8Array | null> {
    this.ensureInitialized();

    const indexEntry = this.metadataIndex.get(id);
    if (!indexEntry) {
      logger.debug('Data not found in index', { id });
      return null;
    }

    try {
      const content = await fs.readFile(indexEntry.filePath, 'utf-8');
      const parsed = JSON.parse(content) as StorageFileContent<TMetadata>;
      logger.debug('Data loaded from JSON file', { id, dataSize: parsed.data.length });
      return new Uint8Array(parsed.data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.debug('JSON file not found', { id, filePath: indexEntry.filePath });
        return null;
      }
      logger.error('Failed to load data from JSON file', { id, error: (error as Error).message });
      throw new StorageError(
        `Failed to load data: ${id}`,
        'load',
        { id },
        error as Error
      );
    }
  }

  /**
   * 删除文件
   */
  async delete(id: string): Promise<void> {
    this.ensureInitialized();

    const indexEntry = this.metadataIndex.get(id);
    if (!indexEntry) {
      logger.debug('Data not found for deletion', { id });
      return;
    }

    const releaseLock = await this.acquireLock(indexEntry.filePath);

    try {
      try {
        await fs.unlink(indexEntry.filePath);
        this.metadataIndex.delete(id);
        logger.debug('Data deleted from JSON file', { id, filePath: indexEntry.filePath });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    } finally {
      releaseLock();
    }
  }

  /**
   * 检查数据是否存在
   */
  async exists(id: string): Promise<boolean> {
    this.ensureInitialized();
    return this.metadataIndex.has(id);
  }

  /**
   * 获取元数据
   */
  async getMetadata(id: string): Promise<TMetadata | null> {
    this.ensureInitialized();
    const entry = this.metadataIndex.get(id);
    return entry?.metadata ?? null;
  }

  /**
   * 获取所有 ID 列表
   */
  protected getAllIds(): string[] {
    return Array.from(this.metadataIndex.keys());
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

    logger.debug('Clearing all JSON storage data', { count: this.metadataIndex.size });

    for (const [id, entry] of this.metadataIndex) {
      try {
        await fs.unlink(entry.filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }
    this.metadataIndex.clear();

    logger.info('JSON storage cleared');
  }

  /**
   * 关闭存储连接
   */
  async close(): Promise<void> {
    logger.debug('Closing JSON storage');
    this.metadataIndex.clear();
    this.initialized = false;
    logger.info('JSON storage closed');
  }
}
