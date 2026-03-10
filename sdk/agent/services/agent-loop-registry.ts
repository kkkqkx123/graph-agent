/**
 * AgentLoopRegistry - Agent Loop 注册表
 *
 * 管理所有活跃的 AgentLoopEntity 实例。
 * 参考 ThreadRegistry 的设计模式。
 */

import type { ID } from '@modular-agent/types';
import type { AgentLoopEntity } from '../entities/agent-loop-entity.js';
import { AgentLoopStatus } from '../entities/agent-loop-state.js';
import { cleanupAgentLoop } from '../execution/handles/index.js';

/**
 * AgentLoopRegistry - Agent Loop 注册表
 *
 * 核心职责：
 * - 管理活跃的 AgentLoopEntity 实例
 * - 提供实例的注册、查询、删除功能
 * - 支持按状态过滤查询
 *
 * 设计原则：
 * - 单例模式（通过 DI 容器管理）
 * - 线程安全（Map 操作）
 * - 支持清理过期实例
 */
export class AgentLoopRegistry {
  /** 实例存储 */
  private entities: Map<ID, AgentLoopEntity> = new Map();

  /**
   * 注册 AgentLoopEntity
   * @param entity Agent Loop 实体
   */
  register(entity: AgentLoopEntity): void {
    this.entities.set(entity.id, entity);
  }

  /**
   * 注销 AgentLoopEntity
   * @param id 实例 ID
   * @returns 是否成功注销
   */
  unregister(id: ID): boolean {
    return this.entities.delete(id);
  }

  /**
   * 获取 AgentLoopEntity
   * @param id 实例 ID
   * @returns Agent Loop 实体，不存在则返回 undefined
   */
  get(id: ID): AgentLoopEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * 检查实例是否存在
   * @param id 实例 ID
   */
  has(id: ID): boolean {
    return this.entities.has(id);
  }

  /**
   * 获取所有活跃实例
   */
  getAll(): AgentLoopEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * 获取所有实例 ID
   */
  getAllIds(): ID[] {
    return Array.from(this.entities.keys());
  }

  /**
   * 获取实例数量
   */
  size(): number {
    return this.entities.size;
  }

  /**
   * 按状态获取实例
   * @param status 执行状态
   */
  getByStatus(status: AgentLoopStatus): AgentLoopEntity[] {
    return this.getAll().filter(entity => entity.getStatus() === status);
  }

  /**
   * 获取正在运行的实例
   */
  getRunning(): AgentLoopEntity[] {
    return this.getByStatus(AgentLoopStatus.RUNNING);
  }

  /**
   * 获取已暂停的实例
   */
  getPaused(): AgentLoopEntity[] {
    return this.getByStatus(AgentLoopStatus.PAUSED);
  }

  /**
   * 获取已完成的实例
   */
  getCompleted(): AgentLoopEntity[] {
    return this.getByStatus(AgentLoopStatus.COMPLETED);
  }

  /**
   * 获取失败的实例
   */
  getFailed(): AgentLoopEntity[] {
    return this.getByStatus(AgentLoopStatus.FAILED);
  }

  /**
   * 清理已完成的实例
   * @returns 清理的实例数量
   */
  cleanupCompleted(): number {
    const completedIds = this.getCompleted().map(e => e.id);
    for (const id of completedIds) {
      this.unregister(id);
    }
    return completedIds.length;
  }

  /**
   * 清理所有实例
   */
  clear(): void {
    this.entities.clear();
  }

  /**
   * 清理资源
   * 在清理前调用每个实体的 cleanup 方法
   */
  cleanup(): void {
    for (const entity of this.entities.values()) {
      cleanupAgentLoop(entity);
    }
    this.entities.clear();
  }
}
