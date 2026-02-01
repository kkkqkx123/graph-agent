/**
 * 变量管理器
 * 负责Thread变量的管理，包括变量的初始化、更新、查询
 * 支持四级作用域：global、thread、subgraph、loop
 * 只允许修改已有变量
 *
 * 设计原则：
 * - 有状态设计：维护运行时状态
 * - 状态管理：提供状态的增删改查操作
 * - 线程隔离：每个线程有独立的状态实例
 * - 事件驱动：变量变更时触发事件通知
 */

import type { Thread, ThreadVariable } from '../../../types/thread';
import type { VariableScope } from '../../../types/common';
import type { WorkflowDefinition, WorkflowVariable } from '../../../types/workflow';
import type { ThreadContext } from '../context/thread-context';
import { VariableAccessor } from './utils/variable-accessor';
import type { EventManager } from '../../services/event-manager';
import { EventType } from '../../../types/events';
import { now } from '../../../utils';
import { ValidationError, ExecutionError } from '../../../types/errors';

/**
 * VariableManager - 变量管理器
 *
 * 职责：
 * - 从 WorkflowDefinition 初始化 Thread 变量
 * - 管理变量的查询、更新、作用域切换
 * - 支持四级作用域：global、thread、subgraph、loop
 * - 提供变量快照和恢复功能
 * - 触发变量变更事件
 *
 * 设计原则：
 * - 有状态设计：维护 Thread 的变量状态
 * - 状态管理：提供状态的增删改查操作
 * - 线程隔离：每个线程有独立的状态实例
 * - 事件驱动：变量变更时触发事件通知
 */
export class VariableManager {
  private eventManager?: EventManager;
  private threadId?: string;
  private workflowId?: string;

  constructor(eventManager?: EventManager, threadId?: string, workflowId?: string) {
    this.eventManager = eventManager;
    this.threadId = threadId;
    this.workflowId = workflowId;
  }
  /**
   * 从 WorkflowDefinition 初始化 Thread 变量
   * @param thread Thread 实例
   * @param workflow WorkflowDefinition 实例
   */
  initializeFromWorkflow(thread: Thread, workflow: WorkflowDefinition): void {
    if (!workflow.variables || workflow.variables.length === 0) {
      thread.variables = [];
      thread.variableScopes = {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      };
      return;
    }

    // 从 WorkflowVariable 创建 ThreadVariable
    thread.variables = workflow.variables.map((v: WorkflowVariable): ThreadVariable => ({
      name: v.name,
      value: v.defaultValue,
      type: v.type,
      scope: v.scope || 'thread',
      readonly: v.readonly || false,
      metadata: {
        description: v.description,
        required: v.required
      }
    }));

    // 初始化四级作用域
    thread.variableScopes = {
      global: {},
      thread: {},
      subgraph: [],
      loop: []
    };

    // 按作用域分配变量值
    for (const variable of thread.variables) {
      switch (variable.scope) {
        case 'global':
          thread.variableScopes.global[variable.name] = variable.value;
          break;
        case 'thread':
          thread.variableScopes.thread[variable.name] = variable.value;
          break;
        case 'subgraph':
        case 'loop':
          // subgraph 和 loop 作用域的变量在运行时动态创建
          // 这里只做声明，不初始化值
          break;
      }
    }
  }

  /**
   * 获取变量值（按作用域优先级查找）
   * 优先级：loop > subgraph > thread > global
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @returns 变量值
   */
  getVariable(threadContext: ThreadContext, name: string): any {
    const scopes = threadContext.thread.variableScopes;

    // 1. 循环作用域（最高优先级）
    if (scopes.loop.length > 0) {
      const currentLoopScope = scopes.loop[scopes.loop.length - 1];
      if (currentLoopScope && name in currentLoopScope) {
        return currentLoopScope[name];
      }
    }

    // 2. 子图作用域
    if (scopes.subgraph.length > 0) {
      const currentSubgraphScope = scopes.subgraph[scopes.subgraph.length - 1];
      if (currentSubgraphScope && name in currentSubgraphScope) {
        return currentSubgraphScope[name];
      }
    }

    // 3. 线程作用域
    if (name in scopes.thread) {
      return scopes.thread[name];
    }

    // 4. 全局作用域（最低优先级）
    if (name in scopes.global) {
      return scopes.global[name];
    }

    return undefined;
  }

