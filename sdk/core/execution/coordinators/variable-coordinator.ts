/**
 * VariableCoordinator - 变量协调器
 * 负责变量的协调逻辑，包括验证、按需初始化、事件触发等
 *
 * 核心职责：
 * 1. 协调变量的查询、更新操作
 * 2. 处理变量验证逻辑
 * 3. 按需初始化变量
 * 4. 触发变量变更事件
 *
 * 设计原则：
 * - 无状态设计：不维护可变状态
 * - 协调逻辑：封装变量操作的协调逻辑
 * - 依赖注入：通过构造函数接收依赖的管理器
 * - 委托模式：使用VariableStateManager进行原子状态操作
 */

import type { ThreadContext } from '../context/thread-context';
import type { Thread } from '@modular-agent/types/thread';
import type { VariableScope } from '@modular-agent/types/common';
import type { EventManager } from '../../services/event-manager';
import { EventType } from '@modular-agent/types/events';
import { now } from '../../../utils';
import { ValidationError, ExecutionError } from '@modular-agent/types/errors';
import { VariableStateManager } from '../managers/variable-state-manager';
import { VariableAccessor } from '@modular-agent/common-utils/variable-accessor';

/**
 * VariableCoordinator - 变量协调器
 *
 * 职责：
 * - 协调变量的查询、更新操作
 * - 处理变量验证逻辑
 * - 按需初始化变量
 * - 触发变量变更事件
 *
 * 设计原则：
 * - 无状态设计：不维护可变状态
 * - 协调逻辑：封装变量操作的协调逻辑
 * - 依赖注入：通过构造函数接收依赖的管理器
 * - 委托模式：使用VariableStateManager进行原子状态操作
 */
export class VariableCoordinator {
  constructor(
    private stateManager: VariableStateManager,
    private eventManager?: EventManager,
    private threadId?: string,
    private workflowId?: string
  ) { }

  /**
   * 从 WorkflowDefinition 初始化变量
   * @param thread Thread 实例
   * @param workflowVariables 工作流变量定义
   */
  initializeFromWorkflow(thread: Thread, workflowVariables: any[]): void {
    this.stateManager.initializeFromWorkflow(workflowVariables);
  }

  /**
   * 获取变量值（按作用域优先级查找）
   * 优先级：loop > subgraph > thread > global
   * 支持按需初始化：thread、subgraph、loop作用域的变量在首次访问时初始化
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @returns 变量值
   */
  getVariable(threadContext: ThreadContext, name: string): any {
    const scopes = this.stateManager.getVariableScopes();

    // 1. 循环作用域（最高优先级）
    if (scopes.loop.length > 0) {
      const currentLoopScope = scopes.loop[scopes.loop.length - 1];
      if (currentLoopScope && name in currentLoopScope) {
        return currentLoopScope[name];
      }
      // 如果变量未初始化，尝试按需初始化
      if (currentLoopScope && !(name in currentLoopScope)) {
        const initialized = this.initializeVariableOnDemand(name, 'loop', currentLoopScope);
        if (initialized !== undefined) {
          return initialized;
        }
      }
    }

    // 2. 子图作用域
    if (scopes.subgraph.length > 0) {
      const currentSubgraphScope = scopes.subgraph[scopes.subgraph.length - 1];
      if (currentSubgraphScope && name in currentSubgraphScope) {
        return currentSubgraphScope[name];
      }
      // 如果变量未初始化，尝试按需初始化
      if (currentSubgraphScope && !(name in currentSubgraphScope)) {
        const initialized = this.initializeVariableOnDemand(name, 'subgraph', currentSubgraphScope);
        if (initialized !== undefined) {
          return initialized;
        }
      }
    }

    // 3. 线程作用域
    if (name in scopes.thread) {
      return scopes.thread[name];
    }
    // 如果变量未初始化，尝试按需初始化
    if (!(name in scopes.thread)) {
      const initialized = this.initializeVariableOnDemand(name, 'thread', scopes.thread);
      if (initialized !== undefined) {
        return initialized;
      }
    }

    // 4. 全局作用域（最低优先级）
    if (name in scopes.global) {
      return scopes.global[name];
    }

    return undefined;
  }

  /**
   * 按需初始化变量
   * @param name 变量名称
   * @param scope 作用域
   * @param scopeObject 作用域对象
   * @returns 初始化的值，如果变量不存在则返回undefined
   */
  private initializeVariableOnDemand(
    name: string,
    scope: VariableScope,
    scopeObject: Record<string, any>
  ): any {
    const variableDef = this.stateManager.getVariableDefinition(name);

    if (!variableDef) {
      return undefined;
    }

    // 使用默认值初始化
    const initialValue = variableDef.value;
    this.stateManager.setVariableValue(name, initialValue, scope);

    return initialValue;
  }

