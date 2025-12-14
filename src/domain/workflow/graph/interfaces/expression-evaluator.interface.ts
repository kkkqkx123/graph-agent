/**
 * 表达式评估器接口
 *
 * 注意：这里的 ExecutionContext 使用基础设施层的定义，
 * 因为表达式评估器是在基础设施层实现的
 */
export interface IExpressionEvaluator {
  /**
   * 评估表达式
   * @param expression 表达式字符串
   * @param context 执行上下文（基础设施层）
   * @returns 评估结果
   */
  evaluate(expression: string, context: any): Promise<any>;

  /**
   * 验证表达式语法
   * @param expression 表达式字符串
   * @returns 验证结果
   */
  validate(expression: string): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * 获取表达式中使用的变量
   * @param expression 表达式字符串
   * @returns 变量名列表
   */
  extractVariables(expression: string): string[];
}