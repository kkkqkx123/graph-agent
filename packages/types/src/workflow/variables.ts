/**
 * 工作流变量类型定义
 */

import type { VariableScope } from '../common';

/**
 * 工作流变量定义类型
 * 用于在工作流定义阶段声明变量，提供类型安全和初始值
 *
 * 说明：
 * - 在工作流定义时声明变量，提供类型信息和默认值
 * - 执行时转换为 ThreadVariable，存储在 Thread.variableScopes.thread 中
 * - 通过 VARIABLE 节点修改，通过表达式访问（{{variableName}}）
 *
 * 示例：
 * ```typescript
 * workflow.variables = [
 *   { name: 'userName', type: 'string', defaultValue: 'Alice' },
 *   { name: 'userAge', type: 'number', defaultValue: 25 }
 * ]
 *
 * // 执行时
 * thread.variableScopes.thread = {
 *   userName: 'Alice',
 *   userAge: 25
 * }
 *
 * // 在表达式中访问
 * {{userName}}  // 'Alice'
 * {{userAge}}  // 25
 * ```
 */
export interface WorkflowVariable {
  /** 变量名称 */
  name: string;
  /** 变量类型 */
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  /** 变量初始值 */
  defaultValue?: any;
  /** 变量描述 */
  description?: string;
  /** 是否必需 */
  required?: boolean;
  /** 是否只读 */
  readonly?: boolean;
  /** 变量作用域 */
  scope?: VariableScope;
}