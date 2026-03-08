/**
 * JSON 文件存储提供者
 * 基于文件系统的存储实现
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  StorageProvider,
  ListOptions,
  ListResult,
  StorageMetadata
} from '../../types/index.js';
import { StorageError, EntityNotFoundError, SerializationError } from '../../types/storage-errors.js';

/**
 * JSON 存储配置
 */
export interface JsonStorageConfig {
  /** 基础目录路径 */
  baseDir: string;
  /** 实体类型（用于子目录命名） */
  entityType: string;
  /** 是否启用文件锁 */
  enableFileLock?: boolean;
  /** 是否启用元数据索引 */
  enableMetadataIndex?: boolean;
}

/**
 * 存储文件内容格式
 */
interface StorageFileContent<T> {
  id: string;
  data: T;
  metadata: StorageMetadata;
}

/**
 * JSON 文件存储提供者
 */
export class JsonStorageProvider<T> implements StorageProvider<T> {
  private metadataIndex: Map<string, StorageMetadata> = new Map();
  private initialized: boolean = false;
  private lockFiles: Map<string, Promise<void>> = new Map();

  constructor(private readonly config: JsonStorageConfig) {}

  /**
   * 初始化存储
   * 创建必要的目录结构
   */
  async initialize(): Promise<void> {
    const entityDir = path.join(this.config.baseDir, this.config.entityType);
    await fs.mkdir(entityDir, { recursive: true });

    // 加载现有元数据索引
    if (this.config.enableMetadataIndex !== false) {
      await this.loadMetadataIndex();
    }

    this.initialized = true;
  }

