import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * LoopEndNode 属性接口
 */
export interface LoopEndNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.loopEnd()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly loopStartNodeId: string;
    readonly breakConditionFunctionId?: string;
    readonly breakConditionConfig?: Record<string, any>;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * LoopEndNode 实体
 *
 * 循环结束节点，负责：
 * 1. 存储循环结束配置
 * 2. 定义循环开始节点引用
 * 3. 定义中断条件
 *
 * 不负责：
 * - 循环控制（由 LoopEndStrategy 负责）
 */
export class LoopEndNode extends Node<LoopEndNodeProps> {
  /**
   * 构造函数
   * @param props LoopEndNode属性
   */
  constructor(props: LoopEndNodeProps) {
    super(props);
  }

  /**
   * 创建 LoopEndNode 实例
   * @param id 节点ID
   * @param loopStartNodeId 循环开始节点ID
   * @param breakConditionFunctionId 中断条件函数ID
   * @param breakConditionConfig 中断条件配置
   * @param name 节点名称
   * @param description 节点描述
   * @returns LoopEndNode 实例
   */
  public static create(
    id: NodeId,
    loopStartNodeId: string,
    breakConditionFunctionId?: string,
    breakConditionConfig?: Record<string, any>,
    name?: string,
    description?: string
  ): LoopEndNode {
    const props: LoopEndNodeProps = {
      id,
      type: NodeType.loopEnd(),
      name,
      description,
      properties: {
        loopStartNodeId,
        breakConditionFunctionId,
        breakConditionConfig,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new LoopEndNode(props);
  }

  /**
   * 从属性创建 LoopEndNode 实例
   * @param props LoopEndNode属性
   * @returns LoopEndNode 实例
   */
  public static fromProps(props: LoopEndNodeProps): LoopEndNode {
    return new LoopEndNode(props);
  }

  /**
   * 获取循环开始节点ID
   * @returns 循环开始节点ID
   */
  public get loopStartNodeId(): string {
    return this.getProperty('loopStartNodeId');
  }

  /**
   * 获取中断条件函数ID
   * @returns 中断条件函数ID
   */
  public get breakConditionFunctionId(): string | undefined {
    return this.getProperty('breakConditionFunctionId');
  }

  /**
   * 获取中断条件配置
   * @returns 中断条件配置
   */
  public get breakConditionConfig(): Record<string, any> | undefined {
    return this.getProperty('breakConditionConfig');
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: LoopEndNodeProps): LoopEndNode {
    return new LoopEndNode(props);
  }
}