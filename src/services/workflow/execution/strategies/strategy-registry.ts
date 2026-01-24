/**
 * 节点执行策略注册表
 *
 * 管理不同节点类型的执行策略
 */

import { injectable, inject } from 'inversify';
import { NodeType } from '../../../../domain/workflow/value-objects/node/node-type';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * 节点执行策略注册表
 */
@injectable()
export class NodeExecutionStrategyRegistry {
  private strategies: Map<string, INodeExecutionStrategy> = new Map();

  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 注册执行策略
   * @param nodeType 节点类型
   * @param strategy 执行策略
   */
  register(nodeType: NodeType, strategy: INodeExecutionStrategy): void {
    const typeKey = nodeType.toString();
    this.strategies.set(typeKey, strategy);
    this.logger.debug('注册节点执行策略', {
      nodeType: typeKey,
      strategy: strategy.constructor.name,
    });
  }

  /**
   * 获取执行策略
   * @param nodeType 节点类型
   * @returns 执行策略
   */
  get(nodeType: NodeType): INodeExecutionStrategy | undefined {
    const typeKey = nodeType.toString();
    return this.strategies.get(typeKey);
  }

  /**
   * 检查是否已注册策略
   * @param nodeType 节点类型
   * @returns 是否已注册
   */
  has(nodeType: NodeType): boolean {
    const typeKey = nodeType.toString();
    return this.strategies.has(typeKey);
  }

  /**
   * 获取所有已注册的策略
   * @returns 策略映射
   */
  getAll(): Map<string, INodeExecutionStrategy> {
    return new Map(this.strategies);
  }

  /**
   * 清空所有策略
   */
  clear(): void {
    this.strategies.clear();
    this.logger.debug('清空所有节点执行策略');
  }
}