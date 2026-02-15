/**
 * ConditionEvaluator - 条件评估器
 * 提供统一的条件评估功能，支持表达式字符串
 */

import type { Condition, EvaluationContext } from '@modular-agent/types';
import { RuntimeValidationError } from '@modular-agent/types';
import { ExpressionEvaluator } from './expression-parser';
import { getGlobalLogger } from '../logger/logger';

/**
 * 条件评估器实现
 */
export class ConditionEvaluator {
  private expressionEvaluator: ExpressionEvaluator;
  private logger = getGlobalLogger().child('ConditionEvaluator', { pkg: 'common-utils' });

  constructor() {
    this.expressionEvaluator = new ExpressionEvaluator();
  }

  /**
   * 评估条件
   * @param condition 条件
   * @param context 评估上下文
   * @returns 条件是否满足
   */
  evaluate(condition: Condition, context: EvaluationContext): boolean {
    // 必须提供 expression 字段
    if (!condition.expression) {
      throw new RuntimeValidationError(
        'Condition must have an expression field',
        { operation: 'condition_evaluation', context: { condition } }
      );
    }

    try {
      return this.expressionEvaluator.evaluate(condition.expression, context);
    } catch (error) {
      // 区分语法错误和运行时评估失败
      if (error instanceof RuntimeValidationError) {
        // 语法/解析错误：重新抛出
        throw error;
      } else {
        // 运行时评估失败：记录日志并返回 false
        this.logger.warn(
          `Condition evaluation failed: ${condition.expression}`,
          { expression: condition.expression, error: error instanceof Error ? error.message : String(error) }
        );
        return false;
      }
    }
  }
}

// 导出单例实例
export const conditionEvaluator = new ConditionEvaluator();