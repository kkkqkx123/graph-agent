/**
 * VariableStateManager - 变量状态管理器
 * 专门管理变量的运行时状态，与变量协调逻辑分离
 *
 * 核心职责：
 * 1. 管理变量的运行时状态（值、作用域）
 * 2. 提供线程隔离的状态管理
 * 3. 支持状态快照和恢复（用于检查点）
 * 4. 提供原子化的状态操作
 *
 * 设计原则：
 * - 只管理状态，不包含业务逻辑
 * - 线程隔离，每个线程有独立的状态实例
 * - 支持快照和恢复
 * - 原子操作，保证状态一致性
 */

import type { ThreadVariable } from '../../../types/thread';
import type { VariableScope } from '../../../types/common';
import type { WorkflowVariable } from '../../../types/workflow';
import { ValidationError } from '../../../types/errors';

/**
 * 变量作用域结构
 */
export interface VariableScopes {
  /** 全局作用域 */
  global: Record<string, any>;
  /** 线程作用域 */
  thread: Record<string, any>;
  /** 子图作用域栈 */
  subgraph: Record<string, any>[];
  /** 循环作用域栈 */
  loop: Record<string, any>[];
}

/**
 * VariableStateManager - 变量状态管理器
 *
 * 职责：
 * - 管理变量的运行时状态
 * - 提供线程隔离的状态管理
 * - 支持状态快照和恢复
 * - 提供原子化的状态操作
 *
 * 设计原则：
 * - 有状态设计：维护变量状态
 * - 状态管理：提供状态的增删改查操作
 * - 线程隔离：每个线程有独立的状态实例
 * - 原子操作：保证状态一致性
 */
export class VariableStateManager {
  private variables: ThreadVariable[] = [];
  private variableScopes: VariableScopes = {
    global: {},
    thread: {},
    subgraph: [],
    loop: []
  };

