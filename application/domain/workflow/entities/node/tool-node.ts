import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * ToolNode 属性接口
 */
export interface ToolNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.tool()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly toolId: string;
    readonly parameters: Record<string, any>;
    readonly timeout?: number;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * ToolNode 实体
 *
 * 工具调用节点，负责：
 * 1. 存储工具配置
 * 2. 定义工具参数
 *
 * 不负责：
 * - 工具调用（由 ToolNodeStrategy 负责）
 */
export class ToolNode extends Node<ToolNodeProps> {
  /**
   * 构造函数
   * @param props ToolNode属性
   */
  constructor(props: ToolNodeProps) {
    super(props);
  }

  /**
   * 创建 ToolNode 实例
   * @param id 节点ID
   * @param toolId 工具ID
   * @param parameters 工具参数
   * @param name 节点名称
   * @param description 节点描述
   * @param timeout 超时时间
   * @returns ToolNode 实例
   */
  public static create(
    id: NodeId,
    toolId: string,
    parameters: Record<string, any>,
    name?: string,
    description?: string,
    timeout?: number
  ): ToolNode {
    const props: ToolNodeProps = {
      id,
      type: NodeType.tool(),
      name,
      description,
      properties: {
        toolId,
        parameters,
        timeout,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new ToolNode(props);
  }

  /**
   * 从属性创建 ToolNode 实例
   * @param props ToolNode属性
   * @returns ToolNode 实例
   */
  public static fromProps(props: ToolNodeProps): ToolNode {
    return new ToolNode(props);
  }

  /**
   * 获取工具ID
   * @returns 工具ID
   */
  public get toolId(): string {
    return this.getProperty('toolId');
  }

  /**
   * 获取工具参数
   * @returns 工具参数
   */
  public get parameters(): Record<string, any> {
    return this.getProperty('parameters');
  }

  /**
   * 获取超时时间
   * @returns 超时时间
   */
  public get timeout(): number {
    return this.getPropertyOrDefault('timeout', 30000);
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: ToolNodeProps): ToolNode {
    return new ToolNode(props);
  }
}