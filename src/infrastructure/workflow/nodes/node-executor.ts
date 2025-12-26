import { injectable, inject } from 'inversify';
import { NodeValueObject } from '../../../domain/workflow/value-objects/node-value-object';
import { ValueObjectExecutor, FunctionExecutionContext } from '../functions/executors/value-object-executor';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 节点执行器
 * 使用统一的 ValueObjectExecutor 执行节点值对象
 */
@injectable()
export class NodeExecutor {
  constructor(
    @inject('ValueObjectExecutor') private readonly valueObjectExecutor: ValueObjectExecutor,
    @inject('Logger') private readonly logger: ILogger
  ) { }

  /**
   * 执行节点
   * @param node 节点值对象
   * @param context 执行上下文
   * @returns 执行结果
   */
  async execute(node: NodeValueObject, context: FunctionExecutionContext): Promise<any> {
    this.logger.debug('开始执行节点', {
      nodeId: node.id.toString(),
      nodeType: node.type.toString(),
      nodeName: node.name
    });

    try {
      const result = await this.valueObjectExecutor.executeValueObject(node, context);

      this.logger.info('节点执行完成', {
        nodeId: node.id.toString(),
        nodeType: node.type.toString(),
        success: true
      });

      return {
        success: true,
        output: result,
        metadata: {
          nodeId: node.id.toString(),
          nodeType: node.type.toString(),
          nodeName: node.name
        }
      };
    } catch (error) {
      this.logger.error('节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.id.toString(),
        nodeType: node.type.toString()
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          nodeId: node.id.toString(),
          nodeType: node.type.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * 验证节点是否可以执行
   * @param node 节点值对象
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  async canExecute(node: NodeValueObject, context: FunctionExecutionContext): Promise<boolean> {
    const validation = this.valueObjectExecutor.validateMapping(node);
    return validation.valid;
  }

  /**
   * 获取执行器支持的节点类型
   * @returns 支持的节点类型列表
   */
  getSupportedNodeTypes(): string[] {
    // 返回所有已注册映射的节点类型
    // 实际实现需要从 FunctionRegistry 获取
    return [];
  }
}