/**
 * 等待节点执行器
 * 简化版本，匹配INodeExecutor接口
 */

import { injectable } from 'inversify';
import { NodeValueObject } from '../../../../domain/workflow/value-objects/node-value-object';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';

/**
 * 等待节点执行器
 */
@injectable()
export class WaitNodeExecutor {
  /**
   * 执行等待节点
   */
  public async execute(
    node: NodeValueObject,
    context: any
  ): Promise<any> {
    const startTime = Timestamp.now().getMilliseconds();

    try {
      // 简化的等待逻辑
      const waitTime = (node.properties?.['waitTime'] as number) || 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));

      const result = {
        waitCompleted: true,
        waitTime,
        timestamp: Timestamp.now(),
        nodeId: node.id.toString()
      };

      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Timestamp.now().getMilliseconds() - startTime,
          nodeId: node.id.toString(),
          nodeType: node.type.toString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Timestamp.now().getMilliseconds() - startTime,
          nodeId: node.id.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * 验证节点是否可以执行
   */
  public async canExecute(node: NodeValueObject, context: any): Promise<boolean> {
    return node.type.toString() === 'wait';
  }

  /**
   * 获取执行器支持的节点类型
   */
  public getSupportedNodeTypes(): string[] {
    return ['wait'];
  }
}