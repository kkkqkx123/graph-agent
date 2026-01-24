import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';
import { Timestamp, Version } from '../../../common/value-objects';

/**
 * StartNode 属性接口
 */
export interface StartNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.start()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly initialVariables?: Record<string, any>;
    readonly inputSchema?: Record<string, any>;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * StartNode 实体
 *
 * 工作流开始节点，负责：
 * 1. 标记工作流开始
 * 2. 提供初始变量
 * 3. 定义输入模式
 *
 * 不负责：
 * - 节点执行（由 StartNodeStrategy 负责）
 */
export class StartNode extends Node<StartNodeProps> {
  /**
   * 构造函数
   * @param props StartNode属性
   */
  constructor(props: StartNodeProps) {
    super(props);
  }

  /**
   * 创建 StartNode 实例
   * @param id 节点ID
   * @param name 节点名称
   * @param description 节点描述
   * @param initialVariables 初始变量
   * @param inputSchema 输入模式
   * @returns StartNode 实例
   */
  public static create(
    id: NodeId,
    name?: string,
    description?: string,
    initialVariables?: Record<string, any>,
    inputSchema?: Record<string, any>
  ): StartNode {
    const props: StartNodeProps = {
      id,
      type: NodeType.start(),
      name,
      description,
      properties: {
        initialVariables,
        inputSchema,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new StartNode(props);
  }

  /**
   * 从属性创建 StartNode 实例
   * @param props StartNode属性
   * @returns StartNode 实例
   */
  public static fromProps(props: StartNodeProps): StartNode {
    return new StartNode(props);
  }

  /**
   * 获取初始变量
   * @returns 初始变量
   */
  public get initialVariables(): Record<string, any> {
    return this.getPropertyOrDefault('initialVariables', {});
  }

  /**
   * 获取输入模式
   * @returns 输入模式
   */
  public get inputSchema(): Record<string, any> | undefined {
    return this.getProperty('inputSchema');
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: StartNodeProps): StartNode {
    return new StartNode(props);
  }
}