/**
 * JSON 文件检查点存储实现
 * 基于 JSON 文件系统的检查点持久化存储
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { CheckpointStorageMetadata, CheckpointListOptions } from '@modular-agent/types';
import type { CheckpointStorageCallback } from '../types/checkpoint-callback.js';
import { StorageError, SerializationError } from '../types/storage-errors.js';

/**
 * JSON 检查点存储配置
 */
export interface JsonCheckpointStorageConfig {
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
  metadata: CheckpointStorageMetadata;
}

/**
 * JSON 文件检查点存储
 * 实现 CheckpointStorageCallback 接口
 */
export class JsonCheckpointStorage implements CheckpointStorageCallback {
  private metadataIndex: Map<string, { metadata: CheckpointStorageMetadata; filePath: string }> = new Map();
  private initialized: boolean = false;
  private lockFiles: Map<string, Promise<void>> = new Map();

  constructor(private readonly config: JsonCheckpointStorageConfig) {}

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
  private getFilePath(checkpointId: string): string {
    const safeId = this.sanitizeId(checkpointId);
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
   * 保存检查点
   */
  async save(
    id: string,
    data: Uint8Array,
    metadata: CheckpointStorageMetadata
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
          `Failed to serialize checkpoint: ${id}`,
          id,
          error as Error
        );
      }
    } finally {
      releaseLock();
    }
  }

  /**
   * 加载检查点数据
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
        `Failed to load checkpoint: ${id}`,
        'load',
        { id },
        error as Error
      );
    }
  }

  /**
   * 删除检查点
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
   * 列出检查点ID
   */
  async list(options?: CheckpointListOptions): Promise<string[]> {
    this.ensureInitialized();

    let ids = Array.from(this.metadataIndex.keys());

    // 应用过滤
    if (options) {
      ids = ids.filter(id => {
        const entry = this.metadataIndex.get(id);
        if (!entry) return false;

        const metadata = entry.metadata;

        if (options.threadId && metadata.threadId !== options.threadId) {
          return false;
        }

        if (options.workflowId && metadata.workflowId !== options.workflowId) {
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

    // 按时间戳降序排列
    ids.sort((a, b) => {
      const metaA = this.metadataIndex.get(a)?.metadata;
      const metaB = this.metadataIndex.get(b)?.metadata;
      return (metaB?.timestamp ?? 0) - (metaA?.timestamp ?? 0);
    });

    // 分页
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? ids.length;

    return ids.slice(offset, offset + limit);
  }

  /**
   * 检查检查点是否存在
   */
  async exists(id: string): Promise<boolean> {
    this.ensureInitialized();
    return this.metadataIndex.has(id);
  }

  /**
   * 获取元数据
   */
  async getMetadata(id: string): Promise<CheckpointStorageMetadata | null> {
    this.ensureInitialized();
    const entry = this.metadataIndex.get(id);
    return entry?.metadata ?? null;
  }

  /**
   * 清空所有检查点
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
