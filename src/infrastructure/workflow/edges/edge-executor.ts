import { injectable, inject } from 'inversify';
import { EdgeValueObject } from '../../../domain/workflow/value-objects/edge-value-object';
import { ValueObjectExecutor, FunctionExecutionContext } from '../functions/executors/value-object-executor';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 边执行器
 * 使用统一的 ValueObjectExecutor 执行边值对象
 */
@injectable()
export class EdgeExecutor {
  constructor(
    @inject('ValueObjectExecutor') private readonly valueObjectExecutor: ValueObjectExecutor,
    @inject('Logger') private readonly logger: ILogger
  ) { }

  /**
   * 执行边
   * @param edge 边值对象
   * @param context 执行上下文
   * @returns 执行结果
   */
  async execute(edge: EdgeValueObject, context: FunctionExecutionContext): Promise<any> {
    this.logger.debug('开始执行边', {
      edgeId: edge.id.toString(),
      edgeType: edge.type.toString(),
      fromNodeId: edge.fromNodeId.toString(),
      toNodeId: edge.toNodeId.toString()
    });

    try {
      const result = await this.valueObjectExecutor.executeValueObject(edge, context);

      this.logger.info('边执行完成', {
        edgeId: edge.id.toString(),
        edgeType: edge.type.toString(),
        success: true
      });

      return {
        success: true,
        output: result,
        metadata: {
          edgeId: edge.id.toString(),
          edgeType: edge.type.toString(),
          fromNodeId: edge.fromNodeId.toString(),
          toNodeId: edge.toNodeId.toString()
        }
      };
    } catch (error) {
      this.logger.error('边执行失败', error instanceof Error ? error : new Error(String(error)), {
        edgeId: edge.id.toString(),
        edgeType: edge.type.toString()
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          edgeId: edge.id.toString(),
          edgeType: edge.type.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * 验证边是否可以执行
   * @param edge 边值对象
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  async canExecute(edge: EdgeValueObject, context: FunctionExecutionContext): Promise<boolean> {
    const validation = this.valueObjectExecutor.validateMapping(edge);
    return validation.valid;
  }

  /**
   * 获取执行器支持的边类型
   * @returns 支持的边类型列表
   */
  getSupportedEdgeTypes(): string[] {
    // 返回所有已注册映射的边类型
    // 实际实现需要从 FunctionRegistry 获取
    return [];
  }
}