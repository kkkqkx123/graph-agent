import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * ConditionNode 属性接口
 */
export interface ConditionNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.condition()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly conditionFunctionId: string;
    readonly conditionConfig?: Record<string, any>;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * ConditionNode 实体
 *
 * 条件判断节点，负责：
 * 1. 存储条件配置
 * 2. 定义条件函数
 *
 * 不负责：
 * - 条件评估（由 ConditionNodeStrategy 负责）
 */
export class ConditionNode extends Node<ConditionNodeProps> {
  /**
   * 构造函数
   * @param props ConditionNode属性
   */
  constructor(props: ConditionNodeProps) {
    super(props);
  }

  /**
   * 创建 ConditionNode 实例
   * @param id 节点ID
   * @param conditionFunctionId 条件函数ID
   * @param conditionConfig 条件配置
   * @param name 节点名称
   * @param description 节点描述
   * @returns ConditionNode 实例
   */
  public static create(
    id: NodeId,
    conditionFunctionId: string,
    conditionConfig?: Record<string, any>,
    name?: string,
    description?: string
  ): ConditionNode {
    const props: ConditionNodeProps = {
      id,
      type: NodeType.condition(),
      name,
      description,
      properties: {
        conditionFunctionId,
        conditionConfig,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new ConditionNode(props);
  }

  /**
   * 从属性创建 ConditionNode 实例
   * @param props ConditionNode属性
   * @returns ConditionNode 实例
   */
  public static fromProps(props: ConditionNodeProps): ConditionNode {
    return new ConditionNode(props);
  }

  /**
   * 获取条件函数ID
   * @returns 条件函数ID
   */
  public get conditionFunctionId(): string {
    return this.getProperty('conditionFunctionId');
  }

  /**
   * 获取条件配置
   * @returns 条件配置
   */
  public get conditionConfig(): Record<string, any> | undefined {
    return this.getProperty('conditionConfig');
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: ConditionNodeProps): ConditionNode {
    return new ConditionNode(props);
  }
}