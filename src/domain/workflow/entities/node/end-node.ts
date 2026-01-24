import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';
import { Timestamp, Version } from '../../../common/value-objects';

/**
 * EndNode 属性接口
 */
export interface EndNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.end()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly outputSchema?: Record<string, any>;
    readonly finalActions?: Array<{
      readonly type: string;
      readonly config?: Record<string, any>;
    }>;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * EndNode 实体
 *
 * 工作流结束节点，负责：
 * 1. 标记工作流结束
 * 2. 定义输出模式
 * 3. 定义最终动作
 *
 * 不负责：
 * - 节点执行（由 EndNodeStrategy 负责）
 */
export class EndNode extends Node<EndNodeProps> {
  /**
   * 构造函数
   * @param props EndNode属性
   */
  constructor(props: EndNodeProps) {
    super(props);
  }

  /**
   * 创建 EndNode 实例
   * @param id 节点ID
   * @param name 节点名称
   * @param description 节点描述
   * @param outputSchema 输出模式
   * @param finalActions 最终动作
   * @returns EndNode 实例
   */
  public static create(
    id: NodeId,
    name?: string,
    description?: string,
    outputSchema?: Record<string, any>,
    finalActions?: Array<{
      readonly type: string;
      readonly config?: Record<string, any>;
    }>
  ): EndNode {
    const props: EndNodeProps = {
      id,
      type: NodeType.end(),
      name,
      description,
      properties: {
        outputSchema,
        finalActions,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new EndNode(props);
  }

  /**
   * 从属性创建 EndNode 实例
   * @param props EndNode属性
   * @returns EndNode 实例
   */
  public static fromProps(props: EndNodeProps): EndNode {
    return new EndNode(props);
  }

  /**
   * 获取输出模式
   * @returns 输出模式
   */
  public get outputSchema(): Record<string, any> | undefined {
    return this.getProperty('outputSchema');
  }

  /**
   * 获取最终动作
   * @returns 最终动作
   */
  public get finalActions(): Array<{
    readonly type: string;
    readonly config?: Record<string, any>;
  }> {
    return this.getPropertyOrDefault('finalActions', []);
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: EndNodeProps): EndNode {
    return new EndNode(props);
  }
}