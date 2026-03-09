/**
 * MessageHistoryManager - 消息历史管理器
 * 管理单个线程的消息历史和批次快照
 *
 * 核心职责：
 * 1. 管理线程的消息历史
 * 2. 支持批次级别的消息版本控制
 * 3. 提供消息历史的查询和清理功能
 * 4. 支持状态快照和恢复（用于检查点）
 *
 * 设计原则：
 * - 线程隔离：每个线程独立持有自己的消息管理器实例
 * - 批次版本控制：支持不同批次的消息快照
 * - 实现 LifecycleCapable 接口，支持快照和恢复
 */

import type { LLMMessage } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';
import type { LifecycleCapable } from './lifecycle-capable.js';

/**
 * 批次消息快照
 */
interface BatchSnapshot {
  batchId: number;
  messages: LLMMessage[];
  timestamp: number;
}

/**
 * 消息历史状态接口
 */
export interface MessageHistoryState {
  messages: LLMMessage[];
  batchSnapshots: Map<number, BatchSnapshot>;
}

/**
 * 消息历史管理器类
 */
export class MessageHistoryManager implements LifecycleCapable<MessageHistoryState> {
  private messages: LLMMessage[] = [];
  private batchSnapshots: Map<number, BatchSnapshot> = new Map();

  constructor(private threadId: string) {}

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  getThreadId(): string {
    return this.threadId;
  }

  /**
   * 保存消息历史
   * @param messages 消息数组
   */
  saveMessages(messages: LLMMessage[]): void {
    // 深度复制消息数组，避免外部修改
    this.messages = messages.map(msg => ({ ...msg }));
  }

  /**
   * 获取消息历史
   * @returns 消息数组的副本
   */
  getMessages(): LLMMessage[] {
    return this.messages.map(msg => ({ ...msg }));
  }

  /**
   * 记录批次消息快照
   * @param batchId 批次ID
   * @param messages 当前消息列表
   */
  saveBatchSnapshot(batchId: number, messages: LLMMessage[]): void {
    this.batchSnapshots.set(batchId, {
      batchId,
      messages: messages.map(msg => ({ ...msg })),
      timestamp: now()
    });
  }

  /**
   * 获取批次消息快照
   * @param batchId 批次ID
   * @returns 快照中的消息副本，如果不存在则返回 undefined
   */
  getBatchSnapshot(batchId: number): LLMMessage[] | undefined {
    const snapshot = this.batchSnapshots.get(batchId);
    if (!snapshot) {
      return undefined;
    }
    return snapshot.messages.map(msg => ({ ...msg }));
  }

  /**
   * 清理指定线程的批次快照（用于回退操作）
   * @param keepBatchId 保留此批次及之前的快照，删除之后的快照
   */
  cleanupBatchSnapshotsAfter(keepBatchId: number): void {
    const batchesToRemove: number[] = [];
    for (const [batchId] of this.batchSnapshots) {
      if (batchId > keepBatchId) {
        batchesToRemove.push(batchId);
      }
    }
    batchesToRemove.forEach(batchId => this.batchSnapshots.delete(batchId));
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): {
    totalMessages: number;
    totalBatchSnapshots: number;
  } {
    return {
      totalMessages: this.messages.length,
      totalBatchSnapshots: this.batchSnapshots.size
    };
  }

  /**
   * 创建状态快照
   * @returns 消息历史状态快照
   */
  createSnapshot(): MessageHistoryState {
    return {
      messages: this.getMessages(),
      batchSnapshots: new Map(
        Array.from(this.batchSnapshots.entries()).map(([batchId, snapshot]) => [
          batchId,
          {
            batchId: snapshot.batchId,
            messages: snapshot.messages.map(msg => ({ ...msg })),
            timestamp: snapshot.timestamp
          }
        ])
      )
    };
  }

  /**
   * 从快照恢复状态
   * @param snapshot 消息历史状态快照
   */
  restoreFromSnapshot(snapshot: MessageHistoryState): void {
    this.messages = snapshot.messages.map(msg => ({ ...msg }));
    this.batchSnapshots = new Map(
      Array.from(snapshot.batchSnapshots.entries()).map(([batchId, snapshot]) => [
        batchId,
        {
          batchId: snapshot.batchId,
          messages: snapshot.messages.map(msg => ({ ...msg })),
          timestamp: snapshot.timestamp
        }
      ])
    );
  }

  /**
   * 清理资源
   * 清空消息历史和批次快照
   */
  cleanup(): void {
    this.messages = [];
    this.batchSnapshots.clear();
  }
}
