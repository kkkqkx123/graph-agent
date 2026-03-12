/**
 * VariableStateManager - 变量状态管理器
 * 管理 Agent Loop 的变量状态
 *
 * 核心职责：
 * 1. 管理变量的运行时状态（值）
 * 2. 提供实例隔离的状态管理
 * 3. 支持状态快照和恢复（用于检查点）
 * 4. 提供原子化的状态操作
 *
 * 设计原则：
 * - 只管理状态，不包含业务逻辑
 * - 实例隔离，每个 AgentLoopEntity 有独立的状态实例
 * - 支持快照和恢复
 * - 原子操作，保证状态一致性
 */

import type { LifecycleCapable } from '../../../core/managers/lifecycle-capable.js';
import { createContextualLogger } from '../../../utils/contextual-logger.js';

const logger = createContextualLogger({ component: 'VariableStateManager' });

/**
 * 变量状态接口
 */
export interface VariableState {
  variables: Record<string, any>;
}

/**
 * VariableStateManager - 变量状态管理器
 *
 * 职责：
 * - 管理变量的运行时状态
 * - 提供实例隔离的状态管理
 * - 支持状态快照和恢复
 * - 提供原子化的状态操作
 *
 * 设计原则：
 * - 有状态设计：维护变量状态
 * - 状态管理：提供状态的增删改查操作
 * - 实例隔离：每个 AgentLoopEntity 有独立的状态实例
 * - 原子操作：保证状态一致性
 */
export class VariableStateManager implements LifecycleCapable<VariableState> {
  private variables: Map<string, any> = new Map();

  constructor(private agentLoopId: string) {
    logger.debug('VariableStateManager created', { agentLoopId });
  }

  /**
   * 获取 Agent Loop ID
   * @returns Agent Loop ID
   */
  getAgentLoopId(): string {
    return this.agentLoopId;
  }

  /**
   * 获取变量
   * @param name 变量名
   * @returns 变量值
   */
  getVariable(name: string): any {
    return this.variables.get(name);
  }

  /**
   * 设置变量
   * @param name 变量名
   * @param value 变量值
   */
  setVariable(name: string, value: any): void {
    logger.debug('Setting variable', {
      agentLoopId: this.agentLoopId,
      variableName: name
    });
    this.variables.set(name, value);
  }

  /**
   * 获取所有变量
   * @returns 所有变量的键值对
   */
  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this.variables);
  }

  /**
   * 删除变量
   * @param name 变量名
   * @returns 是否删除成功
   */
  deleteVariable(name: string): boolean {
    logger.debug('Deleting variable', {
      agentLoopId: this.agentLoopId,
      variableName: name
    });
    return this.variables.delete(name);
  }

  /**
   * 检查变量是否存在
   * @param name 变量名
   * @returns 是否存在
   */
  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }

  /**
   * 获取变量数量
   * @returns 变量数量
   */
  getVariableCount(): number {
    return this.variables.size;
  }

  /**
   * 创建变量快照
   * @returns 变量快照
   */
  createSnapshot(): VariableState {
    return {
      variables: Object.fromEntries(this.variables),
    };
  }

  /**
   * 从快照恢复变量状态
   * @param snapshot 变量快照
   */
  restoreFromSnapshot(snapshot: VariableState): void {
    this.variables = new Map(Object.entries(snapshot.variables));
  }

  /**
   * 清理资源
   * 清空所有变量状态
   */
  cleanup(): void {
    const variableCount = this.variables.size;
    logger.debug('Cleaning up VariableStateManager', {
      agentLoopId: this.agentLoopId,
      variableCount
    });
    this.variables.clear();
  }
}
