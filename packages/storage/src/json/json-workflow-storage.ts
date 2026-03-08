/**
 * JSON 文件工作流存储实现
 * 基于 JSON 文件系统的工作流持久化存储
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  WorkflowStorageMetadata,
  WorkflowListOptions,
  WorkflowVersionInfo,
  WorkflowVersionListOptions
} from '@modular-agent/types';
import type { WorkflowStorageCallback } from '../types/workflow-callback.js';
import { StorageError, SerializationError } from '../types/storage-errors.js';

/**
 * JSON 工作流存储配置
 */
export interface JsonWorkflowStorageConfig {
  /** 基础目录路径 */
  baseDir: string;
  /** 是否启用文件锁 */
  enableFileLock?: boolean;
}

/**
 * 工作流存储文件内容格式
 */
interface WorkflowFileContent {
  id: string;
  data: number[];
  metadata: WorkflowStorageMetadata;
}

/**
 * 版本存储文件内容格式
 */
interface VersionFileContent {
  workflowId: string;
  version: string;
  data: number[];
  changeNote?: string;
  createdAt: number;
}

/**
 * JSON 文件工作流存储
 * 实现 WorkflowStorageCallback 接口
 */
export class JsonWorkflowStorage implements WorkflowStorageCallback {
  private metadataIndex: Map<string, { metadata: WorkflowStorageMetadata; filePath: string }> = new Map();
  private initialized: boolean = false;
  private lockFiles: Map<string, Promise<void>> = new Map();

  constructor(private readonly config: JsonWorkflowStorageConfig) {}

  async initialize(): Promise<void> {
    await fs.mkdir(this.config.baseDir, { recursive: true });
    await fs.mkdir(path.join(this.config.baseDir, 'versions'), { recursive: true });
    await this.loadMetadataIndex();
    this.initialized = true;
  }

