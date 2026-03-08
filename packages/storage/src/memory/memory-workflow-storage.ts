/**
 * 内存工作流存储实现
 * 用于测试和临时存储场景
 */

import type {
  WorkflowStorageMetadata,
  WorkflowListOptions,
  WorkflowVersionInfo,
  WorkflowVersionListOptions
} from '@modular-agent/types';
import type { WorkflowStorageCallback } from '../types/workflow-callback.js';

/**
 * 工作流存储条目
 */
interface WorkflowEntry {
  data: Uint8Array;
  metadata: WorkflowStorageMetadata;
}

/**
 * 版本存储条目
 */
interface VersionEntry {
  data: Uint8Array;
  createdAt: number;
  changeNote?: string;
}

/**
 * 内存工作流存储
 * 实现 WorkflowStorageCallback 接口
 * 适用于测试和临时存储场景
 */
export class MemoryWorkflowStorage implements WorkflowStorageCallback {
  private store: Map<string, WorkflowEntry> = new Map();
  private versionStore: Map<string, Map<string, VersionEntry>> = new Map();

  async saveWorkflow(
    workflowId: string,
    data: Uint8Array,
    metadata: WorkflowStorageMetadata
  ): Promise<void> {
    this.store.set(workflowId, {
      data: new Uint8Array(data),
      metadata
    });
  }

  async loadWorkflow(workflowId: string): Promise<Uint8Array | null> {
    const entry = this.store.get(workflowId);
    if (!entry) {
      return null;
    }
    return new Uint8Array(entry.data);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    this.store.delete(workflowId);
    this.versionStore.delete(workflowId);
  }

  async listWorkflows(options?: WorkflowListOptions): Promise<string[]> {
    let ids = Array.from(this.store.keys());

    if (options) {
      ids = ids.filter(id => {
        const entry = this.store.get(id);
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
      const metaA = this.store.get(a)?.metadata;
      const metaB = this.store.get(b)?.metadata;

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

  async workflowExists(workflowId: string): Promise<boolean> {
    return this.store.has(workflowId);
  }

  async getWorkflowMetadata(workflowId: string): Promise<WorkflowStorageMetadata | null> {
    const entry = this.store.get(workflowId);
    return entry?.metadata ?? null;
  }

  async updateWorkflowMetadata(
    workflowId: string,
    metadata: Partial<WorkflowStorageMetadata>
  ): Promise<void> {
    const entry = this.store.get(workflowId);
    if (entry) {
      entry.metadata = {
        ...entry.metadata,
        ...metadata,
        updatedAt: Date.now()
      };
    }
  }

  // ==================== 版本管理 ====================

  async saveWorkflowVersion(
    workflowId: string,
    version: string,
    data: Uint8Array,
    changeNote?: string
  ): Promise<void> {
    if (!this.versionStore.has(workflowId)) {
      this.versionStore.set(workflowId, new Map());
    }

    const versions = this.versionStore.get(workflowId)!;
    versions.set(version, {
      data: new Uint8Array(data),
      createdAt: Date.now(),
      changeNote
    });
  }

  async listWorkflowVersions(
    workflowId: string,
    options?: WorkflowVersionListOptions
  ): Promise<WorkflowVersionInfo[]> {
    const versions = this.versionStore.get(workflowId);
    if (!versions) {
      return [];
    }

    const currentEntry = this.store.get(workflowId);
    const currentVersion = currentEntry?.metadata.version;

    const versionList: WorkflowVersionInfo[] = [];
    for (const [version, entry] of versions) {
      versionList.push({
        version,
        createdAt: entry.createdAt,
        changeNote: entry.changeNote,
        isCurrent: version === currentVersion
      });
    }

    // 按创建时间降序排序
    versionList.sort((a, b) => b.createdAt - a.createdAt);

    // 分页
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? versionList.length;
    return versionList.slice(offset, offset + limit);
  }

  async loadWorkflowVersion(workflowId: string, version: string): Promise<Uint8Array | null> {
    const versions = this.versionStore.get(workflowId);
    if (!versions) {
      return null;
    }

    const entry = versions.get(version);
    if (!entry) {
      return null;
    }

    return new Uint8Array(entry.data);
  }

  async deleteWorkflowVersion(workflowId: string, version: string): Promise<void> {
    const versions = this.versionStore.get(workflowId);
    if (versions) {
      versions.delete(version);
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.versionStore.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
