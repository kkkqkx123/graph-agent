/**
 * Condition类型定义
 * 定义条件评估相关的类型和接口
 */

import type { Metadata } from './common';

/**
 * 条件接口
 */
export interface Condition {
  /** 表达式字符串（必需，支持更直观的语法） */
  expression: string;
  /** 条件元数据 */
  metadata?: Metadata;
}

/**
 * 评估上下文接口
 *
 * 数据源访问规则：
 * - variables: 全局/局部变量，通过 variables.xxx 或简单变量名访问
 * - input: 节点输入数据，必须通过 input.xxx 显式访问
 * - output: 节点输出数据，必须通过 output.xxx 显式访问
 *
 * 注意：为避免数据源冲突，建议使用显式前缀（input.、output.、variables.）
 */
export interface EvaluationContext {
  /** 变量值映射 */
  variables: Record<string, any>;
  /** 输入数据 */
  input: Record<string, any>;
  /** 输出数据 */
  output: Record<string, any>;
}

/**
 * 条件评估器接口
 */
export interface ConditionEvaluator {
  /**
   * 评估条件
   * @param condition 条件
   * @param context 评估上下文
   * @returns 条件是否满足
   */
  evaluate(condition: Condition, context: EvaluationContext): boolean;

  /**
   * 获取变量值
   * @param variableName 变量名（仅支持简单变量名）
   * @param context 评估上下文
   * @returns 变量值
   */
  getVariableValue(variableName: string, context: EvaluationContext): any;
}