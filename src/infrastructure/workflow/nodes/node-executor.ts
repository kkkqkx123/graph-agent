import { injectable, inject } from 'inversify';
import { NodeValueObject } from '../../../domain/workflow/value-objects';
import { Node } from './node';
import { NodeFactory } from './node-factory';
import { WorkflowExecutionContext } from './node';
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
   * @param node 节点实例或节点值对象
   * @param context 执行上下文
   * @returns 执行结果
   */
  async execute(node: Node | NodeValueObject, context: WorkflowExecutionContext): Promise<any> {
    // 如果传入的是NodeValueObject，转换为Node实例
    let nodeInstance: Node;
    if (node instanceof NodeValueObject) {
      nodeInstance = NodeFactory.fromNodeValueObject(node);
    } else {
      nodeInstance = node;
    }

    this.logger.debug('开始执行节点', {
      nodeId: nodeInstance.id.toString(),
      nodeType: nodeInstance.type.toString(),
      nodeName: nodeInstance.name
    });

    try {
      // 验证节点配置
      const validation = nodeInstance.validate();
      if (!validation.valid) {
        this.logger.warn('节点配置验证失败', {
          nodeId: nodeInstance.id.toString(),
          nodeType: nodeInstance.type.toString(),
          errors: validation.errors
        });

        return {
          success: false,
          error: `节点配置验证失败: ${validation.errors.join(', ')}`,
          metadata: {
            nodeId: nodeInstance.id.toString(),
            nodeType: nodeInstance.type.toString(),
            validationErrors: validation.errors
          }
        };
      }

      // 直接执行节点
      const result = await nodeInstance.execute(context);

      this.logger.info('节点执行完成', {
        nodeId: nodeInstance.id.toString(),
        nodeType: nodeInstance.type.toString(),
        success: result.success
      });

      return result;
    } catch (error) {
      this.logger.error('节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: nodeInstance.id.toString(),
        nodeType: nodeInstance.type.toString()
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          nodeId: nodeInstance.id.toString(),
          nodeType: nodeInstance.type.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * 验证节点是否可以执行
   * @param node 节点实例或节点值对象
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  async canExecute(node: Node | NodeValueObject, context: WorkflowExecutionContext): Promise<boolean> {
    let nodeInstance: Node;
    if (node instanceof NodeValueObject) {
      nodeInstance = NodeFactory.fromNodeValueObject(node);
    } else {
      nodeInstance = node;
    }

    return nodeInstance.canExecute(context);
  }

  /**
   * 获取执行器支持的节点类型
   * @returns 支持的节点类型列表
   */
  getSupportedNodeTypes(): string[] {
    return NodeFactory.getSupportedNodeTypes();
  }

  /**
   * 批量执行节点
   * @param nodes 节点列表
   * @param context 执行上下文
   * @returns 执行结果列表
   */
  async executeBatch(nodes: (Node | NodeValueObject)[], context: WorkflowExecutionContext): Promise<any[]> {
    const results: any[] = [];

    for (const node of nodes) {
      const result = await this.execute(node, context);
      results.push(result);
    }

    return results;
  }
}