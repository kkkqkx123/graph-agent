/**
 * VariableManagerAPI - 变量管理API
 * 封装变量管理功能，提供线程变量的查询和更新
 * 注意：变量全部由workflow的静态定义提供，API不提供创建新变量的功能
 */

import { ThreadRegistry } from '../core/execution/thread-registry';
import type { Thread, ThreadVariable } from '../types/thread';
import { NotFoundError, ValidationError } from '../types/errors';

/**
 * 变量更新选项
 */
export interface VariableUpdateOptions {
  /** 是否验证变量类型 */
  validateType?: boolean;
  /** 是否允许更新只读变量 */
  allowReadonlyUpdate?: boolean;
}

/**
 * 变量过滤器
 */
export interface VariableFilter {
  /** 变量名称 */
  name?: string;
  /** 变量类型 */
  type?: string;
  /** 变量作用域 */
  scope?: 'local' | 'global';
  /** 是否只读 */
  readonly?: boolean;
}

/**
 * VariableManagerAPI - 变量管理API
 */
export class VariableManagerAPI {
  private threadRegistry: ThreadRegistry;

  constructor(threadRegistry?: ThreadRegistry) {
    this.threadRegistry = threadRegistry || new ThreadRegistry();
  }

  /**
   * 获取变量值
   * @param threadId 线程ID
   * @param name 变量名称
   * @returns 变量值
   * @throws NotFoundError 如果线程或变量不存在
   */
  async getVariable(threadId: string, name: string): Promise<any> {
    const thread = await this.getThread(threadId);

    if (!thread.variableValues || !(name in thread.variableValues)) {
      throw new NotFoundError(`Variable not found: ${name}`, 'variable', name);
    }

    return thread.variableValues[name];
  }

  /**
   * 获取变量定义
   * @param threadId 线程ID
   * @param name 变量名称
   * @returns 变量定义
   * @throws NotFoundError 如果线程或变量不存在
   */
  async getVariableDefinition(threadId: string, name: string): Promise<ThreadVariable> {
    const thread = await this.getThread(threadId);

    const variable = thread.variables.find(v => v.name === name);
    if (!variable) {
      throw new NotFoundError(`Variable not found: ${name}`, 'variable', name);
    }

    return variable;
  }

  /**
   * 获取所有变量值
   * @param threadId 线程ID
   * @returns 变量值映射
   */
  async getVariables(threadId: string): Promise<Record<string, any>> {
    const thread = await this.getThread(threadId);
    return { ...thread.variableValues };
  }

  /**
   * 获取所有变量定义
   * @param threadId 线程ID
   * @param filter 过滤条件
   * @returns 变量定义数组
   */
  async getVariableDefinitions(threadId: string, filter?: VariableFilter): Promise<ThreadVariable[]> {
    const thread = await this.getThread(threadId);

    let variables = [...thread.variables];

    // 应用过滤条件
    if (filter) {
      variables = variables.filter(v => this.applyFilter(v, filter));
    }

    return variables;
  }

  /**
   * 更新变量值
   * @param threadId 线程ID
   * @param name 变量名称
   * @param value 新值
   * @param options 更新选项
   * @throws NotFoundError 如果线程或变量不存在
   * @throws ValidationError 如果变量是只读的或类型不匹配
   */
  async updateVariable(
    threadId: string,
    name: string,
    value: any,
    options?: VariableUpdateOptions
  ): Promise<void> {
    const thread = await this.getThread(threadId);

    const variable = thread.variables.find(v => v.name === name);
    if (!variable) {
      throw new NotFoundError(`Variable not found: ${name}`, 'variable', name);
    }

    // 检查是否为只读变量
    if (variable.readonly && !options?.allowReadonlyUpdate) {
      throw new ValidationError(`Variable ${name} is readonly and cannot be modified`);
    }

    // 验证变量类型
    if (options?.validateType !== false) {
      this.validateVariableType(variable, value);
    }

    // 更新变量值
    thread.variableValues[name] = value;
    variable.value = value;
  }

  /**
   * 批量更新变量值
   * @param threadId 线程ID
   * @param updates 变量更新映射
   * @param options 更新选项
   * @throws NotFoundError 如果线程或某个变量不存在
   * @throws ValidationError 如果某个变量是只读的或类型不匹配
   */
  async updateVariables(
    threadId: string,
    updates: Record<string, any>,
    options?: VariableUpdateOptions
  ): Promise<void> {
    const thread = await this.getThread(threadId);

    // 验证所有变量存在且可更新
    for (const name in updates) {
      const variable = thread.variables.find(v => v.name === name);
      if (!variable) {
        throw new NotFoundError(`Variable not found: ${name}`, 'variable', name);
      }

      // 检查是否为只读变量
      if (variable.readonly && !options?.allowReadonlyUpdate) {
        throw new ValidationError(`Variable ${name} is readonly and cannot be modified`);
      }

      // 验证变量类型
      if (options?.validateType !== false) {
        this.validateVariableType(variable, updates[name]);
      }
    }

    // 更新所有变量值
    for (const name in updates) {
      const variable = thread.variables.find(v => v.name === name)!;
      thread.variableValues[name] = updates[name];
      variable.value = updates[name];
    }
  }

