/**
 * TriggerStateManager - 触发器状态管理器
 * 专门管理触发器的运行时状态，与触发器定义分离
 *
 * 核心职责：
 * 1. 管理触发器的运行时状态（启用/禁用、触发次数等）
 * 2. 提供线程隔离的状态管理
 * 3. 支持状态快照和恢复（用于检查点）
 * 4. 保证并发安全
 *
 * 设计原则：
 * - 只管理状态，不管理触发器定义
 * - 线程隔离，每个线程有独立的状态
 * - 支持快照和恢复
 * - 并发安全
 */

import type { ID } from '../../../types/common';
import type { TriggerStatus } from '../../../types/trigger';
import { ValidationError, ExecutionError, NotFoundError } from '../../../types/errors';
import { now } from '../../../utils';
import type { LifecycleCapable } from './lifecycle-capable';

/**
 * 触发器运行时状态接口
 * 只包含运行时状态，不包含触发器定义
 */
export interface TriggerRuntimeState {
  /** 触发器 ID */
  triggerId: ID;
  /** 线程 ID */
  threadId: ID;
  /** 工作流 ID */
  workflowId: ID;
  /** 触发器状态 */
  status: TriggerStatus;
  /** 触发次数 */
  triggerCount: number;
  /** 最后更新时间 */
  updatedAt: number;
}

/**
 * TriggerStateManager - 触发器状态管理器
 *
 * 职责：
 * - 管理触发器的运行时状态
 * - 提供线程隔离的状态管理
 * - 支持状态快照和恢复
 * - 保证并发安全
 */
export class TriggerStateManager implements LifecycleCapable<Map<ID, TriggerRuntimeState>> {
  private states: Map<ID, TriggerRuntimeState> = new Map();
  private threadId: ID;
  private workflowId: ID | null = null;

  constructor(threadId: ID) {
    this.threadId = threadId;
  }

  /**
   * 设置工作流 ID
   * @param workflowId 工作流 ID
   */
  setWorkflowId(workflowId: ID): void {
    this.workflowId = workflowId;
  }

  /**
   * 获取工作流 ID
   * @returns 工作流 ID
   */
  getWorkflowId(): ID | null {
    return this.workflowId;
  }

  /**
   * 获取线程 ID
   * @returns 线程 ID
   */
  getThreadId(): ID {
    return this.threadId;
  }

  /**
   * 注册触发器状态
   * @param state 触发器运行时状态
   */
  register(state: TriggerRuntimeState): void {
    if (!state.triggerId) {
      throw new ValidationError('触发器 ID 不能为空', 'triggerId');
    }
    if (!state.threadId) {
      throw new ValidationError('线程 ID 不能为空', 'threadId');
    }
    if (!state.workflowId) {
      throw new ValidationError('工作流 ID 不能为空', 'workflowId');
    }
    if (state.threadId !== this.threadId) {
      throw new ValidationError(`线程 ID 不匹配：期望 ${this.threadId}，实际 ${state.threadId}`, 'threadId', state.threadId);
    }
    if (this.workflowId && state.workflowId !== this.workflowId) {
      throw new ValidationError(`工作流 ID 不匹配：期望 ${this.workflowId}，实际 ${state.workflowId}`, 'workflowId', state.workflowId);
    }

    // 检查是否已存在
    if (this.states.has(state.triggerId)) {
      throw new ExecutionError(`触发器状态 ${state.triggerId} 已存在`);
    }

    // 存储状态（深拷贝以避免外部引用影响）
    this.states.set(state.triggerId, {
      triggerId: state.triggerId,
      threadId: state.threadId,
      workflowId: state.workflowId,
      status: state.status,
      triggerCount: state.triggerCount,
      updatedAt: state.updatedAt
    });
  }

  /**
   * 获取触发器状态
   * @param triggerId 触发器 ID
   * @returns 触发器运行时状态，如果不存在则返回 undefined
   */
  getState(triggerId: ID): TriggerRuntimeState | undefined {
    return this.states.get(triggerId);
  }

