/**
 * 线程变量类型定义
 */

import type { Metadata, VariableScope } from '../common';

/**
 * 线程变量类型
 */
export interface ThreadVariable {
  /** 变量名称 */
  name: string;
  /** 变量值 */
  value: any;
  /** 变量类型 */
  type: string;
  /** 变量作用域 */
  scope: VariableScope;
  /** 是否只读 */
  readonly: boolean;
  /** 变量元数据 */
  metadata?: Metadata;
}