  /**
   * 更新已定义变量的值
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @param value 新的变量值
   * @param explicitScope 显式指定作用域（可选）
   */
  async updateVariable(threadContext: ThreadContext, name: string, value: any, explicitScope?: VariableScope): Promise<void> {
    const thread = threadContext.thread;
    const variableDef = thread.variables.find(v => v.name === name);

    if (!variableDef) {
      throw new ValidationError(
        `Variable '${name}' is not defined in workflow. Variables must be defined in WorkflowDefinition.`,
        'variableName',
        name,
        { threadId: thread.id, workflowId: this.workflowId }
      );
    }

    if (variableDef.readonly) {
      throw new ValidationError(
        `Variable '${name}' is readonly and cannot be modified`,
        'variableName',
        name,
        { threadId: thread.id, workflowId: this.workflowId }
      );
    }

    if (!this.validateType(value, variableDef.type)) {
      throw new ValidationError(
        `Type mismatch for variable '${name}'. Expected ${variableDef.type}, got ${typeof value}`,
        'variableValue',
        value,
        {
          threadId: thread.id,
          workflowId: this.workflowId,
          variableName: name,
          expectedType: variableDef.type,
          actualType: typeof value
        }
      );
    }

    // 如果指定了显式作用域，使用该作用域
    const targetScope = explicitScope || variableDef.scope;

    switch (targetScope) {
      case 'global':
        thread.variableScopes.global[name] = value;
        break;
      case 'thread':
        thread.variableScopes.thread[name] = value;
        break;
      case 'subgraph':
        if (thread.variableScopes.subgraph.length === 0) {
          throw new ExecutionError(
            'Cannot set subgraph variable outside of subgraph context',
            undefined,
            this.workflowId || thread.workflowId,
            { threadId: thread.id, variableName: name }
          );
        }
        const subgraphScope = thread.variableScopes.subgraph[thread.variableScopes.subgraph.length - 1];
        if (subgraphScope) {
          subgraphScope[name] = value;
        }
        break;
      case 'loop':
        if (thread.variableScopes.loop.length === 0) {
          throw new ExecutionError(
            'Cannot set loop variable outside of loop context',
            undefined,
            this.workflowId || thread.workflowId,
            { threadId: thread.id, variableName: name }
          );
        }
        const loopScope = thread.variableScopes.loop[thread.variableScopes.loop.length - 1];
        if (loopScope) {
          loopScope[name] = value;
        }
        break;
    }

    variableDef.value = value;

    // 触发变量变更事件
    await this.emitVariableChangedEvent(threadContext, name, value, targetScope);
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
    const thread = threadContext.thread;
    const allVariables: Record<string, any> = {};

    // 按作用域优先级从低到高合并（global -> thread -> subgraph -> loop）
    // 高优先级作用域会覆盖低优先级的同名变量

    // 1. 全局作用域（最低优先级）
    Object.assign(allVariables, thread.variableScopes.global);

    // 2. 线程作用域
    Object.assign(allVariables, thread.variableScopes.thread);

    // 3. 子图作用域（从外到内，内层覆盖外层）
    for (const subgraphScope of thread.variableScopes.subgraph) {
      Object.assign(allVariables, subgraphScope);
    }

    // 4. 循环作用域（从外到内，内层覆盖外层，最高优先级）
    for (const loopScope of thread.variableScopes.loop) {
      Object.assign(allVariables, loopScope);
    }

    return allVariables;
  }

  /**
   * 获取指定作用域的变量
   * @param threadContext ThreadContext 实例
   * @param scope 变量作用域
   * @returns 指定作用域的变量键值对
   */
  getVariablesByScope(threadContext: ThreadContext, scope: VariableScope): Record<string, any> {
    const thread = threadContext.thread;

    switch (scope) {
      case 'global':
        return { ...thread.variableScopes.global };
      case 'thread':
        return { ...thread.variableScopes.thread };
      case 'subgraph':
        if (thread.variableScopes.subgraph.length === 0) {
          return {};
        }
        return { ...thread.variableScopes.subgraph[thread.variableScopes.subgraph.length - 1] };
      case 'loop':
        if (thread.variableScopes.loop.length === 0) {
          return {};
        }
        return { ...thread.variableScopes.loop[thread.variableScopes.loop.length - 1] };
    }
  }