  /**
   * 更新已定义变量的值
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @param value 新的变量值
   * @param explicitScope 显式指定作用域（可选）
   */
  async updateVariable(threadContext: ThreadContext, name: string, value: any, explicitScope?: VariableScope): Promise<void> {
    const variableDef = this.stateManager.getVariableDefinition(name);

    if (!variableDef) {
      throw new ValidationError(
        `Variable '${name}' is not defined in workflow. Variables must be defined in WorkflowDefinition.`,
        'variableName',
        name,
        { threadId: this.threadId, workflowId: this.workflowId }
      );
    }

    if (variableDef.readonly) {
      throw new ValidationError(
        `Variable '${name}' is readonly and cannot be modified`,
        'variableName',
        name,
        { threadId: this.threadId, workflowId: this.workflowId }
      );
    }

    if (!this.validateType(value, variableDef.type)) {
      throw new ValidationError(
        `Type mismatch for variable '${name}'. Expected ${variableDef.type}, got ${typeof value}`,
        'variableValue',
        value,
        {
          threadId: this.threadId,
          workflowId: this.workflowId,
          variableName: name,
          expectedType: variableDef.type,
          actualType: typeof value
        }
      );
    }

    // 如果指定了显式作用域，使用该作用域
    const targetScope = explicitScope || variableDef.scope;

    // 委托给状态管理器进行原子操作
    this.stateManager.setVariableValue(name, value, targetScope);

    // 触发变量变更事件
    await this.emitVariableChangedEvent(threadContext, name, value, targetScope);
  }

  /**
   * 检查变量是否存在
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @returns 是否存在
   */
  hasVariable(threadContext: ThreadContext, name: string): boolean {
    return this.getVariable(threadContext, name) !== undefined;
  }

  /**
   * 获取所有变量（按作用域优先级合并）
   * @param threadContext ThreadContext 实例
   * @returns 所有变量的键值对
   */
  getAllVariables(threadContext: ThreadContext): Record<string, any> {
    return this.stateManager.getAllVariables();
  }

  /**
   * 获取指定作用域的变量
   * @param threadContext ThreadContext 实例
   * @param scope 变量作用域
   * @returns 指定作用域的变量键值对
   */
  getVariablesByScope(threadContext: ThreadContext, scope: VariableScope): Record<string, any> {
    return this.stateManager.getVariablesByScope(scope);
  }

  /**
   * 进入子图作用域
   * 自动初始化该作用域的变量
   * @param threadContext ThreadContext 实例
   */
  enterSubgraphScope(threadContext: ThreadContext): void {
    this.stateManager.enterSubgraphScope();
  }

  /**
   * 退出子图作用域
   * @param threadContext ThreadContext 实例
   */
  exitSubgraphScope(threadContext: ThreadContext): void {
    this.stateManager.exitSubgraphScope();
  }

  /**
   * 进入循环作用域
   * 自动初始化该作用域的变量
   * @param threadContext ThreadContext 实例
   */
  enterLoopScope(threadContext: ThreadContext): void {
    this.stateManager.enterLoopScope();
  }

  /**
   * 退出循环作用域
   * @param threadContext ThreadContext 实例
   */
  exitLoopScope(threadContext: ThreadContext): void {
    this.stateManager.exitLoopScope();
  }

  /**
   * 验证变量类型
   * @param value 变量值
   * @param expectedType 期望的类型
   * @returns 是否匹配
   */
  private validateType(value: any, expectedType: string): boolean {
    const actualType = typeof value;

    switch (expectedType) {
      case 'number':
        return actualType === 'number' && !isNaN(value);
      case 'string':
        return actualType === 'string';
      case 'boolean':
        return actualType === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return actualType === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * 复制变量（用于 fork 场景）
   * @param sourceStateManager 源状态管理器
   * @param targetStateManager 目标状态管理器
   */
  copyVariables(sourceStateManager: VariableStateManager, targetStateManager: VariableStateManager): void {
    targetStateManager.copyFrom(sourceStateManager);
  }

  /**
   * 清空变量
   */
  clearVariables(): void {
    this.stateManager.clear();
  }

  /**
   * 创建变量访问器
   * 提供统一的变量访问接口，支持嵌套路径解析
   * @param threadContext Thread 上下文
   * @returns VariableAccessor 实例
   */
  createAccessor(threadContext: ThreadContext): VariableAccessor {
    return new VariableAccessor(threadContext);
  }

  /**
   * 通过路径获取变量值
   * 支持嵌套路径和命名空间
   * @param threadContext Thread 上下文
   * @param path 变量路径
   * @returns 变量值
   *
   * @example
   * // 简单变量
   * getVariableByPath(context, 'userName')
   *
   * // 嵌套路径
   * getVariableByPath(context, 'user.profile.name')
   *
   * // 命名空间
   * getVariableByPath(context, 'input.userName')
   * getVariableByPath(context, 'output.result')
   * getVariableByPath(context, 'global.config')
   * getVariableByPath(context, 'thread.state')
   * getVariableByPath(context, 'subgraph.temp')
   * getVariableByPath(context, 'loop.item')
   */
  getVariableByPath(threadContext: ThreadContext, path: string): any {
    const accessor = this.createAccessor(threadContext);
    return accessor.get(path);
  }

  /**
   * 触发变量变更事件
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @param value 新值
   * @param scope 作用域
   */
  private async emitVariableChangedEvent(
    threadContext: ThreadContext,
    name: string,
    value: any,
    scope: VariableScope
  ): Promise<void> {
    if (!this.eventManager) {
      return;
    }

    try {
      const event = {
        type: EventType.VARIABLE_CHANGED,
        timestamp: now(),
        workflowId: this.workflowId || threadContext.getWorkflowId(),
        threadId: this.threadId || threadContext.getThreadId(),
        variableName: name,
        variableValue: value,
        variableScope: scope
      };
      await this.eventManager.emit(event);
    } catch (error) {
      // 静默处理事件触发错误，避免影响主流程
      console.error('Failed to emit variable changed event:', error);
    }
  }

  /**
   * 获取状态管理器（用于检查点等场景）
   * @returns VariableStateManager 实例
   */
  getStateManager(): VariableStateManager {
    return this.stateManager;
  }
}