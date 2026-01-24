import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { ILogger } from '../../../../domain/common/types/logger-types';
import { NodeExecutionStrategyRegistry } from '../strategies/strategy-registry';

/**
 * 节点执行处理器接口
 */
export interface INodeExecutionHandler {
  /**
   * 执行节点
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult>;

  /**
   * 验证节点是否可以执行
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  canExecute(node: Node, context: ExecutionContext): Promise<boolean>;
}

/**
 * 节点执行处理器
 *
 * 职责：
 * - 协调节点执行流程
 * - 管理节点执行策略
 * - 处理错误和重试
 */
@injectable()
export class NodeExecutionHandler implements INodeExecutionHandler {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('NodeExecutionStrategyRegistry') private readonly strategyRegistry: NodeExecutionStrategyRegistry
  ) { }

  /**
   * 执行节点
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 执行结果
   */
  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    this.logger.debug('开始执行节点', {
      nodeId: node.nodeId.toString(),
      nodeType: node.type.toString(),
      nodeName: node.name,
    });

    try {
      // 获取对应的执行策略
      const strategy = this.strategyRegistry.get(node.type);

      if (!strategy) {
        this.logger.warn('节点类型没有对应的执行策略', {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        });

        return {
          success: false,
          error: `节点类型 ${node.type.toString()} 没有对应的执行策略`,
          metadata: {
            nodeId: node.nodeId.toString(),
            nodeType: node.type.toString(),
          },
        };
      }

      // 执行节点
      const result = await strategy.execute(node, context);

      return result;
    } catch (error) {
      this.logger.error('节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.nodeId.toString(),
        nodeType: node.type.toString(),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * 验证节点是否可以执行
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  async canExecute(node: Node, context: ExecutionContext): Promise<boolean> {
    this.logger.debug('验证节点是否可以执行', {
      nodeId: node.nodeId.toString(),
      nodeType: node.type.toString(),
    });

    const strategy = this.strategyRegistry.get(node.type);
    return strategy ? strategy.canExecute(node) : false;
  }
}