/**
 * 全局消息存储
 * 统一管理所有线程的消息历史，支持引用计数机制和批次版本控制
 *
 * 核心职责：
 * 1. 存储所有线程的完整消息历史
 * 2. 管理消息历史的引用计数
 * 3. 支持批次级别的消息版本控制
 * 4. 提供消息历史的查询和清理功能
 *
 * 设计原则：
 * - 单例模式，全局唯一实例
 * - 线程安全，支持并发访问
 * - 引用计数，自动清理不再使用的消息历史
 * - 批次版本控制，支持不同批次的消息快照
 */

import type { LLMMessage } from '@modular-agent/types';

/**
 * 批次消息快照
 */
interface BatchSnapshot {
  batchId: number;
  messages: LLMMessage[];
  timestamp: number;
}

/**
 * 全局消息存储类
 */
class GlobalMessageStorage {
  private messageHistories: Map<string, LLMMessage[]> = new Map();
  private referenceCounts: Map<string, number> = new Map();
  // 批次快照：threadId -> Map<batchId, snapshot>
  private batchSnapshots: Map<string, Map<number, BatchSnapshot>> = new Map();

  /**
   * 存储消息历史
   * @param threadId 线程ID
   * @param messages 消息数组
   */
  storeMessages(threadId: string, messages: LLMMessage[]): void {
    // 深度复制消息数组，避免外部修改影响存储
    this.messageHistories.set(threadId, messages.map(msg => ({ ...msg })));
  }

  /**
   * 获取消息历史
   * @param threadId 线程ID
   * @returns 消息数组的副本，如果不存在则返回 undefined
   */
  getMessages(threadId: string): LLMMessage[] | undefined {
    const messages = this.messageHistories.get(threadId);
    if (!messages) {
      return undefined;
    }
    // 返回副本，避免外部修改影响存储
    return messages.map(msg => ({ ...msg }));
  }

  /**
   * 添加引用计数
   * @param threadId 线程ID
   */
  addReference(threadId: string): void {
    const count = this.referenceCounts.get(threadId) || 0;
    this.referenceCounts.set(threadId, count + 1);
  }

  /**
   * 移除引用计数，自动清理不再使用的消息
   * @param threadId 线程ID
   */
  removeReference(threadId: string): void {
    const count = this.referenceCounts.get(threadId) || 0;
    if (count <= 1) {
      this.cleanupThread(threadId);
      this.referenceCounts.delete(threadId);
    } else {
      this.referenceCounts.set(threadId, count - 1);
    }
  }

  /**
   * 清理线程的消息历史
   * @param threadId 线程ID
   */
  cleanupThread(threadId: string): void {
    this.messageHistories.delete(threadId);
    this.referenceCounts.delete(threadId);
    this.batchSnapshots.delete(threadId);
  }

  /**
   * 记录批次消息快照
   * @param threadId 线程ID
   * @param batchId 批次ID
   * @param messages 当前消息列表
   */
  saveBatchSnapshot(threadId: string, batchId: number, messages: LLMMessage[]): void {
    if (!this.batchSnapshots.has(threadId)) {
      this.batchSnapshots.set(threadId, new Map());
    }
    const snapshots = this.batchSnapshots.get(threadId)!;
    snapshots.set(batchId, {
      batchId,
      messages: messages.map(msg => ({ ...msg })),
      timestamp: Date.now()
    });
  }

  /**
   * 获取批次消息快照
   * @param threadId 线程ID
   * @param batchId 批次ID
   * @returns 快照中的消息副本，如果不存在则返回 undefined
   */
  getBatchSnapshot(threadId: string, batchId: number): LLMMessage[] | undefined {
    const snapshots = this.batchSnapshots.get(threadId);
    if (!snapshots) {
      return undefined;
    }
    const snapshot = snapshots.get(batchId);
    if (!snapshot) {
      return undefined;
    }
    return snapshot.messages.map(msg => ({ ...msg }));
  }

  /**
   * 清理指定线程的批次快照（用于回退操作）
   * @param threadId 线程ID
   * @param keepBatchId 保留此批次及之前的快照，删除之后的快照
   */
  cleanupBatchSnapshotsAfter(threadId: string, keepBatchId: number): void {
    const snapshots = this.batchSnapshots.get(threadId);
    if (!snapshots) {
      return;
    }
    const batchesToRemove: number[] = [];
    for (const [batchId] of snapshots) {
      if (batchId > keepBatchId) {
        batchesToRemove.push(batchId);
      }
    }
    batchesToRemove.forEach(batchId => snapshots.delete(batchId));
  }

  /**
   * 清空所有消息历史
   */
  clearAll(): void {
    this.messageHistories.clear();
    this.referenceCounts.clear();
    this.batchSnapshots.clear();
  }

  /**
   * 获取存储统计信息
   * @returns 统计信息
   */
  getStats(): {
    threadCount: number;
    totalMessages: number;
    totalReferences: number;
    totalBatchSnapshots: number;
  } {
    let totalMessages = 0;
    for (const messages of this.messageHistories.values()) {
      totalMessages += messages.length;
    }

    let totalReferences = 0;
    for (const count of this.referenceCounts.values()) {
      totalReferences += count;
    }

    let totalBatchSnapshots = 0;
    for (const snapshots of this.batchSnapshots.values()) {
      totalBatchSnapshots += snapshots.size;
    }

    return {
      threadCount: this.messageHistories.size,
      totalMessages,
      totalReferences,
      totalBatchSnapshots
    };
  }
}

/**
 * 全局消息存储单例实例
 */
export const globalMessageStorage = new GlobalMessageStorage();

/**
 * 导出GlobalMessageStorage类供测试使用
 */
export { GlobalMessageStorage };