  /**
   * 检查变量是否存在
   * @param threadId 线程ID
   * @param name 变量名称
   * @returns 是否存在
   */
  async hasVariable(threadId: string, name: string): Promise<boolean> {
    const thread = await this.getThread(threadId);
    return name in thread.variableValues;
  }

  /**
   * 获取变量数量
   * @param threadId 线程ID
   * @returns 变量数量
   */
  async getVariableCount(threadId: string): Promise<number> {
    const thread = await this.getThread(threadId);
    return thread.variables.length;
  }

  /**
   * 按作用域获取变量
   * @param threadId 线程ID
   * @param scope 变量作用域
   * @returns 变量定义数组
   */
  async getVariablesByScope(threadId: string, scope: 'local' | 'global'): Promise<ThreadVariable[]> {
    return this.getVariableDefinitions(threadId, { scope });
  }

  /**
   * 按类型获取变量
   * @param threadId 线程ID
   * @param type 变量类型
   * @returns 变量定义数组
   */
  async getVariablesByType(threadId: string, type: string): Promise<ThreadVariable[]> {
    return this.getVariableDefinitions(threadId, { type });
  }

  /**
   * 获取只读变量
   * @param threadId 线程ID
   * @returns 变量定义数组
   */
  async getReadonlyVariables(threadId: string): Promise<ThreadVariable[]> {
    return this.getVariableDefinitions(threadId, { readonly: true });
  }

  /**
   * 获取可写变量
   * @param threadId 线程ID
   * @returns 变量定义数组
   */
  async getWritableVariables(threadId: string): Promise<ThreadVariable[]> {
    return this.getVariableDefinitions(threadId, { readonly: false });
  }

  /**
   * 导出变量
   * @param threadId 线程ID
   * @param filter 过滤条件
   * @returns 变量导出数据
   */
  async exportVariables(
    threadId: string,
    filter?: VariableFilter
  ): Promise<Record<string, any>> {
    const variables = await this.getVariableDefinitions(threadId, filter);
    const exportData: Record<string, any> = {};

    for (const variable of variables) {
      exportData[variable.name] = {
        value: variable.value,
        type: variable.type,
        scope: variable.scope,
        readonly: variable.readonly,
        metadata: variable.metadata
      };
    }

    return exportData;
  }

  /**
   * 获取底层ThreadRegistry实例
   * @returns ThreadRegistry实例
   */
  getThreadRegistry(): ThreadRegistry {
    return this.threadRegistry;
  }

  /**
   * 获取线程实例
   * @param threadId 线程ID
   * @returns 线程实例
   * @throws NotFoundError 如果线程不存在
   */
  private async getThread(threadId: string): Promise<Thread> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'thread', threadId);
    }
    return threadContext.thread;
  }

  /**
   * 验证变量类型
   * @param variable 变量定义
   * @param value 变量值
   * @throws ValidationError 如果类型不匹配
   */
  private validateVariableType(variable: ThreadVariable, value: any): void {
    const expectedType = variable.type;
    const actualType = typeof value;

    // 特殊处理数组和对象类型
    if (expectedType === 'array') {
      if (!Array.isArray(value)) {
        throw new ValidationError(
          `Variable ${variable.name} expects type 'array', but got '${actualType}'`
        );
      }
    } else if (expectedType === 'object') {
      if (actualType !== 'object' || value === null || Array.isArray(value)) {
        throw new ValidationError(
          `Variable ${variable.name} expects type 'object', but got '${actualType}'`
        );
      }
    } else {
      // 基本类型检查
      if (actualType !== expectedType) {
        throw new ValidationError(
          `Variable ${variable.name} expects type '${expectedType}', but got '${actualType}'`
        );
      }
    }
  }

  /**
   * 应用过滤条件
   * @param variable 变量定义
   * @param filter 过滤条件
   * @returns 是否匹配
   */
  private applyFilter(variable: ThreadVariable, filter: VariableFilter): boolean {
    if (filter.name && !variable.name.includes(filter.name)) {
      return false;
    }
    if (filter.type && variable.type !== filter.type) {
      return false;
    }
    if (filter.scope && variable.scope !== filter.scope) {
      return false;
    }
    if (filter.readonly !== undefined && variable.readonly !== filter.readonly) {
      return false;
    }
    return true;
  }
}