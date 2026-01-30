/**
 * ThreadRegistry - ThreadContext注册表
 * 负责ThreadContext的内存存储和基本查询
 * 不负责状态转换、持久化、序列化
 *
 * 本模块导出全局单例实例，不导出类定义
 * 
 * 如果需要测试隔离，使用以下模式：
 * - 创建 Mock 类实现该接口
 * - 使用 type { ThreadRegistry } 获取类型
 * - 通过依赖注入传入 Mock
 */

import { ThreadContext } from '../execution/context/thread-context';

/**
 * ThreadRegistry - ThreadContext注册表
 */
class ThreadRegistry {
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

/**
 * 全局线程注册表单例
 * 用于管理所有ThreadContext实例的生命周期
 */
export const threadRegistry = new ThreadRegistry();

/**
 * 导出ThreadRegistry类型供类型注解使用
 * 用于 instanceof 检查、类型定义和 Mock 实现
 */
export type { ThreadRegistry };