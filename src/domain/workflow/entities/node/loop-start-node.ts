import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * LoopStartNode 属性接口
 */
export interface LoopStartNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.loopStart()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly loopConditionFunctionId: string;
    readonly loopConditionConfig?: Record<string, any>;
    readonly maxIterations?: number;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * LoopStartNode 实体
 *
 * 循环开始节点，负责：
 * 1. 存储循环配置
 * 2. 定义循环条件
 *
 * 不负责：
 * - 循环控制（由 LoopStartStrategy 负责）
 */
export class LoopStartNode extends Node<LoopStartNodeProps> {
  /**
   * 构造函数
   * @param props LoopStartNode属性
   */
  constructor(props: LoopStartNodeProps) {
    super(props);
  }

  /**
   * 创建 LoopStartNode 实例
   * @param id 节点ID
   * @param loopConditionFunctionId 循环条件函数ID
   * @param loopConditionConfig 循环条件配置
   * @param maxIterations 最大迭代次数
   * @param name 节点名称
   * @param description 节点描述
   * @returns LoopStartNode 实例
   */
  public static create(
    id: NodeId,
    loopConditionFunctionId: string,
    loopConditionConfig?: Record<string, any>,
    maxIterations?: number,
    name?: string,
    description?: string
  ): LoopStartNode {
    const props: LoopStartNodeProps = {
      id,
      type: NodeType.loopStart(),
      name,
      description,
      properties: {
        loopConditionFunctionId,
        loopConditionConfig,
        maxIterations,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new LoopStartNode(props);
  }

  /**
   * 从属性创建 LoopStartNode 实例
   * @param props LoopStartNode属性
   * @returns LoopStartNode 实例
   */
  public static fromProps(props: LoopStartNodeProps): LoopStartNode {
    return new LoopStartNode(props);
  }

  /**
   * 获取循环条件函数ID
   * @returns 循环条件函数ID
   */
  public get loopConditionFunctionId(): string {
    return this.getProperty('loopConditionFunctionId');
  }

  /**
   * 获取循环条件配置
   * @returns 循环条件配置
   */
  public get loopConditionConfig(): Record<string, any> | undefined {
    return this.getProperty('loopConditionConfig');
  }

  /**
   * 获取最大迭代次数
   * @returns 最大迭代次数
   */
  public get maxIterations(): number {
    return this.getPropertyOrDefault('maxIterations', 100);
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: LoopStartNodeProps): LoopStartNode {
    return new LoopStartNode(props);
  }
}