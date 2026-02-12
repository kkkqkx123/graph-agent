/**
 * VariableAccessor - 统一的变量访问器
 * 提供统一的变量访问接口，支持嵌套路径解析
 * 
 * 支持的路径格式：
 * - 简单变量名：userName（按作用域优先级查找）
 * - 嵌套对象：user.profile.name
 * - 数组索引：items[0].name
 * - 特殊命名空间：
 *   - input.userName：输入数据
 *   - output.result：输出数据
 *   - global.config：全局作用域变量
 *   - thread.state：线程作用域变量
 *   - subgraph.temp：子图作用域变量
 *   - loop.item：循环作用域变量
 * 
 * 使用示例：
 * - accessor.get('userName') - 按作用域优先级获取变量值
 * - accessor.get('user.profile.name') - 获取嵌套属性
 * - accessor.get('items[0].name') - 获取数组元素
 * - accessor.get('input.userName') - 获取输入数据
 * - accessor.get('output.result') - 获取输出数据
 * - accessor.get('global.config') - 获取全局变量
 * - accessor.get('thread.state') - 获取线程变量
 * - accessor.get('subgraph.temp') - 获取子图变量
 * - accessor.get('loop.item') - 获取循环变量
 */

import type { ThreadContext } from '../context/thread-context';
import type { VariableScope } from '@modular-agent/types/common';
import { resolvePath } from '@modular-agent/common-utils';

/**
 * 变量命名空间
 */
export enum VariableNamespace {
  /** 输入数据 */
  INPUT = 'input',
  /** 输出数据 */
  OUTPUT = 'output',
  /** 全局作用域 */
  GLOBAL = 'global',
  /** 线程作用域 */
  THREAD = 'thread',
  /** 本地作用域 */
  LOCAL = 'local',
  /** 循环作用域 */
  LOOP = 'loop'
}

/**
 * VariableAccessor - 统一的变量访问器
 */
export class VariableAccessor {
  /**
   * 构造函数
   * @param threadContext Thread 上下文
   */
  constructor(private readonly threadContext: ThreadContext) { }

  /**
   * 获取变量值
   * @param path 变量路径，支持嵌套和命名空间
   * @returns 变量值，如果不存在则返回 undefined
   * 
   * @example
   * // 简单变量（按作用域优先级查找）
   * accessor.get('userName')
   * 
   * // 嵌套路径
   * accessor.get('user.profile.name')
   * 
   * // 数组索引
   * accessor.get('items[0].name')
   * 
   * // 命名空间
   * accessor.get('input.userName')
   * accessor.get('output.result')
   * accessor.get('global.config')
   * accessor.get('thread.state')
   * accessor.get('subgraph.temp')
   * accessor.get('loop.item')
   */
  get(path: string): any {
    if (!path) {
      return undefined;
    }

    // 解析命名空间
    const parts = path.split('.');
    const namespace = parts[0];
    const remainingPath = parts.slice(1).join('.');

    // 处理命名空间
    switch (namespace) {
      case VariableNamespace.INPUT:
        return this.getFromInput(remainingPath);

      case VariableNamespace.OUTPUT:
        return this.getFromOutput(remainingPath);

      case VariableNamespace.GLOBAL:
        return this.getFromScope(remainingPath || path, 'global');

      case VariableNamespace.THREAD:
        return this.getFromScope(remainingPath || path, 'thread');

      case VariableNamespace.LOCAL:
        return this.getFromScope(remainingPath || path, 'local');

      case VariableNamespace.LOOP:
        return this.getFromScope(remainingPath || path, 'loop');

      default:
        // 没有命名空间前缀，按作用域优先级查找
        return this.getFromScopedVariables(path);
    }
  }

  /**
   * 检查变量是否存在
   * @param path 变量路径
   * @returns 是否存在
   */
  has(path: string): boolean {
    return this.get(path) !== undefined;
  }

  /**
   * 从输入数据中获取值
   * @param path 路径（相对于 input）
   * @returns 值
   */
  private getFromInput(path: string): any {
    const input = this.threadContext.getInput();
    if (!path) {
      return input;
    }
    return resolvePath(path, input);
  }

  /**
   * 从输出数据中获取值
   * @param path 路径（相对于 output）
   * @returns 值
   */
  private getFromOutput(path: string): any {
    const output = this.threadContext.getOutput();
    if (!path) {
      return output;
    }
    return resolvePath(path, output);
  }

  /**
   * 从指定作用域获取值
   * @param path 路径
   * @param scope 作用域
   * @returns 值
   */
  private getFromScope(path: string, scope: VariableScope): any {
    const thread = this.threadContext.thread;
    const scopes = thread.variableScopes;

    let scopeData: Record<string, any> | undefined;

    switch (scope) {
      case 'global':
        scopeData = scopes.global;
        break;
      case 'thread':
        scopeData = scopes.thread;
        break;
      case 'local':
        if (scopes.local.length > 0) {
          scopeData = scopes.local[scopes.local.length - 1];
        }
        break;
      case 'loop':
        if (scopes.loop.length > 0) {
          scopeData = scopes.loop[scopes.loop.length - 1];
        }
        break;
    }

    if (!scopeData) {
      return undefined;
    }

    // 提取根变量名
    const pathParts = path.split('.');
    const rootVarName = pathParts[0];

    if (!rootVarName) {
      return undefined;
    }

    const rootValue = scopeData[rootVarName];

    if (rootValue === undefined) {
      return undefined;
    }

    // 如果路径包含嵌套，使用 resolvePath 解析剩余路径
    if (pathParts.length > 1) {
      const remainingPath = pathParts.slice(1).join('.');
      return resolvePath(remainingPath, rootValue);
    }

    return rootValue;
  }

  /**
   * 从作用域变量中获取值（按优先级查找）
   * 优先级：loop > subgraph > thread > global
   * @param path 路径
   * @returns 值
   */
  private getFromScopedVariables(path: string): any {
    // 提取根变量名
    const pathParts = path.split('.');
    const rootVarName = pathParts[0];

    if (!rootVarName) {
      return undefined;
    }

    const rootValue = this.threadContext.getVariable(rootVarName);

    if (rootValue === undefined) {
      return undefined;
    }

    // 如果路径包含嵌套，使用 resolvePath 解析剩余路径
    if (pathParts.length > 1) {
      const remainingPath = pathParts.slice(1).join('.');
      return resolvePath(remainingPath, rootValue);
    }

    return rootValue;
  }
}