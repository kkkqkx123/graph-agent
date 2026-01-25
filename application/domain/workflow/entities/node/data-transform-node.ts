import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * DataTransformNode 属性接口
 */
export interface DataTransformNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.dataTransform()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly transformFunctionId: string;
    readonly transformConfig?: Record<string, any>;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * DataTransformNode 实体
 *
 * 数据转换节点，负责：
 * 1. 存储转换配置
 * 2. 定义转换函数
 *
 * 不负责：
 * - 数据转换（由 DataTransformStrategy 负责）
 */
export class DataTransformNode extends Node<DataTransformNodeProps> {
  /**
   * 构造函数
   * @param props DataTransformNode属性
   */
  constructor(props: DataTransformNodeProps) {
    super(props);
  }

  /**
   * 创建 DataTransformNode 实例
   * @param id 节点ID
   * @param transformFunctionId 转换函数ID
   * @param transformConfig 转换配置
   * @param name 节点名称
   * @param description 节点描述
   * @returns DataTransformNode 实例
   */
  public static create(
    id: NodeId,
    transformFunctionId: string,
    transformConfig?: Record<string, any>,
    name?: string,
    description?: string
  ): DataTransformNode {
    const props: DataTransformNodeProps = {
      id,
      type: NodeType.dataTransform(),
      name,
      description,
      properties: {
        transformFunctionId,
        transformConfig,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new DataTransformNode(props);
  }

  /**
   * 从属性创建 DataTransformNode 实例
   * @param props DataTransformNode属性
   * @returns DataTransformNode 实例
   */
  public static fromProps(props: DataTransformNodeProps): DataTransformNode {
    return new DataTransformNode(props);
  }

  /**
   * 获取转换函数ID
   * @returns 转换函数ID
   */
  public get transformFunctionId(): string {
    return this.getProperty('transformFunctionId');
  }

  /**
   * 获取转换配置
   * @returns 转换配置
   */
  public get transformConfig(): Record<string, any> | undefined {
    return this.getProperty('transformConfig');
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: DataTransformNodeProps): DataTransformNode {
    return new DataTransformNode(props);
  }
}