import { Node } from '../node';
import { NodeType } from '../../value-objects/node/node-type';
import { NodeId } from '../../value-objects/node/node-id';
import { NodeStatus } from '../../value-objects/node/node-status';
import { NodeRetryStrategy } from '../../value-objects/node/node-retry-strategy';

/**
 * LLMNode 属性接口
 */
export interface LLMNodeProps {
  readonly id: NodeId;
  readonly type: NodeType;  // 固定为 NodeType.llm()
  readonly name?: string;
  readonly description?: string;
  readonly properties: {
    readonly model: string;
    readonly prompt: string;
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly topP?: number;
    readonly frequencyPenalty?: number;
    readonly presencePenalty?: number;
    readonly stopSequences?: string[];
  };
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * LLMNode 实体
 *
 * LLM 调用节点，负责：
 * 1. 存储 LLM 配置
 * 2. 定义 LLM 参数
 *
 * 不负责：
 * - LLM 调用（由 LLMNodeStrategy 负责）
 */
export class LLMNode extends Node<LLMNodeProps> {
  /**
   * 构造函数
   * @param props LLMNode属性
   */
  constructor(props: LLMNodeProps) {
    super(props);
  }

  /**
   * 创建 LLMNode 实例
   * @param id 节点ID
   * @param model 模型名称
   * @param prompt 提示词
   * @param name 节点名称
   * @param description 节点描述
   * @param temperature 温度参数
   * @param maxTokens 最大token数
   * @param topP topP参数
   * @param frequencyPenalty 频率惩罚
   * @param presencePenalty 存在惩罚
   * @param stopSequences 停止序列
   * @returns LLMNode 实例
   */
  public static create(
    id: NodeId,
    model: string,
    prompt: string,
    name?: string,
    description?: string,
    temperature?: number,
    maxTokens?: number,
    topP?: number,
    frequencyPenalty?: number,
    presencePenalty?: number,
    stopSequences?: string[]
  ): LLMNode {
    const props: LLMNodeProps = {
      id,
      type: NodeType.llm(),
      name,
      description,
      properties: {
        model,
        prompt,
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        stopSequences,
      },
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
    };
    return new LLMNode(props);
  }

  /**
   * 从属性创建 LLMNode 实例
   * @param props LLMNode属性
   * @returns LLMNode 实例
   */
  public static fromProps(props: LLMNodeProps): LLMNode {
    return new LLMNode(props);
  }

  /**
   * 获取模型名称
   * @returns 模型名称
   */
  public get model(): string {
    return this.getProperty('model');
  }

  /**
   * 获取提示词
   * @returns 提示词
   */
  public get prompt(): string {
    return this.getProperty('prompt');
  }

  /**
   * 获取温度参数
   * @returns 温度参数
   */
  public get temperature(): number {
    return this.getPropertyOrDefault('temperature', 0.7);
  }

  /**
   * 获取最大token数
   * @returns 最大token数
   */
  public get maxTokens(): number {
    return this.getPropertyOrDefault('maxTokens', 1000);
  }

  /**
   * 获取topP参数
   * @returns topP参数
   */
  public get topP(): number {
    return this.getPropertyOrDefault('topP', 1.0);
  }

  /**
   * 获取频率惩罚
   * @returns 频率惩罚
   */
  public get frequencyPenalty(): number {
    return this.getPropertyOrDefault('frequencyPenalty', 0.0);
  }

  /**
   * 获取存在惩罚
   * @returns 存在惩罚
   */
  public get presencePenalty(): number {
    return this.getPropertyOrDefault('presencePenalty', 0.0);
  }

  /**
   * 获取停止序列
   * @returns 停止序列
   */
  public get stopSequences(): string[] {
    return this.getPropertyOrDefault('stopSequences', []);
  }

  /**
   * 从属性创建 Node 实例
   * @param props Node属性
   * @returns Node 实例
   */
  protected createNodeFromProps(props: LLMNodeProps): LLMNode {
    return new LLMNode(props);
  }
}