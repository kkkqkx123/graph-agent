/**
 * JSON 文件线程存储实现
 * 基于 JSON 文件系统的线程持久化存储
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  ThreadStorageMetadata,
  ThreadListOptions,
  ThreadStatus
} from '@modular-agent/types';
import type { ThreadStorageCallback } from '../types/thread-callback.js';
import { StorageError, SerializationError } from '../types/storage-errors.js';

/**
 * JSON 线程存储配置
 */
export interface JsonThreadStorageConfig {
  /** 基础目录路径 */
  baseDir: string;
  /** 是否启用文件锁 */
  enableFileLock?: boolean;
}

/**
 * 存储文件内容格式
 */
interface StorageFileContent {
  id: string;
  data: number[];  // Uint8Array 序列化为 number[]
  metadata: ThreadStorageMetadata;
}

/**
 * JSON 文件线程存储
 * 实现 ThreadStorageCallback 接口
 */
export class JsonThreadStorage implements ThreadStorageCallback {
  private metadataIndex: Map<string, { metadata: ThreadStorageMetadata; filePath: string }> = new Map();
  private initialized: boolean = false;
  private lockFiles: Map<string, Promise<void>> = new Map();

  constructor(private readonly config: JsonThreadStorageConfig) {}

  /**
   * 初始化存储
   * 创建必要的目录结构并加载元数据索引
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.config.baseDir, { recursive: true });
    await this.loadMetadataIndex();
    this.initialized = true;
  }

  /**
   * 加载元数据索引
   */
  private async loadMetadataIndex(): Promise<void> {
    try {
      const entries = await fs.readdir(this.config.baseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const filePath = path.join(this.config.baseDir, entry.name);
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content) as StorageFileContent;
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
  private ensureInitialized(): void {
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
  private getFilePath(threadId: string): string {
    const safeId = this.sanitizeId(threadId);
    return path.join(this.config.baseDir, `${safeId}.json`);
  }

  /**
   * 清理 ID，防止路径遍历攻击
   */
  private sanitizeId(id: string): string {
    return id.replace(/[\/\\:\*\?"<>\|]/g, '_');
  }

  /**
   * 获取文件锁
   */
  private async acquireLock(filePath: string): Promise<() => void> {
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
   * 保存线程
   */
  async save(
    id: string,
    data: Uint8Array,
    metadata: ThreadStorageMetadata
  ): Promise<void> {
    this.ensureInitialized();

    const filePath = this.getFilePath(id);
    const releaseLock = await this.acquireLock(filePath);

    try {
      const content: StorageFileContent = {
        id,
        data: Array.from(data),
        metadata
      };

      try {
        const jsonContent = JSON.stringify(content, null, 2);
        await fs.writeFile(filePath, jsonContent, 'utf-8');
        this.metadataIndex.set(id, { metadata, filePath });
      } catch (error) {
        throw new SerializationError(
          `Failed to serialize thread: ${id}`,
          id,
          error as Error
        );
      }
    } finally {
      releaseLock();
    }
  }

  /**
   * 加载线程数据
   */
  async load(id: string): Promise<Uint8Array | null> {
    this.ensureInitialized();

    const indexEntry = this.metadataIndex.get(id);
    if (!indexEntry) {
      return null;
    }

    try {
      const content = await fs.readFile(indexEntry.filePath, 'utf-8');
      const parsed = JSON.parse(content) as StorageFileContent;
      return new Uint8Array(parsed.data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new StorageError(
        `Failed to load thread: ${id}`,
        'load',
        { id },
        error as Error
      );
    }
  }

  /**
   * 删除线程
   */
  async delete(id: string): Promise<void> {
    this.ensureInitialized();

    const indexEntry = this.metadataIndex.get(id);
    if (!indexEntry) {
      return;
    }

    const releaseLock = await this.acquireLock(indexEntry.filePath);

    try {
      try {
        await fs.unlink(indexEntry.filePath);
        this.metadataIndex.delete(id);
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
   * 列出线程ID
   */
  async list(options?: ThreadListOptions): Promise<string[]> {
    this.ensureInitialized();

    let ids = Array.from(this.metadataIndex.keys());

    // 应用过滤
    if (options) {
      ids = ids.filter(id => {
        const entry = this.metadataIndex.get(id);
        if (!entry) return false;

        const metadata = entry.metadata;

        if (options.workflowId && metadata.workflowId !== options.workflowId) {
          return false;
        }

        if (options.status) {
          if (Array.isArray(options.status)) {
            if (!options.status.includes(metadata.status)) {
              return false;
            }
          } else if (metadata.status !== options.status) {
            return false;
          }
        }

        if (options.threadType && metadata.threadType !== options.threadType) {
          return false;
        }

        if (options.parentThreadId && metadata.parentThreadId !== options.parentThreadId) {
          return false;
        }

        if (options.startTimeFrom && metadata.startTime < options.startTimeFrom) {
          return false;
        }

        if (options.startTimeTo && metadata.startTime > options.startTimeTo) {
          return false;
        }

        if (options.endTimeFrom && (metadata.endTime === undefined || metadata.endTime < options.endTimeFrom)) {
          return false;
        }

        if (options.endTimeTo && (metadata.endTime === undefined || metadata.endTime > options.endTimeTo)) {
          return false;
        }

        if (options.tags && options.tags.length > 0) {
          if (!metadata.tags || !options.tags.some(tag => metadata.tags!.includes(tag))) {
            return false;
          }
        }

        return true;
      });
    }

    // 排序
    const sortBy = options?.sortBy ?? 'startTime';
    const sortOrder = options?.sortOrder ?? 'desc';

    ids.sort((a, b) => {
      const metaA = this.metadataIndex.get(a)?.metadata;
      const metaB = this.metadataIndex.get(b)?.metadata;

      let valueA: number;
      let valueB: number;

      switch (sortBy) {
        case 'startTime':
          valueA = metaA?.startTime ?? 0;
          valueB = metaB?.startTime ?? 0;
          break;
        case 'endTime':
          valueA = metaA?.endTime ?? 0;
          valueB = metaB?.endTime ?? 0;
          break;
        case 'updatedAt':
        default:
          valueA = metaA?.startTime ?? 0;
          valueB = metaB?.startTime ?? 0;
          break;
      }

      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });

    // 分页
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? ids.length;

    return ids.slice(offset, offset + limit);
  }

  /**
   * 检查线程是否存在
   */
  async exists(id: string): Promise<boolean> {
    this.ensureInitialized();
    return this.metadataIndex.has(id);
  }

  /**
   * 获取元数据
   */
  async getMetadata(id: string): Promise<ThreadStorageMetadata | null> {
    this.ensureInitialized();
    const entry = this.metadataIndex.get(id);
    return entry?.metadata ?? null;
  }

  /**
   * 更新线程状态
   */
  async updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
    this.ensureInitialized();

    const indexEntry = this.metadataIndex.get(threadId);
    if (!indexEntry) {
      throw new StorageError(
        `Thread not found: ${threadId}`,
        'updateStatus',
        { threadId }
      );
    }

    // 更新元数据
    const updatedMetadata: ThreadStorageMetadata = {
      ...indexEntry.metadata,
      status
    };

    // 重新保存文件
    const data = await this.load(threadId);
    if (data) {
      await this.save(threadId, data, updatedMetadata);
    }
  }

  /**
   * 清空所有线程
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

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
  }

  /**
   * 关闭存储连接
   */
  async close(): Promise<void> {
    this.metadataIndex.clear();
    this.initialized = false;
  }
}
