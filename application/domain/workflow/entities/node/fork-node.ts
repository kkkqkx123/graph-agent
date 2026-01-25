import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * ForkNode 属性接口
 */
export interface ForkNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.fork()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly branchCount: number;
    readonly parallel?: boolean;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * ForkNode 实体
 *
 * 并行分支开始节点，负责：
 * 1. 存储分支配置
 * 2. 定义分支数量
 *
 * 不负责：
 * - 分支创建（由 ForkNodeStrategy 负责）
 */
export class ForkNode extends Node<ForkNodeProps> {
  /**
   * 构造函数
   * @param props ForkNode属性
   */
  constructor(props: ForkNodeProps) {
    super(props);
  }

  /**
   * 创建 ForkNode 实例
   * @param id 节点ID
   * @param branchCount 分支数量
   * @param parallel 是否并行执行
   * @param name 节点名称
   * @param description 节点描述
   * @returns ForkNode 实例
   */
  public static create(
    id: NodeId,
    branchCount: number,
    parallel = true,
    name?: string,
    description?: string
  ): ForkNode {
    const props: ForkNodeProps = {
      id,
      type: NodeType.fork(),
      name,
      description,
      properties: {
        branchCount,
        parallel,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new ForkNode(props);
  }

  /**
   * 从属性创建 ForkNode 实例
   * @param props ForkNode属性
   * @returns ForkNode 实例
   */
  public static fromProps(props: ForkNodeProps): ForkNode {
    return new ForkNode(props);
  }

  /**
   * 获取分支数量
   * @returns 分支数量
   */
  public get branchCount(): number {
    return this.getProperty('branchCount');
  }

  /**
   * 检查是否并行执行
   * @returns 是否并行执行
   */
  public get parallel(): boolean {
    return this.getPropertyOrDefault('parallel', true);
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: ForkNodeProps): ForkNode {
    return new ForkNode(props);
  }
}