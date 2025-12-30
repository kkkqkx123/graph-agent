import { injectable, inject } from 'inversify';
import { Node } from '../../../domain/workflow/entities/node';
import { WorkflowExecutionContext } from '../../../domain/workflow/entities/node';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 节点执行器
 * 直接执行节点实例，无需通过函数注册表
 */
@injectable()
export class NodeExecutor {
  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) { }

  /**
   * 执行节点
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 执行结果
   */
  async execute(node: Node, context: WorkflowExecutionContext): Promise<any> {
    this.logger.debug('开始执行节点', {
      nodeId: node.nodeId.toString(),
      nodeType: node.type.toString(),
      nodeName: node.name
    });

    try {
      // 验证节点配置
      const validation = node.validate();
      if (!validation.valid) {
        this.logger.warn('节点配置验证失败', {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
          errors: validation.errors
        });

        return {
          success: false,
          error: `节点配置验证失败: ${validation.errors.join(', ')}`,
          metadata: {
            nodeId: node.nodeId.toString(),
            nodeType: node.type.toString(),
            validationErrors: validation.errors
          }
        };
      }

      // 直接执行节点
      const result = await node.execute(context);

      this.logger.info('节点执行完成', {
        nodeId: node.nodeId.toString(),
        nodeType: node.type.toString(),
        success: result.success
      });

      return result;
    } catch (error) {
      this.logger.error('节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.nodeId.toString(),
        nodeType: node.type.toString()
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * 验证节点是否可以执行
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  async canExecute(node: Node, context: WorkflowExecutionContext): Promise<boolean> {
    return node.canExecute();
  }

  /**
   * 获取执行器支持的节点类型
   * @returns 支持的节点类型列表
   */
  getSupportedNodeTypes(): string[] {
    return ['llm', 'tool', 'condition', 'task'];
  }

  /**
   * 批量执行节点
   * @param nodes 节点列表
   * @param context 执行上下文
   * @returns 执行结果列表
   */
  async executeBatch(nodes: Node[], context: WorkflowExecutionContext): Promise<any[]> {
    const results: any[] = [];

    for (const node of nodes) {
      const result = await this.execute(node, context);
      results.push(result);
    }

    return results;
  }
}