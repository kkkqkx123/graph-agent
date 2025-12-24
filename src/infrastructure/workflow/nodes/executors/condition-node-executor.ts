/**
 * 条件节点执行器
 * 简化版本，匹配INodeExecutor接口
 */

import { injectable } from 'inversify';
import { NodeData } from '../../../../domain/workflow/entities/workflow';

/**
 * 条件节点执行器
 */
@injectable()
export class ConditionNodeExecutor {
  /**
   * 执行条件节点
   */
  public async execute(
    node: NodeData,
    context: any
  ): Promise<any> {
    const startTime = Date.now();
     
    try {
      // 简化的条件逻辑
      const result = {
        condition: true,
        result: context?.input || node.properties,
        timestamp: new Date(),
        nodeId: node.id.toString()
      };
      
      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          nodeId: node.id.toString(),
          nodeType: node.type.toString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          nodeId: node.id.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * 验证节点是否可以执行
   */
  public async canExecute(node: NodeData, context: any): Promise<boolean> {
    return node.type.toString() === 'condition';
  }

  /**
   * 获取执行器支持的节点类型
   */
  public getSupportedNodeTypes(): string[] {
    return ['condition'];
  }
}