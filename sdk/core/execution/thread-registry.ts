/**
 * ThreadRegistry - Thread注册表
 * 负责Thread的内存存储和基本查询
 * 不负责状态转换、持久化、序列化
 */

import type { Thread } from '../../types/thread';

/**
 * ThreadRegistry - Thread注册表
 */
export class ThreadRegistry {
  private threads: Map<string, Thread> = new Map();

  /**
   * 注册Thread
   * @param thread Thread实例
   */
  register(thread: Thread): void {
    this.threads.set(thread.id, thread);
  }

  /**
   * 获取Thread
   * @param threadId 线程ID
   * @returns Thread实例或null
   */
  get(threadId: string): Thread | null {
    return this.threads.get(threadId) || null;
  }

  /**
   * 删除Thread
   * @param threadId 线程ID
   */
  delete(threadId: string): void {
    this.threads.delete(threadId);
  }

  /**
   * 获取所有Thread
   * @returns Thread数组
   */
  getAll(): Thread[] {
    return Array.from(this.threads.values());
  }

  /**
   * 清空所有Thread
   */
  clear(): void {
    this.threads.clear();
  }

  /**
   * 检查Thread是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  has(threadId: string): boolean {
    return this.threads.has(threadId);
  }
}