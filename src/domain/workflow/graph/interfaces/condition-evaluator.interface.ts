import { Edge } from '../entities/edge';

/**
 * 条件评估器接口
 *
 * 注意：这里的 ExecutionContext 使用基础设施层的定义，
 * 因为条件评估器是在基础设施层实现的
 */
export interface IConditionEvaluator {
  /**
   * 评估条件
   * @param edge 边实例
   * @param context 执行上下文（基础设施层）
   * @returns 评估结果
   */
  evaluate(edge: Edge, context: any): Promise<boolean>;

  /**
   * 验证条件表达式
   * @param edge 边实例
   * @returns 验证结果
   */
  validate(edge: Edge): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * 获取条件表达式中使用的变量
   * @param edge 边实例
   * @returns 变量名列表
   */
  extractVariables(edge: Edge): string[];
}