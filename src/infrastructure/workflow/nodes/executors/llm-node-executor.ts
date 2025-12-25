/**
 * LLM节点执行器
 * 简化版本，匹配INodeExecutor接口
 */

import { injectable } from 'inversify';
import { NodeData } from '../../../../domain/workflow/entities/workflow';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';

/**
 * LLM节点执行器
 */
@injectable()
export class LLMNodeExecutor {
  /**
   * 执行LLM节点
   */
  public async execute(
    node: NodeData,
    context: any
  ): Promise<any> {
    const startTime = Timestamp.now().getMilliseconds();

    try {
      // 简化的LLM执行逻辑
      const result = {
        response: `LLM处理完成: ${JSON.stringify(node.properties)}`,
        model: 'default-model',
        tokens: 100,
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
  public async canExecute(node: NodeData, context: any): Promise<boolean> {
    return node.type.toString() === 'llm';
  }

  /**
   * 获取执行器支持的节点类型
   */
  public getSupportedNodeTypes(): string[] {
    return ['llm'];
  }
}