  /**
   * 更新触发器状态
   * @param triggerId 触发器 ID
   * @param status 新状态
   */
  updateStatus(triggerId: ID, status: TriggerStatus): void {
    const state = this.states.get(triggerId);
    if (!state) {
      throw new NotFoundError(`触发器状态 ${triggerId} 不存在`, 'TriggerState', triggerId);
    }

    // 更新状态
    state.status = status;
    state.updatedAt = now();
  }

  /**
   * 增加触发次数
   * @param triggerId 触发器 ID
   */
  incrementTriggerCount(triggerId: ID): void {
    const state = this.states.get(triggerId);
    if (!state) {
      throw new NotFoundError(`触发器状态 ${triggerId} 不存在`, 'TriggerState', triggerId);
    }

    // 增加触发次数
    state.triggerCount++;
    state.updatedAt = now();
  }

  /**
   * 创建状态快照
   * @returns 状态快照
   */
  createSnapshot(): Map<ID, TriggerRuntimeState> {
    // 创建深拷贝
    const snapshot = new Map<ID, TriggerRuntimeState>();
    for (const [triggerId, state] of this.states.entries()) {
      snapshot.set(triggerId, {
        triggerId: state.triggerId,
        threadId: state.threadId,
        workflowId: state.workflowId,
        status: state.status,
        triggerCount: state.triggerCount,
        updatedAt: state.updatedAt
      });
    }
    return snapshot;
  }

  /**
   * 从快照恢复状态
   * @param snapshot 状态快照
   */
  restoreFromSnapshot(snapshot: Map<ID, TriggerRuntimeState>): void {
    // 清空当前状态
    this.states.clear();

    // 恢复快照
    for (const [triggerId, state] of snapshot.entries()) {
      // 验证线程 ID
      if (state.threadId !== this.threadId) {
        throw new ValidationError(`线程 ID 不匹配：期望 ${this.threadId}，实际 ${state.threadId}`, 'threadId', state.threadId);
      }

      // 恢复状态
      this.states.set(triggerId, {
        triggerId: state.triggerId,
        threadId: state.threadId,
        workflowId: state.workflowId,
        status: state.status,
        triggerCount: state.triggerCount,
        updatedAt: state.updatedAt
      });
    }
  }

  /**
   * 获取所有状态
   * @returns 所有触发器运行时状态
   */
  getAllStates(): Map<ID, TriggerRuntimeState> {
    // 返回只读副本
    const readonlyStates = new Map<ID, TriggerRuntimeState>();
    for (const [triggerId, state] of this.states.entries()) {
      readonlyStates.set(triggerId, { ...state });
    }
    return readonlyStates;
  }

  /**
   * 检查触发器状态是否存在
   * @param triggerId 触发器 ID
   * @returns 是否存在
   */
  hasState(triggerId: ID): boolean {
    return this.states.has(triggerId);
  }

  /**
   * 删除触发器状态
   * @param triggerId 触发器 ID
   */
  deleteState(triggerId: ID): void {
    if (!this.states.has(triggerId)) {
      throw new NotFoundError(`触发器状态 ${triggerId} 不存在`, 'TriggerState', triggerId);
    }
    this.states.delete(triggerId);
  }

  /**
   * 清空所有状态
   * @deprecated 使用 cleanup() 方法代替
   */
  clear(): void {
    this.states.clear();
  }

  /**
   * 获取状态数量
   * @returns 状态数量
   */
  size(): number {
    return this.states.size;
  }

  /**
   * 初始化管理器
   * TriggerStateManager在构造时已初始化，此方法为空实现
   */
  initialize(): void {
    // TriggerStateManager在构造时已初始化，无需额外操作
  }

  /**
   * 清理资源
   * 清空所有触发器状态
   */
  cleanup(): void {
    this.clear();
  }

  /**
   * 检查是否已初始化
   * @returns 始终返回true，因为TriggerStateManager在构造时已初始化
   */
  isInitialized(): boolean {
    return true;
  }
}