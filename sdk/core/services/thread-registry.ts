/**
 * ThreadRegistry - ThreadEntity注册表
 * 负责ThreadEntity的内存存储和基本查询
 * 不负责状态转换、持久化、序列化
 *
 * 本模块只导出类定义，不导出实例
 * 实例通过 SingletonRegistry 统一管理
 */

import { ThreadEntity } from '../entities/thread-entity.js';

/**
 * ThreadRegistry - ThreadEntity注册表
 */
export class ThreadRegistry {
  private threadEntities: Map<string, ThreadEntity> = new Map();

  /**
   * 注册ThreadEntity
   * @param threadEntity ThreadEntity实例
   */
  register(threadEntity: ThreadEntity): void {
    this.threadEntities.set(threadEntity.getThreadId(), threadEntity);
  }

  /**
   * 获取ThreadEntity
   * @param threadId 线程ID
   * @returns ThreadEntity实例或null
   */
  get(threadId: string): ThreadEntity | null {
    return this.threadEntities.get(threadId) || null;
  }

  /**
   * 删除ThreadEntity
   * @param threadId 线程ID
   */
  delete(threadId: string): void {
    this.threadEntities.delete(threadId);
  }

  /**
   * 获取所有ThreadEntity
   * @returns ThreadEntity数组
   */
  getAll(): ThreadEntity[] {
    return Array.from(this.threadEntities.values());
  }

  /**
   * 清空所有ThreadEntity
   */
  clear(): void {
    this.threadEntities.clear();
  }

  /**
   * 检查ThreadEntity是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  has(threadId: string): boolean {
    return this.threadEntities.has(threadId);
  }

  /**
   * 检查工作流是否活跃
   * @param workflowId 工作流ID
   * @returns 是否活跃
   */
  isWorkflowActive(workflowId: string): boolean {
    return this.getAll().some(threadEntity =>
      threadEntity.getWorkflowId() === workflowId
    );
  }
}
