import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * ContextProcessorNode 属性接口
 */
export interface ContextProcessorNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.contextProcessor()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly processorFunctionId: string;
    readonly processorConfig?: Record<string, any>;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * ContextProcessorNode 实体
 *
 * 上下文处理节点，负责：
 * 1. 存储处理器配置
 * 2. 定义处理器函数
 *
 * 不负责：
 * - 上下文处理（由 ContextProcessorStrategy 负责）
 */
export class ContextProcessorNode extends Node<ContextProcessorNodeProps> {
  /**
   * 构造函数
   * @param props ContextProcessorNode属性
   */
  constructor(props: ContextProcessorNodeProps) {
    super(props);
  }

  /**
   * 创建 ContextProcessorNode 实例
   * @param id 节点ID
   * @param processorFunctionId 处理器函数ID
   * @param processorConfig 处理器配置
   * @param name 节点名称
   * @param description 节点描述
   * @returns ContextProcessorNode 实例
   */
  public static create(
    id: NodeId,
    processorFunctionId: string,
    processorConfig?: Record<string, any>,
    name?: string,
    description?: string
  ): ContextProcessorNode {
    const props: ContextProcessorNodeProps = {
      id,
      type: NodeType.contextProcessor(),
      name,
      description,
      properties: {
        processorFunctionId,
        processorConfig,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new ContextProcessorNode(props);
  }

  /**
   * 从属性创建 ContextProcessorNode 实例
   * @param props ContextProcessorNode属性
   * @returns ContextProcessorNode 实例
   */
  public static fromProps(props: ContextProcessorNodeProps): ContextProcessorNode {
    return new ContextProcessorNode(props);
  }

  /**
   * 获取处理器函数ID
   * @returns 处理器函数ID
   */
  public get processorFunctionId(): string {
    return this.getProperty('processorFunctionId');
  }

  /**
   * 获取处理器配置
   * @returns 处理器配置
   */
  public get processorConfig(): Record<string, any> | undefined {
    return this.getProperty('processorConfig');
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: ContextProcessorNodeProps): ContextProcessorNode {
    return new ContextProcessorNode(props);
  }
}