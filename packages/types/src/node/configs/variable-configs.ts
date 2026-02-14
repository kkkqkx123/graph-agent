/**
 * 变量节点配置类型定义
 */

import type { VariableScope } from '../../common';

/**
 * 变量操作节点配置
 */
export interface VariableNodeConfig {
  /** 操作的变量名称 */
  variableName: string;
  /** 操作的变量类型【包含number、string、boolean、array、object】 */
  variableType: 'number' | 'string' | 'boolean' | 'array' | 'object';
  /** 操作的表达式【直接用表达式覆盖相应变量】 */
  expression: string;
  /** 变量作用域 */
  scope?: VariableScope;
  /** 是否只读 */
  readonly?: boolean;
}