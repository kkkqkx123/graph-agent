/**
 * ThreadRegistry - ThreadContext注册表
 * 负责ThreadContext的内存存储和基本查询
 * 不负责状态转换、持久化、序列化
 */

import { ThreadContext } from './thread-context';

/**
 * ThreadRegistry - ThreadContext注册表
 */
export class ThreadRegistry {
  private threadContexts: Map<string, ThreadContext> = new Map();

  /**
   * 注册ThreadContext
   * @param threadContext ThreadContext实例
   */
  register(threadContext: ThreadContext): void {
    this.threadContexts.set(threadContext.getThreadId(), threadContext);
  }

  /**
   * 获取ThreadContext
   * @param threadId 线程ID
   * @returns ThreadContext实例或null
   */
  get(threadId: string): ThreadContext | null {
    return this.threadContexts.get(threadId) || null;
  }

  /**
   * 删除ThreadContext
   * @param threadId 线程ID
   */
  delete(threadId: string): void {
    this.threadContexts.delete(threadId);
  }

  /**
   * 获取所有ThreadContext
   * @returns ThreadContext数组
   */
  getAll(): ThreadContext[] {
    return Array.from(this.threadContexts.values());
  }

  /**
   * 清空所有ThreadContext
   */
  clear(): void {
    this.threadContexts.clear();
  }

  /**
   * 检查ThreadContext是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  has(threadId: string): boolean {
    return this.threadContexts.has(threadId);
  }
}