  /**
   * 进入子图作用域
   * @param threadContext ThreadContext 实例
   */
  enterSubgraphScope(threadContext: ThreadContext): void {
    threadContext.thread.variableScopes.subgraph.push({});
  }

  /**
   * 退出子图作用域
   * @param threadContext ThreadContext 实例
   */
  exitSubgraphScope(threadContext: ThreadContext): void {
    if (threadContext.thread.variableScopes.subgraph.length === 0) {
      throw new ExecutionError(
        'No subgraph scope to exit',
        undefined,
        this.workflowId || threadContext.thread.workflowId,
        { threadId: threadContext.thread.id }
      );
    }
    threadContext.thread.variableScopes.subgraph.pop();
  }

  /**
   * 进入循环作用域
   * @param threadContext ThreadContext 实例
   */
  enterLoopScope(threadContext: ThreadContext): void {
    threadContext.thread.variableScopes.loop.push({});
  }

  /**
   * 退出循环作用域
   * @param threadContext ThreadContext 实例
   */
  exitLoopScope(threadContext: ThreadContext): void {
    if (threadContext.thread.variableScopes.loop.length === 0) {
      throw new ExecutionError(
        'No loop scope to exit',
        undefined,
        this.workflowId || threadContext.thread.workflowId,
        { threadId: threadContext.thread.id }
      );
    }
    threadContext.thread.variableScopes.loop.pop();
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
   * @param sourceThread 源Thread
   * @param targetThread 目标Thread
   */
  copyVariables(sourceThread: Thread, targetThread: Thread): void {
    targetThread.variables = sourceThread.variables.map((v: ThreadVariable) => ({ ...v }));

    // global 作用域通过引用共享
    targetThread.variableScopes = {
      global: sourceThread.variableScopes.global,
      thread: { ...sourceThread.variableScopes.thread },
      subgraph: [],
      loop: []
    };

  }

  /**
   * 清空变量
   * @param thread Thread实例
   */
  clearVariables(thread: Thread): void {
    thread.variables = [];
    thread.variableScopes = {
      global: {},
      thread: {},
      subgraph: [],
      loop: []
    };
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
   * 创建变量快照
   * 用于保存变量的完整状态，包括变量定义和作用域结构
   * @param thread Thread 实例
   * @returns 变量快照
   */
  createVariableSnapshot(thread: Thread): {
    variables: ThreadVariable[];
    variableScopes: {
      global: Record<string, any>;
      thread: Record<string, any>;
      subgraph: Record<string, any>[];
      loop: Record<string, any>[];
    };
  } {
    return {
      variables: thread.variables.map(v => ({ ...v })),
      variableScopes: {
        global: { ...thread.variableScopes.global },
        thread: { ...thread.variableScopes.thread },
        subgraph: thread.variableScopes.subgraph.map(scope => ({ ...scope })),
        loop: thread.variableScopes.loop.map(scope => ({ ...scope }))
      }
    };
  }

  /**
   * 恢复变量快照
   * 从快照中恢复变量的完整状态
   * @param thread Thread 实例
   * @param snapshot 变量快照
   */
  restoreVariableSnapshot(
    thread: Thread,
    snapshot: {
      variables: ThreadVariable[];
      variableScopes: {
        global: Record<string, any>;
        thread: Record<string, any>;
        subgraph: Record<string, any>[];
        loop: Record<string, any>[];
      };
    }
  ): void {
    thread.variables = snapshot.variables.map(v => ({ ...v }));
    thread.variableScopes = {
      global: { ...snapshot.variableScopes.global },
      thread: { ...snapshot.variableScopes.thread },
      subgraph: snapshot.variableScopes.subgraph.map(scope => ({ ...scope })),
      loop: snapshot.variableScopes.loop.map(scope => ({ ...scope }))
    };
  }
}