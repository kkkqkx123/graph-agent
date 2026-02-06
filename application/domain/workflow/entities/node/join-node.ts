import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * JoinNode 属性接口
 */
export interface JoinNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.join()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly branchCount: number;
    readonly mergeStrategy?: 'all' | 'any' | 'first';
    /** 等待超时时间（秒）。0表示不超时，>0表示超时秒数。默认0 */
    readonly timeout?: number;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * JoinNode 实体
 *
 * 并行分支合并节点，负责：
 * 1. 存储合并配置
 * 2. 定义合并策略
 *
 * 不负责：
 * - 分支合并（由 JoinNodeStrategy 负责）
 */
export class JoinNode extends Node<JoinNodeProps> {
  /**
   * 构造函数
   * @param props JoinNode属性
   */
  constructor(props: JoinNodeProps) {
    super(props);
  }

  /**
   * 创建 JoinNode 实例
   * @param id 节点ID
   * @param branchCount 分支数量
   * @param mergeStrategy 合并策略
   * @param timeout 超时时间（秒），0表示不超时
   * @param name 节点名称
   * @param description 节点描述
   * @returns JoinNode 实例
   */
  public static create(
    id: NodeId,
    branchCount: number,
    mergeStrategy: 'all' | 'any' | 'first' = 'all',
    timeout: number = 0,
    name?: string,
    description?: string
  ): JoinNode {
    const props: JoinNodeProps = {
      id,
      type: NodeType.join(),
      name,
      description,
      properties: {
        branchCount,
        mergeStrategy,
        timeout,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new JoinNode(props);
  }

  /**
   * 从属性创建 JoinNode 实例
   * @param props JoinNode属性
   * @returns JoinNode 实例
   */
  public static fromProps(props: JoinNodeProps): JoinNode {
    return new JoinNode(props);
  }

  /**
   * 获取分支数量
   * @returns 分支数量
   */
  public get branchCount(): number {
    return this.getProperty('branchCount');
  }

  /**
   * 获取合并策略
   * @returns 合并策略
   */
  public get mergeStrategy(): 'all' | 'any' | 'first' {
    return this.getPropertyOrDefault('mergeStrategy', 'all');
  }

  /**
   * 获取超时时间
   * @returns 超时时间（秒），0表示不超时
   */
  public get timeout(): number {
    return this.getPropertyOrDefault('timeout', 0);
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: JoinNodeProps): JoinNode {
    return new JoinNode(props);
  }
}