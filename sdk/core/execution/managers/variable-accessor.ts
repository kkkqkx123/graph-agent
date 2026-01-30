/**
 * VariableAccessor - 统一的变量访问器
 * 提供统一的变量访问接口，支持嵌套路径解析
 * 
 * 支持的路径格式：
 * - 简单变量名：userName
 * - 嵌套对象：user.profile.name
 * - 数组索引：items[0].name
 * - 特殊命名空间：input.userName, output.result, variables.userName
 * 
 * 使用示例：
 * - accessor.get('userName') - 获取变量值
 * - accessor.get('user.profile.name') - 获取嵌套属性
 * - accessor.get('items[0].name') - 获取数组元素
 * - accessor.get('input.userName') - 获取输入数据
 * - accessor.get('output.result') - 获取输出数据
 */

import type { ThreadContext } from '../context/thread-context';
import { resolvePath } from '../../../utils/evalutor/path-resolver';

/**
 * 变量命名空间
 */
export enum VariableNamespace {
  /** 输入数据 */
  INPUT = 'input',
  /** 输出数据 */
  OUTPUT = 'output',
  /** 变量（默认） */
  VARIABLES = 'variables',
  /** 全局变量 */
  GLOBAL = 'global'
}

/**
 * VariableAccessor - 统一的变量访问器
 */
export class VariableAccessor {
  /**
   * 构造函数
   * @param threadContext Thread 上下文
   */
  constructor(private readonly threadContext: ThreadContext) {}

  /**
   * 获取变量值
   * @param path 变量路径，支持嵌套和命名空间
   * @returns 变量值，如果不存在则返回 undefined
   * 
   * @example
   * // 简单变量
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
        return this.getFromGlobal(remainingPath || path);
      
      case VariableNamespace.VARIABLES:
        return this.getFromVariables(remainingPath || path);
      
      default:
        // 没有命名空间前缀，从变量中查找
        return this.getFromVariables(path);
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
   * 从变量中获取值
   * @param path 路径
   * @returns 值
   */
  private getFromVariables(path: string): any {
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

  /**
   * 从全局变量中获取值
   * @param path 路径
   * @returns 值
   */
  private getFromGlobal(path: string): any {
    const allVariables = this.threadContext.getAllVariables();
    
    // 提取根变量名
    const pathParts = path.split('.');
    const rootVarName = pathParts[0];
    
    if (!rootVarName) {
      return undefined;
    }
    
    const rootValue = allVariables[rootVarName];

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