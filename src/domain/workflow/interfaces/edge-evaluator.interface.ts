import { Edge } from '@domain/workflow/entities/edges/base/edge';
import { IExecutionContext } from '@/domain/workflow/interfaces/execution-context.interface';

/**
 * 边评估器接口
 * 
 * 统一了条件评估和转换评估的功能，负责评估工作流图中边的条件和转换
 */
export interface IEdgeEvaluator {
  /**
   * 评估边是否可以执行
   * @param edge 边实例
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  evaluate(edge: Edge, context: IExecutionContext): Promise<boolean>;

  /**
   * 验证边的条件或转换配置
   * @param edge 边实例
   * @returns 验证结果
   */
  validate(edge: Edge): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * 提取边条件或转换中使用的变量
   * @param edge 边实例
   * @returns 变量名列表
   */
  extractVariables(edge: Edge): string[];

  /**
   * 获取评估器支持的边类型
   * @returns 支持的边类型列表
   */
  getSupportedEdgeTypes(): string[];
}