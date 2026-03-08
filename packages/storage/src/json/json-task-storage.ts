/**
 * JSON 文件任务存储实现
 * 基于 JSON 文件系统的任务持久化存储
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  TaskStorageMetadata,
  TaskListOptions,
  TaskStats,
  TaskStatsOptions,
  TaskStatus
} from '@modular-agent/types';
import type { TaskStorageCallback } from '../types/task-callback.js';
import { StorageError, SerializationError } from '../types/storage-errors.js';

/**
 * JSON 任务存储配置
 */
export interface JsonTaskStorageConfig {
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
  data: number[];
  metadata: TaskStorageMetadata;
}

/**
 * JSON 文件任务存储
 * 实现 TaskStorageCallback 接口
 */
export class JsonTaskStorage implements TaskStorageCallback {
  private metadataIndex: Map<string, { metadata: TaskStorageMetadata; filePath: string }> = new Map();
  private initialized: boolean = false;
  private lockFiles: Map<string, Promise<void>> = new Map();

  constructor(private readonly config: JsonTaskStorageConfig) {}

  async initialize(): Promise<void> {
    await fs.mkdir(this.config.baseDir, { recursive: true });
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

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        'initialize'
      );
    }
  }

  private getFilePath(taskId: string): string {
    const safeId = this.sanitizeId(taskId);
    return path.join(this.config.baseDir, `${safeId}.json`);
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
    taskId: string,
    data: Uint8Array,
    metadata: TaskStorageMetadata
  ): Promise<void> {
    this.ensureInitialized();

    const filePath = this.getFilePath(taskId);
    const releaseLock = await this.acquireLock(filePath);

    try {
      const content: StorageFileContent = {
        id: taskId,
        data: Array.from(data),
        metadata
      };

      try {
        const jsonContent = JSON.stringify(content, null, 2);
        await fs.writeFile(filePath, jsonContent, 'utf-8');
        this.metadataIndex.set(taskId, { metadata, filePath });
      } catch (error) {
        throw new SerializationError(
          `Failed to serialize task: ${taskId}`,
          taskId,
          error as Error
        );
      }
    } finally {
      releaseLock();
    }
  }

  async load(taskId: string): Promise<Uint8Array | null> {
    this.ensureInitialized();

    const indexEntry = this.metadataIndex.get(taskId);
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
        `Failed to load task: ${taskId}`,
        'load',
        { taskId },
        error as Error
      );
    }
  }

  async delete(taskId: string): Promise<void> {
    this.ensureInitialized();

    const indexEntry = this.metadataIndex.get(taskId);
    if (!indexEntry) {
      return;
    }

    const releaseLock = await this.acquireLock(indexEntry.filePath);

    try {
      try {
        await fs.unlink(indexEntry.filePath);
        this.metadataIndex.delete(taskId);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    } finally {
      releaseLock();
    }
  }

  async list(options?: TaskListOptions): Promise<string[]> {
    this.ensureInitialized();

    let ids = Array.from(this.metadataIndex.keys());

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

        if (options.status) {
          if (Array.isArray(options.status)) {
            if (!options.status.includes(metadata.status)) {
              return false;
            }
          } else if (metadata.status !== options.status) {
            return false;
          }
        }

        if (options.submitTimeFrom && metadata.submitTime < options.submitTimeFrom) {
          return false;
        }

        if (options.submitTimeTo && metadata.submitTime > options.submitTimeTo) {
          return false;
        }

        if (options.startTimeFrom && (metadata.startTime === undefined || metadata.startTime < options.startTimeFrom)) {
          return false;
        }

        if (options.startTimeTo && (metadata.startTime === undefined || metadata.startTime > options.startTimeTo)) {
          return false;
        }

        if (options.completeTimeFrom && (metadata.completeTime === undefined || metadata.completeTime < options.completeTimeFrom)) {
          return false;
        }

        if (options.completeTimeTo && (metadata.completeTime === undefined || metadata.completeTime > options.completeTimeTo)) {
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

    const sortBy = options?.sortBy ?? 'submitTime';
    const sortOrder = options?.sortOrder ?? 'desc';

    ids.sort((a, b) => {
      const metaA = this.metadataIndex.get(a)?.metadata;
      const metaB = this.metadataIndex.get(b)?.metadata;

      let valueA: number;
      let valueB: number;

      switch (sortBy) {
        case 'submitTime':
          valueA = metaA?.submitTime ?? 0;
          valueB = metaB?.submitTime ?? 0;
          break;
        case 'startTime':
          valueA = metaA?.startTime ?? 0;
          valueB = metaB?.startTime ?? 0;
          break;
        case 'completeTime':
        default:
          valueA = metaA?.completeTime ?? 0;
          valueB = metaB?.completeTime ?? 0;
          break;
      }

      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? ids.length;

    return ids.slice(offset, offset + limit);
  }

  async exists(taskId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.metadataIndex.has(taskId);
  }

  async getMetadata(taskId: string): Promise<TaskStorageMetadata | null> {
    this.ensureInitialized();
    const entry = this.metadataIndex.get(taskId);
    return entry?.metadata ?? null;
  }

  async getTaskStats(options?: TaskStatsOptions): Promise<TaskStats> {
    this.ensureInitialized();

    let entries = Array.from(this.metadataIndex.values());

    // 应用过滤
    if (options?.workflowId) {
      entries = entries.filter(e => e.metadata.workflowId === options.workflowId);
    }

    if (options?.timeFrom) {
      entries = entries.filter(e => e.metadata.submitTime >= options.timeFrom!);
    }

    if (options?.timeTo) {
      entries = entries.filter(e => e.metadata.submitTime <= options.timeTo!);
    }

    // 统计
    const total = entries.length;
    const byStatus: Record<TaskStatus, number> = {
      QUEUED: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
      TIMEOUT: 0
    };

    const byWorkflow: Record<string, number> = {};
    const executionTimes: number[] = [];

    for (const entry of entries) {
      const meta = entry.metadata;

      // 状态统计
      byStatus[meta.status]++;

      // 工作流统计
      if (!byWorkflow[meta.workflowId]) {
        byWorkflow[meta.workflowId] = 0;
      }
      byWorkflow[meta.workflowId]!++;

      // 执行时间统计
      if (meta.status === 'COMPLETED' && meta.startTime && meta.completeTime) {
        executionTimes.push(meta.completeTime - meta.startTime);
      }
    }

    // 计算执行时间统计
    let avgExecutionTime: number | undefined;
    let maxExecutionTime: number | undefined;
    let minExecutionTime: number | undefined;

    if (executionTimes.length > 0) {
      avgExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      maxExecutionTime = Math.max(...executionTimes);
      minExecutionTime = Math.min(...executionTimes);
    }

    const completed = byStatus.COMPLETED;
    const timeoutCount = byStatus.TIMEOUT;

    return {
      total,
      byStatus,
      byWorkflow,
      avgExecutionTime,
      maxExecutionTime,
      minExecutionTime,
      successRate: total > 0 ? completed / total : undefined,
      timeoutRate: total > 0 ? timeoutCount / total : undefined
    };
  }

  async cleanupTasks(retentionTime: number): Promise<number> {
    this.ensureInitialized();

    const cutoffTime = Date.now() - retentionTime;
    let cleanedCount = 0;

    for (const [id, entry] of this.metadataIndex) {
      const meta = entry.metadata;
      if (
        (meta.status === 'COMPLETED' ||
          meta.status === 'FAILED' ||
          meta.status === 'CANCELLED' ||
          meta.status === 'TIMEOUT') &&
        meta.completeTime &&
        meta.completeTime < cutoffTime
      ) {
        await this.delete(id);
        cleanedCount++;
      }
    }

    return cleanedCount;
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
  }

  async close(): Promise<void> {
    this.metadataIndex.clear();
    this.initialized = false;
  }
}

