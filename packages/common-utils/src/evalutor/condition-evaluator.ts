/**
 * ConditionEvaluator - 条件评估器
 * 提供统一的条件评估功能，支持表达式字符串
 */

import type { Condition, EvaluationContext } from '@modular-agent/types';
import { ExpressionEvaluator } from './expression-parser';

/**
 * 条件评估器实现
 */
export class ConditionEvaluator {
  private expressionEvaluator: ExpressionEvaluator;

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
    try {
      // 必须提供 expression 字段
      if (!condition.expression) {
        console.error('Condition must have an expression field');
        return false;
      }

      return this.expressionEvaluator.evaluate(condition.expression, context);
    } catch (error) {
      // 评估失败返回false，不影响主流程
      console.error(`Failed to evaluate condition: ${condition.expression}`, error);
      return false;
    }
  }
}

// 导出单例实例
export const conditionEvaluator = new ConditionEvaluator();