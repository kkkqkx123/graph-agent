/**
 * Thread状态管理器
 * 负责Thread的完整生命周期状态管理
 */

import type {
  Thread,
  ThreadOptions,
  ThreadVariable,
  NodeExecutionResult,
  ExecutionHistoryEntry
} from '../../types/thread';
import { ThreadStatus } from '../../types/thread';
import { IDUtils } from '../../types/common';

/**
 * Thread状态管理器
 */
export class ThreadStateManager {
  private threads: Map<string, Thread> = new Map();

  /**
   * 创建Thread状态
   */
  createThread(workflowId: string, workflowVersion: string, options: ThreadOptions = {}): Thread {
    const threadId = IDUtils.generate();
    const now = Date.now();

    const thread: Thread = {
      id: threadId,
      workflowId,
      workflowVersion,
      status: ThreadStatus.CREATED,
      currentNodeId: '',
      variables: [],
      variableValues: {},
      input: options.input || {},
      output: {},
      nodeResults: new Map(),
      nodeResults: [],
      startTime: now,
      errors: [],
      metadata: {
        creator: options.input?.['creator'],
        tags: options.input?.['tags']
      }
    };

    this.threads.set(threadId, thread);
    return thread;
  }

  /**
   * 更新Thread状态
   */
  updateThreadStatus(threadId: string, status: ThreadStatus): void {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    thread.status = status;

    if (status === ThreadStatus.COMPLETED ||
      status === ThreadStatus.FAILED ||
      status === ThreadStatus.CANCELLED ||
      status === ThreadStatus.TIMEOUT) {
      thread.endTime = Date.now();
    }
  }

  /**
   * 获取当前节点
   */
  getCurrentNode(threadId: string): string | null {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    return thread.currentNodeId || null;
  }

  /**
   * 设置当前节点
   */
  setCurrentNode(threadId: string, nodeId: string): void {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    thread.currentNodeId = nodeId;
  }

  /**
   * 获取Thread
   */
  getThread(threadId: string): Thread | null {
    return this.threads.get(threadId) || null;
  }

  /**
   * 序列化Thread
   */
  serializeThread(threadId: string): string {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    // 将Map转换为普通对象以便序列化
    const serializableThread = {
      ...thread,
      nodeResults: Array.from(thread.nodeResults.entries()),
      variableValues: thread.variableValues
    };

    return JSON.stringify(serializableThread);
  }

  /**
   * 反序列化Thread
   */
  deserializeThread(data: string): Thread {
    const serializableThread = JSON.parse(data);

    // 将普通对象转换回Map
    const thread: Thread = {
      ...serializableThread,
      nodeResults: new Map(serializableThread.nodeResults),
      variableValues: serializableThread.variableValues || {}
    };

    this.threads.set(thread.id, thread);
    return thread;
  }

  /**
   * 删除Thread
   */
  deleteThread(threadId: string): void {
    this.threads.delete(threadId);
  }

  /**
   * 获取所有Thread
   */
  getAllThreads(): Thread[] {
    return Array.from(this.threads.values());
  }

  /**
   * 清空所有Thread
   */
  clearAll(): void {
    this.threads.clear();
  }

  /**
   * 注册Thread
   * @param thread Thread实例
   */
  registerThread(thread: Thread): void {
    this.threads.set(thread.id, thread);
  }
}