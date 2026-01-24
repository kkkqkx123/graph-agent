import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * UserInteractionNode 属性接口
 */
export interface UserInteractionNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.userInteraction()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly interactionType: 'input' | 'confirmation' | 'selection';
    readonly prompt: string;
    readonly options?: string[];
    readonly timeout?: number;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * UserInteractionNode 实体
 *
 * 用户交互节点，负责：
 * 1. 存储交互配置
 * 2. 定义交互类型和提示
 *
 * 不负责：
 * - 用户交互（由 UserInteractionStrategy 负责）
 */
export class UserInteractionNode extends Node<UserInteractionNodeProps> {
  /**
   * 构造函数
   * @param props UserInteractionNode属性
   */
  constructor(props: UserInteractionNodeProps) {
    super(props);
  }

  /**
   * 创建 UserInteractionNode 实例
   * @param id 节点ID
   * @param interactionType 交互类型
   * @param prompt 提示信息
   * @param options 选项（仅用于 selection 类型）
   * @param timeout 超时时间
   * @param name 节点名称
   * @param description 节点描述
   * @returns UserInteractionNode 实例
   */
  public static create(
    id: NodeId,
    interactionType: 'input' | 'confirmation' | 'selection',
    prompt: string,
    options?: string[],
    timeout?: number,
    name?: string,
    description?: string
  ): UserInteractionNode {
    const props: UserInteractionNodeProps = {
      id,
      type: NodeType.userInteraction(),
      name,
      description,
      properties: {
        interactionType,
        prompt,
        options,
        timeout,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new UserInteractionNode(props);
  }

  /**
   * 从属性创建 UserInteractionNode 实例
   * @param props UserInteractionNode属性
   * @returns UserInteractionNode 实例
   */
  public static fromProps(props: UserInteractionNodeProps): UserInteractionNode {
    return new UserInteractionNode(props);
  }

  /**
   * 获取交互类型
   * @returns 交互类型
   */
  public get interactionType(): 'input' | 'confirmation' | 'selection' {
    return this.getProperty('interactionType');
  }

  /**
   * 获取提示信息
   * @returns 提示信息
   */
  public get prompt(): string {
    return this.getProperty('prompt');
  }

  /**
   * 获取选项
   * @returns 选项
   */
  public get options(): string[] | undefined {
    return this.getProperty('options');
  }

  /**
   * 获取超时时间
   * @returns 超时时间
   */
  public get timeout(): number {
    return this.getPropertyOrDefault('timeout', 300000); // 默认5分钟
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: UserInteractionNodeProps): UserInteractionNode {
    return new UserInteractionNode(props);
  }
}