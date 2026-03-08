/**
 * 内存任务存储实现
 * 用于测试和临时存储场景
 */

import type {
  TaskStorageMetadata,
  TaskListOptions,
  TaskStats,
  TaskStatsOptions,
  TaskStatus
} from '@modular-agent/types';
import type { TaskStorageCallback } from '../types/task-callback.js';

/**
 * 任务存储条目
 */
interface TaskEntry {
  data: Uint8Array;
  metadata: TaskStorageMetadata;
}

/**
 * 内存任务存储
 * 实现 TaskStorageCallback 接口
 * 适用于测试和临时存储场景
 */
export class MemoryTaskStorage implements TaskStorageCallback {
  private store: Map<string, TaskEntry> = new Map();

  async saveTask(
    taskId: string,
    data: Uint8Array,
    metadata: TaskStorageMetadata
  ): Promise<void> {
    this.store.set(taskId, {
      data: new Uint8Array(data),
      metadata
    });
  }

  async loadTask(taskId: string): Promise<Uint8Array | null> {
    const entry = this.store.get(taskId);
    if (!entry) {
      return null;
    }
    return new Uint8Array(entry.data);
  }

  async deleteTask(taskId: string): Promise<void> {
    this.store.delete(taskId);
  }

  async listTasks(options?: TaskListOptions): Promise<string[]> {
    let ids = Array.from(this.store.keys());

    if (options) {
      ids = ids.filter(id => {
        const entry = this.store.get(id);
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
      const metaA = this.store.get(a)?.metadata;
      const metaB = this.store.get(b)?.metadata;

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

  async taskExists(taskId: string): Promise<boolean> {
    return this.store.has(taskId);
  }

  async getTaskMetadata(taskId: string): Promise<TaskStorageMetadata | null> {
    const entry = this.store.get(taskId);
    return entry?.metadata ?? null;
  }

  async getTaskStats(options?: TaskStatsOptions): Promise<TaskStats> {
    let entries = Array.from(this.store.values());

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
    const cutoffTime = Date.now() - retentionTime;
    let cleanedCount = 0;

    for (const [id, entry] of this.store) {
      const meta = entry.metadata;
      if (
        (meta.status === 'COMPLETED' ||
          meta.status === 'FAILED' ||
          meta.status === 'CANCELLED' ||
          meta.status === 'TIMEOUT') &&
        meta.completeTime &&
        meta.completeTime < cutoffTime
      ) {
        this.store.delete(id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
