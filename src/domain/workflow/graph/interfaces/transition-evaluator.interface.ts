import { Edge } from '../entities/edge';

/**
 * 转换评估器接口
 *
 * 注意：这里的 ExecutionContext 使用基础设施层的定义，
 * 因为转换评估器是在基础设施层实现的
 */
export interface ITransitionEvaluator {
  /**
   * 评估转换是否可以执行
   * @param edge 边实例
   * @param context 执行上下文（基础设施层）
   * @returns 是否可以执行转换
   */
  evaluate(edge: Edge, context: any): Promise<boolean>;

  /**
   * 验证转换条件
   * @param edge 边实例
   * @returns 验证结果
   */
  validate(edge: Edge): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * 获取评估器支持的边类型
   * @returns 支持的边类型列表
   */
  getSupportedEdgeTypes(): string[];
}