  /**
   * 加载元数据索引
   */
  private async loadMetadataIndex(): Promise<void> {
    const entityDir = path.join(this.config.baseDir, this.config.entityType);

    try {
      // 递归遍历目录加载所有元数据
      await this.loadMetadataFromDir(entityDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 递归加载目录中的元数据
   */
  private async loadMetadataFromDir(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.loadMetadataFromDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const parsed = JSON.parse(content) as StorageFileContent<T>;
            if (parsed.id && parsed.metadata) {
              this.metadataIndex.set(parsed.id, parsed.metadata);
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
   * 如果有 parentId，则按 {entityType}/{parentId}/{id}.json 组织
   * 否则按 {entityType}/{id}.json 组织
   */
  private getFilePath(id: string, parentId?: string): string {
    const safeId = this.sanitizeId(id);
    if (parentId) {
      const safeParentId = this.sanitizeId(parentId);
      return path.join(
        this.config.baseDir,
        this.config.entityType,
        safeParentId,
        `${safeId}.json`
      );
    }
    return path.join(
      this.config.baseDir,
      this.config.entityType,
      `${safeId}.json`
    );
  }

  /**
   * 清理 ID，防止路径遍历攻击
   */
  private sanitizeId(id: string): string {
    // 移除路径分隔符和危险字符
    return id.replace(/[\/\\:\*\?"<>\|]/g, '_');
  }

  /**
   * 获取文件锁
   */
  private async acquireLock(filePath: string): Promise<() => void> {
    if (!this.config.enableFileLock) {
      return () => {};
    }

    // 简单的锁机制：等待现有锁释放
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

  async save(id: string, entity: T, metadata?: StorageMetadata): Promise<void> {
    this.ensureInitialized();

    const filePath = this.getFilePath(id, metadata?.parentId);
    const releaseLock = await this.acquireLock(filePath);

    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      const now = Date.now();
      const existingMetadata = this.metadataIndex.get(id);

      const fullMetadata: StorageMetadata = {
        createdAt: existingMetadata?.createdAt ?? now,
        updatedAt: now,
        modelType: this.config.entityType,
        ...metadata
      };

      // 处理 Uint8Array 序列化
      let serializedData: unknown = entity;
      if (entity instanceof Uint8Array) {
        serializedData = {
          __type: 'Uint8Array',
          data: Array.from(entity)
        };
      }

      const content: StorageFileContent<T> = {
        id,
        data: serializedData as T,
        metadata: fullMetadata
      };

      try {
        const jsonContent = JSON.stringify(content, null, 2);
        await fs.writeFile(filePath, jsonContent, 'utf-8');
        this.metadataIndex.set(id, fullMetadata);
      } catch (error) {
        throw new SerializationError(
          `Failed to serialize entity: ${id}`,
          id,
          error as Error
        );
      }
    } finally {
      releaseLock();
    }
  }

  async load(id: string): Promise<T | null> {
    this.ensureInitialized();

    // 尝试从元数据索引获取 parentId
    const metadata = this.metadataIndex.get(id);
    const filePath = this.getFilePath(id, metadata?.parentId);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as StorageFileContent<T>;
      
      // 处理 Uint8Array 反序列化
      let data = parsed.data;
      if (data && typeof data === 'object' && (data as Record<string, unknown>)['__type'] === 'Uint8Array') {
        data = new Uint8Array((data as Record<string, unknown>)['data'] as number[]) as T;
      }
      
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new StorageError(
        `Failed to load entity: ${id}`,
        'load',
        { id },
        error as Error
      );
    }
  }

  async delete(id: string): Promise<void> {
    this.ensureInitialized();

    const metadata = this.metadataIndex.get(id);
    const filePath = this.getFilePath(id, metadata?.parentId);
    const releaseLock = await this.acquireLock(filePath);

    try {
      try {
        await fs.unlink(filePath);
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

  async exists(id: string): Promise<boolean> {
    this.ensureInitialized();

    const metadata = this.metadataIndex.get(id);
    const filePath = this.getFilePath(id, metadata?.parentId);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(options?: ListOptions): Promise<ListResult<string>> {
    this.ensureInitialized();

    let ids = Array.from(this.metadataIndex.keys());

    // 应用过滤
    if (options?.filter) {
      ids = ids.filter(id => {
        const metadata = this.metadataIndex.get(id);
        if (!metadata) return false;

        return Object.entries(options.filter!).every(([key, value]) => {
          // 先检查顶层属性
          let metaValue = (metadata as unknown as Record<string, unknown>)[key];
          
          // 如果顶层没有，检查 customFields
          if (metaValue === undefined && metadata.customFields) {
            metaValue = metadata.customFields[key];
          }
          
          if (Array.isArray(value) && Array.isArray(metaValue)) {
            // 标签匹配：检查是否有交集
            return value.some(v => metaValue.includes(v));
          }
          return metaValue === value;
        });
      });
    }

    // 排序
    if (options?.orderBy) {
      ids.sort((a, b) => {
        const metaA = this.metadataIndex.get(a);
        const metaB = this.metadataIndex.get(b);

        if (!metaA || !metaB) return 0;

        const valueA = (metaA as unknown as Record<string, unknown>)[options.orderBy!];
        const valueB = (metaB as unknown as Record<string, unknown>)[options.orderBy!];

        if (valueA === undefined || valueB === undefined) return 0;

        let comparison = 0;
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          comparison = valueA - valueB;
        } else {
          comparison = String(valueA).localeCompare(String(valueB));
        }

        return options.orderDirection === 'desc' ? -comparison : comparison;
      });
    }

    // 默认按更新时间降序
    if (!options?.orderBy) {
      ids.sort((a, b) => {
        const metaA = this.metadataIndex.get(a);
        const metaB = this.metadataIndex.get(b);
        return (metaB?.updatedAt ?? 0) - (metaA?.updatedAt ?? 0);
      });
    }

    const total = ids.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? ids.length;

    const paginatedIds = ids.slice(offset, offset + limit);

    return {
      items: paginatedIds,
      total,
      hasMore: offset + limit < total
    };
  }

  async getMetadata(id: string): Promise<StorageMetadata | null> {
    this.ensureInitialized();

    const metadata = this.metadataIndex.get(id);
    return metadata ?? null;
  }

  async saveBatch(items: Array<{ id: string; entity: T; metadata?: StorageMetadata }>): Promise<void> {
    this.ensureInitialized();

    for (const item of items) {
      await this.save(item.id, item.entity, item.metadata);
    }
  }

  async deleteBatch(ids: string[]): Promise<void> {
    this.ensureInitialized();

    for (const id of ids) {
      await this.delete(id);
    }
  }

  async clear(): Promise<void> {
    this.ensureInitialized();

    const entityDir = path.join(this.config.baseDir, this.config.entityType);

    try {
      await fs.rm(entityDir, { recursive: true });
      await fs.mkdir(entityDir, { recursive: true });
      this.metadataIndex.clear();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async close(): Promise<void> {
    this.metadataIndex.clear();
    this.initialized = false;
  }
}