  /**
   * 从 WorkflowDefinition 初始化变量状态
   * @param workflowVariables 工作流变量定义
   */
  initializeFromWorkflow(workflowVariables: WorkflowVariable[]): void {
    if (!workflowVariables || workflowVariables.length === 0) {
      this.variables = [];
      this.variableScopes = {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      };
      return;
    }

    // 从 WorkflowVariable 创建 ThreadVariable
    this.variables = workflowVariables.map((v: WorkflowVariable): ThreadVariable => ({
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
    this.variableScopes = {
      global: {},
      thread: {},
      subgraph: [],
      loop: []
    };

    // 按作用域分配变量值
    // 只有 global 作用域的变量在初始化时直接赋值
    // thread、subgraph、loop 作用域的变量按需初始化
    for (const variable of this.variables) {
      switch (variable.scope) {
        case 'global':
          // global 作用域变量立即初始化
          this.variableScopes.global[variable.name] = variable.value;
          break;
        case 'thread':
        case 'subgraph':
        case 'loop':
          // thread、subgraph、loop 作用域的变量按需初始化
          // 这里只做声明，不初始化值
          break;
      }
    }
  }

  /**
   * 从 ThreadVariable 初始化变量状态
   * @param threadVariables Thread变量定义
   */
  initializeFromThreadVariables(threadVariables: ThreadVariable[]): void {
    if (!threadVariables || threadVariables.length === 0) {
      this.variables = [];
      this.variableScopes = {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      };
      return;
    }

    // 直接使用 ThreadVariable
    this.variables = threadVariables.map((v: ThreadVariable): ThreadVariable => ({ ...v }));

    // 初始化四级作用域
    this.variableScopes = {
      global: {},
      thread: {},
      subgraph: [],
      loop: []
    };

    // 按作用域分配变量值
    // 只有 global 作用域的变量在初始化时直接赋值
    // thread、subgraph、loop 作用域的变量按需初始化
    for (const variable of this.variables) {
      switch (variable.scope) {
        case 'global':
          // global 作用域变量立即初始化
          this.variableScopes.global[variable.name] = variable.value;
          break;
        case 'thread':
        case 'subgraph':
        case 'loop':
          // thread、subgraph、loop 作用域的变量按需初始化
          // 这里只做声明，不初始化值
          break;
      }
    }
  }

  /**
   * 获取变量定义
   * @param name 变量名称
   * @returns 变量定义，如果不存在则返回 undefined
   */
  getVariableDefinition(name: string): ThreadVariable | undefined {
    return this.variables.find(v => v.name === name);
  }

  /**
   * 获取所有变量定义
   * @returns 所有变量定义
   */
  getAllVariableDefinitions(): ThreadVariable[] {
    return [...this.variables];
  }

  /**
   * 设置变量值（原子操作）
   * @param name 变量名称
   * @param value 变量值
   * @param scope 作用域
   */
  setVariableValue(name: string, value: any, scope: VariableScope): void {
    switch (scope) {
      case 'global':
        this.variableScopes.global[name] = value;
        break;
      case 'thread':
        this.variableScopes.thread[name] = value;
        break;
      case 'subgraph':
        if (this.variableScopes.subgraph.length === 0) {
          throw new ValidationError('Cannot set subgraph variable outside of subgraph context', 'scope');
        }
        const subgraphScope = this.variableScopes.subgraph[this.variableScopes.subgraph.length - 1];
        if (subgraphScope) {
          subgraphScope[name] = value;
        }
        break;
      case 'loop':
        if (this.variableScopes.loop.length === 0) {
          throw new ValidationError('Cannot set loop variable outside of loop context', 'scope');
        }
        const loopScope = this.variableScopes.loop[this.variableScopes.loop.length - 1];
        if (loopScope) {
          loopScope[name] = value;
        }
        break;
    }

    // 更新变量定义中的值
    const variableDef = this.variables.find(v => v.name === name);
    if (variableDef) {
      variableDef.value = value;
    }
  }

  /**
   * 获取变量值（原子操作）
   * @param name 变量名称
   * @param scope 作用域
   * @returns 变量值
   */
  getVariableValue(name: string, scope: VariableScope): any {
    switch (scope) {
      case 'global':
        return this.variableScopes.global[name];
      case 'thread':
        return this.variableScopes.thread[name];
      case 'subgraph':
        if (this.variableScopes.subgraph.length === 0) {
          return undefined;
        }
        const subgraphScope = this.variableScopes.subgraph[this.variableScopes.subgraph.length - 1];
        return subgraphScope ? subgraphScope[name] : undefined;
      case 'loop':
        if (this.variableScopes.loop.length === 0) {
          return undefined;
        }
        const loopScope = this.variableScopes.loop[this.variableScopes.loop.length - 1];
        return loopScope ? loopScope[name] : undefined;
    }
  }

  /**
   * 进入子图作用域（原子操作）
   */
  enterSubgraphScope(): void {
    const newScope: Record<string, any> = {};
    
    // 初始化该作用域的所有subgraph变量
    for (const variable of this.variables) {
      if (variable.scope === 'subgraph') {
        newScope[variable.name] = variable.value;
      }
    }
    
    this.variableScopes.subgraph.push(newScope);
  }

  /**
   * 退出子图作用域（原子操作）
   */
  exitSubgraphScope(): void {
    if (this.variableScopes.subgraph.length === 0) {
      throw new ValidationError('No subgraph scope to exit', 'scope');
    }
    this.variableScopes.subgraph.pop();
  }

  /**
   * 进入循环作用域（原子操作）
   */
  enterLoopScope(): void {
    const newScope: Record<string, any> = {};
    
    // 初始化该作用域的所有loop变量
    for (const variable of this.variables) {
      if (variable.scope === 'loop') {
        newScope[variable.name] = variable.value;
      }
    }
    
    this.variableScopes.loop.push(newScope);
  }

  /**
   * 退出循环作用域（原子操作）
   */
  exitLoopScope(): void {
    if (this.variableScopes.loop.length === 0) {
      throw new ValidationError('No loop scope to exit', 'scope');
    }
    this.variableScopes.loop.pop();
  }

  /**
   * 获取所有变量（按作用域优先级合并）
   * @returns 所有变量的键值对
   */
  getAllVariables(): Record<string, any> {
    const allVariables: Record<string, any> = {};

    // 按作用域优先级从低到高合并（global -> thread -> subgraph -> loop）
    // 高优先级作用域会覆盖低优先级的同名变量

    // 1. 全局作用域（最低优先级）
    Object.assign(allVariables, this.variableScopes.global);

    // 2. 线程作用域
    Object.assign(allVariables, this.variableScopes.thread);

    // 3. 子图作用域（从外到内，内层覆盖外层）
    for (const subgraphScope of this.variableScopes.subgraph) {
      Object.assign(allVariables, subgraphScope);
    }

    // 4. 循环作用域（从外到内，内层覆盖外层，最高优先级）
    for (const loopScope of this.variableScopes.loop) {
      Object.assign(allVariables, loopScope);
    }

    return allVariables;
  }

  /**
   * 获取指定作用域的变量
   * @param scope 变量作用域
   * @returns 指定作用域的变量键值对
   */
  getVariablesByScope(scope: VariableScope): Record<string, any> {
    switch (scope) {
      case 'global':
        return { ...this.variableScopes.global };
      case 'thread':
        return { ...this.variableScopes.thread };
      case 'subgraph':
        if (this.variableScopes.subgraph.length === 0) {
          return {};
        }
        return { ...this.variableScopes.subgraph[this.variableScopes.subgraph.length - 1] };
      case 'loop':
        if (this.variableScopes.loop.length === 0) {
          return {};
        }
        return { ...this.variableScopes.loop[this.variableScopes.loop.length - 1] };
    }
  }

  /**
   * 创建变量快照
   * 用于保存变量的完整状态，包括变量定义和作用域结构
   * @returns 变量快照
   */
  createSnapshot(): {
    variables: ThreadVariable[];
    variableScopes: VariableScopes;
  } {
    return {
      variables: this.variables.map(v => ({ ...v })),
      variableScopes: {
        global: { ...this.variableScopes.global },
        thread: { ...this.variableScopes.thread },
        subgraph: this.variableScopes.subgraph.map(scope => ({ ...scope })),
        loop: this.variableScopes.loop.map(scope => ({ ...scope }))
      }
    };
  }

  /**
   * 恢复变量快照
   * 从快照中恢复变量的完整状态
   * @param snapshot 变量快照
   */
  restoreFromSnapshot(
    snapshot: {
      variables: ThreadVariable[];
      variableScopes: VariableScopes;
    }
  ): void {
    this.variables = snapshot.variables.map(v => ({ ...v }));
    this.variableScopes = {
      global: { ...snapshot.variableScopes.global },
      thread: { ...snapshot.variableScopes.thread },
      subgraph: snapshot.variableScopes.subgraph.map(scope => ({ ...scope })),
      loop: snapshot.variableScopes.loop.map(scope => ({ ...scope }))
    };
  }

  /**
   * 复制变量状态（用于 fork 场景）
   * @param sourceStateManager 源状态管理器
   */
  copyFrom(sourceStateManager: VariableStateManager): void {
    this.variables = sourceStateManager.variables.map((v: ThreadVariable) => ({ ...v }));

    // global 作用域通过引用共享
    this.variableScopes = {
      global: sourceStateManager.variableScopes.global,
      thread: { ...sourceStateManager.variableScopes.thread },
      subgraph: [],
      loop: []
    };
  }

  /**
   * 清空变量状态
   */
  clear(): void {
    this.variables = [];
    this.variableScopes = {
      global: {},
      thread: {},
      subgraph: [],
      loop: []
    };
  }

  /**
   * 获取变量作用域结构
   * @returns 变量作用域结构
   */
  getVariableScopes(): VariableScopes {
    return {
      global: { ...this.variableScopes.global },
      thread: { ...this.variableScopes.thread },
      subgraph: this.variableScopes.subgraph.map(scope => ({ ...scope })),
      loop: this.variableScopes.loop.map(scope => ({ ...scope }))
    };
  }
}