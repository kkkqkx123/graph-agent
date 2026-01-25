import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * SubWorkflowNode 属性接口
 */
export interface SubWorkflowNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.subWorkflow()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly subWorkflowId: string;
    readonly inputMapping?: Record<string, string>;
    readonly outputMapping?: Record<string, string>;
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * SubWorkflowNode 实体
 *
 * 子工作流节点，负责：
 * 1. 存储子工作流配置
 * 2. 定义输入输出映射
 *
 * 不负责：
 * - 子工作流调用（由 SubWorkflowStrategy 负责）
 */
export class SubWorkflowNode extends Node<SubWorkflowNodeProps> {
  /**
   * 构造函数
   * @param props SubWorkflowNode属性
   */
  constructor(props: SubWorkflowNodeProps) {
    super(props);
  }

  /**
   * 创建 SubWorkflowNode 实例
   * @param id 节点ID
   * @param subWorkflowId 子工作流ID
   * @param inputMapping 输入映射
   * @param outputMapping 输出映射
   * @param name 节点名称
   * @param description 节点描述
   * @returns SubWorkflowNode 实例
   */
  public static create(
    id: NodeId,
    subWorkflowId: string,
    inputMapping?: Record<string, string>,
    outputMapping?: Record<string, string>,
    name?: string,
    description?: string
  ): SubWorkflowNode {
    const props: SubWorkflowNodeProps = {
      id,
      type: NodeType.subworkflow(),
      name,
      description,
      properties: {
        subWorkflowId,
        inputMapping,
        outputMapping,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new SubWorkflowNode(props);
  }

  /**
   * 从属性创建 SubWorkflowNode 实例
   * @param props SubWorkflowNode属性
   * @returns SubWorkflowNode 实例
   */
  public static fromProps(props: SubWorkflowNodeProps): SubWorkflowNode {
    return new SubWorkflowNode(props);
  }

  /**
   * 获取子工作流ID
   * @returns 子工作流ID
   */
  public get subWorkflowId(): string {
    return this.getProperty('subWorkflowId');
  }

  /**
   * 获取输入映射
   * @returns 输入映射
   */
  public get inputMapping(): Record<string, string> | undefined {
    return this.getProperty('inputMapping');
  }

  /**
   * 获取输出映射
   * @returns 输出映射
   */
  public get outputMapping(): Record<string, string> | undefined {
    return this.getProperty('outputMapping');
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: SubWorkflowNodeProps): SubWorkflowNode {
    return new SubWorkflowNode(props);
  }
}