  private async loadMetadataIndex(): Promise<void> {
    try {
      const entries = await fs.readdir(this.config.baseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const filePath = path.join(this.config.baseDir, entry.name);
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content) as WorkflowFileContent;
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

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        'initialize'
      );
    }
  }

  private getFilePath(workflowId: string): string {
    const safeId = this.sanitizeId(workflowId);
    return path.join(this.config.baseDir, `${safeId}.json`);
  }

  private getVersionFilePath(workflowId: string, version: string): string {
    const safeId = this.sanitizeId(workflowId);
    const safeVersion = this.sanitizeId(version);
    return path.join(this.config.baseDir, 'versions', `${safeId}_${safeVersion}.json`);
  }

  private sanitizeId(id: string): string {
    return id.replace(/[\/\\:\*\?"<>\|]/g, '_');
  }

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

  async save(
    id: string,
    data: Uint8Array,
    metadata: WorkflowStorageMetadata
  ): Promise<void> {
    this.ensureInitialized();

    const filePath = this.getFilePath(id);
    const releaseLock = await this.acquireLock(filePath);

    try {
      const content: WorkflowFileContent = {
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
          `Failed to serialize workflow: ${id}`,
          id,
          error as Error
        );
      }
    } finally {
      releaseLock();
    }
  }

  async load(id: string): Promise<Uint8Array | null> {
    this.ensureInitialized();

    const indexEntry = this.metadataIndex.get(id);
    if (!indexEntry) {
      return null;
    }

    try {
      const content = await fs.readFile(indexEntry.filePath, 'utf-8');
      const parsed = JSON.parse(content) as WorkflowFileContent;
      return new Uint8Array(parsed.data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new StorageError(
        `Failed to load workflow: ${id}`,
        'load',
        { id },
        error as Error
      );
    }
  }

  async delete(id: string): Promise<void> {
    this.ensureInitialized();

    const indexEntry = this.metadataIndex.get(id);
    if (!indexEntry) {
      return;
    }

    const releaseLock = await this.acquireLock(indexEntry.filePath);

    try {
      // 删除工作流文件
      try {
        await fs.unlink(indexEntry.filePath);
        this.metadataIndex.delete(id);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      // 删除所有版本文件
      const versionsDir = path.join(this.config.baseDir, 'versions');
      const safeId = this.sanitizeId(id);
      try {
        const versionFiles = await fs.readdir(versionsDir);
        for (const file of versionFiles) {
          if (file.startsWith(`${safeId}_`) && file.endsWith('.json')) {
            await fs.unlink(path.join(versionsDir, file));
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    } finally {
      releaseLock();
    }
  }

  async list(options?: WorkflowListOptions): Promise<string[]> {
    this.ensureInitialized();

    let ids = Array.from(this.metadataIndex.keys());

    if (options) {
      ids = ids.filter(id => {
        const entry = this.metadataIndex.get(id);
        if (!entry) return false;

        const metadata = entry.metadata;

        if (options.name && !metadata.name.toLowerCase().includes(options.name.toLowerCase())) {
          return false;
        }

        if (options.author && metadata.author !== options.author) {
          return false;
        }

        if (options.category && metadata.category !== options.category) {
          return false;
        }

        if (options.enabled !== undefined && metadata.enabled !== options.enabled) {
          return false;
        }

        if (options.createdAtFrom && metadata.createdAt < options.createdAtFrom) {
          return false;
        }

        if (options.createdAtTo && metadata.createdAt > options.createdAtTo) {
          return false;
        }

        if (options.updatedAtFrom && metadata.updatedAt < options.updatedAtFrom) {
          return false;
        }

        if (options.updatedAtTo && metadata.updatedAt > options.updatedAtTo) {
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

    const sortBy = options?.sortBy ?? 'updatedAt';
    const sortOrder = options?.sortOrder ?? 'desc';

    ids.sort((a, b) => {
      const metaA = this.metadataIndex.get(a)?.metadata;
      const metaB = this.metadataIndex.get(b)?.metadata;

      let valueA: number | string;
      let valueB: number | string;

      switch (sortBy) {
        case 'name':
          valueA = metaA?.name ?? '';
          valueB = metaB?.name ?? '';
          return sortOrder === 'asc'
            ? valueA.localeCompare(valueB as string)
            : (valueB as string).localeCompare(valueA as string);
        case 'createdAt':
          valueA = metaA?.createdAt ?? 0;
          valueB = metaB?.createdAt ?? 0;
          break;
        case 'updatedAt':
        default:
          valueA = metaA?.updatedAt ?? 0;
          valueB = metaB?.updatedAt ?? 0;
          break;
      }

      return sortOrder === 'asc' ? (valueA as number) - (valueB as number) : (valueB as number) - (valueA as number);
    });

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? ids.length;

    return ids.slice(offset, offset + limit);
  }

  async exists(id: string): Promise<boolean> {
    this.ensureInitialized();
    return this.metadataIndex.has(id);
  }

  async getMetadata(id: string): Promise<WorkflowStorageMetadata | null> {
    this.ensureInitialized();
    const entry = this.metadataIndex.get(id);
    return entry?.metadata ?? null;
  }

  async updateWorkflowMetadata(
    workflowId: string,
    metadata: Partial<WorkflowStorageMetadata>
  ): Promise<void> {
    this.ensureInitialized();

    const indexEntry = this.metadataIndex.get(workflowId);
    if (!indexEntry) {
      throw new StorageError(
        `Workflow not found: ${workflowId}`,
        'updateMetadata',
        { workflowId }
      );
    }

    const updatedMetadata: WorkflowStorageMetadata = {
      ...indexEntry.metadata,
      ...metadata,
      updatedAt: Date.now()
    };

    const data = await this.load(workflowId);
    if (data) {
      await this.save(workflowId, data, updatedMetadata);
    }
  }

  // ==================== 版本管理 ====================

  async saveWorkflowVersion(
    workflowId: string,
    version: string,
    data: Uint8Array,
    changeNote?: string
  ): Promise<void> {
    this.ensureInitialized();

    const filePath = this.getVersionFilePath(workflowId, version);
    const releaseLock = await this.acquireLock(filePath);

    try {
      const content: VersionFileContent = {
        workflowId,
        version,
        data: Array.from(data),
        changeNote,
        createdAt: Date.now()
      };

      const jsonContent = JSON.stringify(content, null, 2);
      await fs.writeFile(filePath, jsonContent, 'utf-8');
    } catch (error) {
      throw new SerializationError(
        `Failed to save workflow version: ${workflowId}@${version}`,
        workflowId,
        error as Error
      );
    } finally {
      releaseLock();
    }
  }

  async listWorkflowVersions(
    workflowId: string,
    options?: WorkflowVersionListOptions
  ): Promise<WorkflowVersionInfo[]> {
    this.ensureInitialized();

    const versionsDir = path.join(this.config.baseDir, 'versions');
    const safeId = this.sanitizeId(workflowId);
    const versions: WorkflowVersionInfo[] = [];

    try {
      const files = await fs.readdir(versionsDir);
      const currentMetadata = this.metadataIndex.get(workflowId);
      const currentVersion = currentMetadata?.metadata.version;

      for (const file of files) {
        if (file.startsWith(`${safeId}_`) && file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(versionsDir, file), 'utf-8');
            const parsed = JSON.parse(content) as VersionFileContent;
            versions.push({
              version: parsed.version,
              createdAt: parsed.createdAt,
              changeNote: parsed.changeNote,
              isCurrent: parsed.version === currentVersion
            });
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 按创建时间降序排序
      versions.sort((a, b) => b.createdAt - a.createdAt);

      // 分页
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? versions.length;
      return versions.slice(offset, offset + limit);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new StorageError(
        `Failed to list workflow versions: ${workflowId}`,
        'listVersions',
        { workflowId },
        error as Error
      );
    }
  }

  async loadWorkflowVersion(workflowId: string, version: string): Promise<Uint8Array | null> {
    this.ensureInitialized();

    const filePath = this.getVersionFilePath(workflowId, version);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as VersionFileContent;
      return new Uint8Array(parsed.data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new StorageError(
        `Failed to load workflow version: ${workflowId}@${version}`,
        'loadVersion',
        { workflowId, version },
        error as Error
      );
    }
  }

  async deleteWorkflowVersion(workflowId: string, version: string): Promise<void> {
    this.ensureInitialized();

    const filePath = this.getVersionFilePath(workflowId, version);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

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

    // 清空版本目录
    const versionsDir = path.join(this.config.baseDir, 'versions');
    try {
      const files = await fs.readdir(versionsDir);
      for (const file of files) {
        await fs.unlink(path.join(versionsDir, file));
      }
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
