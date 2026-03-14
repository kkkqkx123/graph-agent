/**
 * 线程变量类型定义
 */

import type { Metadata } from '../common.js';
import type { VariableScope } from './scopes.js';

/**
 * 变量值类型
 */
export type VariableValueType = 'number' | 'string' | 'boolean' | 'array' | 'object';

/**
 * 线程变量类型
 */
export interface ThreadVariable {
  /** 变量名称 */
  name: string;
  /** 变量值 */
  value: any;
  /** 变量类型 */
  type: VariableValueType;
  /** 变量作用域 */
  scope: VariableScope;
  /** 是否只读 */
  readonly: boolean;
  /** 变量元数据 */
  metadata?: Metadata;
}