import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { LLMMessage } from '../value-objects/llm-message';
import { DeletionStatus } from '../../checkpoint/value-objects/deletion-status';

/**
 * Token使用统计接口
 *
 * 说明：
 * - promptTokens: 输入token总数（包含所有输入相关的token，如缓存token、音频token等）
 * - completionTokens: 输出token总数（包含所有输出相关的token，包括reasoningTokens）
 * - reasoningTokens: 推理token数（单独统计，已包含在completionTokens中）
 * - metadata: 保留原始API响应的详细信息，用于调试和审计
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptTokensCost?: number;
  completionTokensCost?: number;
  totalCost?: number;
  reasoningTokens?: number;
  metadata?: Record<string, unknown>;
}

/**
 * LLM响应工具调用接口
 */
export interface LLMResponseToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * LLM选择接口
 */
export interface LLMChoice {
  index: number;
  message: LLMMessage;
  finish_reason: string;
}

/**
 * LLM响应实体接口
 */
export interface LLMResponseProps {
  readonly id: ID;
  readonly requestId: ID;
  readonly sessionId?: ID;
  readonly threadId?: ID;
  readonly workflowId?: ID;
  readonly nodeId?: ID;
  readonly model: string;
  readonly choices: LLMChoice[];
  readonly usage: TokenUsage;
  readonly finishReason: string;
  readonly duration: number; // 毫秒
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly deletionStatus: DeletionStatus;
}

/**
 * LLM响应实体
 *
 * 表示大语言模型的响应
 * 职责：
 * - 响应基本信息管理
 * - 选择列表管理
 * - Token使用统计管理
 * - 属性访问
 *
 * 不负责：
 * - 复杂的验证逻辑（由LLMResponseValidationService负责）
 * - 业务逻辑判断（由LLMResponseService负责）
 */
export class LLMResponse extends Entity {
  private readonly props: LLMResponseProps;

  /**
   * 构造函数
   * @param props LLM响应属性
   */
  private constructor(props: LLMResponseProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新LLM响应
   * @param requestId 请求ID
   * @param model 模型名称
   * @param choices 选择列表
   * @param usage Token使用统计
   * @param finishReason 完成原因
   * @param duration 响应时间（毫秒）
   * @param options 响应选项
   * @returns 新LLM响应实例
   */
  public static create(
    requestId: ID,
    model: string,
    choices: LLMChoice[],
    usage: TokenUsage,
    finishReason: string,
    duration: number,
    options?: {
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      nodeId?: ID;
      metadata?: Record<string, unknown>;
    }
  ): LLMResponse {
    const now = Timestamp.now();
    const responseId = ID.generate();

    const props: LLMResponseProps = {
      id: responseId,
      requestId,
      sessionId: options?.sessionId,
      threadId: options?.threadId,
      workflowId: options?.workflowId,
      nodeId: options?.nodeId,
      model,
      choices: [...choices],
      usage: { ...usage },
      finishReason,
      duration,
      metadata: options?.metadata || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      deletionStatus: DeletionStatus.active()
    };

    return new LLMResponse(props);
  }

  /**
   * 从已有属性重建LLM响应
   * @param props LLM响应属性
   * @returns LLM响应实例
   */
  public static fromProps(props: LLMResponseProps): LLMResponse {
    return new LLMResponse(props);
  }

  /**
   * 获取响应ID
   * @returns 响应ID
   */
  public get responseId(): ID {
    return this.props.id;
  }

  /**
   * 获取请求ID
   * @returns 请求ID
   */
  public get requestId(): ID {
    return this.props.requestId;
  }

  /**
   * 获取会话ID
   * @returns 会话ID
   */
  public get sessionId(): ID | undefined {
    return this.props.sessionId;
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public get threadId(): ID | undefined {
    return this.props.threadId;
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID | undefined {
    return this.props.workflowId;
  }

  /**
   * 获取节点ID
   * @returns 节点ID
   */
  public get nodeId(): ID | undefined {
    return this.props.nodeId;
  }

  /**
   * 获取模型名称
   * @returns 模型名称
   */
  public get model(): string {
    return this.props.model;
  }

  /**
   * 获取选择列表
   * @returns 选择列表
   */
  public get choices(): LLMChoice[] {
    return [...this.props.choices];
  }

  /**
   * 获取Token使用统计
   * @returns Token使用统计
   */
  public get usage(): TokenUsage {
    return { ...this.props.usage };
  }

  /**
   * 获取完成原因
   * @returns 完成原因
   */
  public get finishReason(): string {
    return this.props.finishReason;
  }

  /**
   * 获取响应时间
   * @returns 响应时间（毫秒）
   */
  public get duration(): number {
    return this.props.duration;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取主要内容
   * @returns 主要内容
   */
  public getContent(): string {
    if (this.props.choices.length === 0) {
      return '';
    }
    return this.props.choices[0]?.message.getContent() || '';
  }

  /**
   * 获取第一个选择
   * @returns 第一个选择或undefined
   */
  public getFirstChoice(): LLMChoice | undefined {
    return this.props.choices.length > 0 ? this.props.choices[0] : undefined;
  }

  /**
   * 获取最后一个选择
   * @returns 最后一个选择或undefined
   */
  public getLastChoice(): LLMChoice | undefined {
    return this.props.choices.length > 0 ? this.props.choices[this.props.choices.length - 1] : undefined;
  }

  /**
   * 获取选择数量
   * @returns 选择数量
   */
  public getChoiceCount(): number {
    return this.props.choices.length;
  }

  /**
   * 获取总Token数
   * @returns 总Token数
   */
  public getTotalTokens(): number {
    return this.props.usage.totalTokens;
  }

  /**
   * 获取提示Token数
   * @returns 提示Token数
   */
  public getPromptTokens(): number {
    return this.props.usage.promptTokens;
  }

  /**
   * 获取完成Token数
   * @returns 完成Token数
   */
  public getCompletionTokens(): number {
    return this.props.usage.completionTokens;
  }

  /**
   * 获取总成本
   * @returns 总成本
   */
  public getTotalCost(): number {
    return this.props.usage.totalCost || 0;
  }

  /**
   * 获取提示成本
   * @returns 提示成本
   */
  public getPromptCost(): number {
    return this.props.usage.promptTokensCost || 0;
  }

  /**
   * 获取完成成本
   * @returns 完成成本
   */
  public getCompletionCost(): number {
    return this.props.usage.completionTokensCost || 0;
  }

  /**
   * 获取工具调用
   * @returns 工具调用列表
   */
  public getToolCalls(): LLMResponseToolCall[] {
    const toolCalls: LLMResponseToolCall[] = [];
    for (const choice of this.props.choices) {
      if (choice.message.hasToolCalls()) {
        toolCalls.push(...choice.message.getToolCalls() || []);
      }
    }
    return toolCalls;
  }

  /**
   * 检查是否有工具调用
   * @returns 是否有工具调用
   */
  public hasToolCalls(): boolean {
    return this.getToolCalls().length > 0;
  }

  /**
   * 获取工具调用数量
   * @returns 工具调用数量
   */
  public getToolCallCount(): number {
    return this.getToolCalls().length;
  }

  /**
   * 更新选择列表
   * @param choices 新选择列表
   */
  public updateChoices(choices: LLMChoice[]): LLMResponse {
    this.props.deletionStatus.ensureActive();

    const newProps: LLMResponseProps = {
      ...this.props,
      choices: [...choices],
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new LLMResponse(newProps);
  }

  /**
   * 更新Token使用统计
   * @param usage 新Token使用统计
   */
  public updateUsage(usage: TokenUsage): LLMResponse {
    this.props.deletionStatus.ensureActive();

    const newProps: LLMResponseProps = {
      ...this.props,
      usage: { ...usage },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new LLMResponse(newProps);
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): LLMResponse {
    this.props.deletionStatus.ensureActive();

    const newProps: LLMResponseProps = {
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new LLMResponse(newProps);
  }

  /**
   * 设置元数据项
   * @param key 键
   * @param value 值
   */
  public setMetadata(key: string, value: unknown): LLMResponse {
    this.props.deletionStatus.ensureActive();

    const newMetadata = { ...this.props.metadata };
    newMetadata[key] = value;

    const newProps: LLMResponseProps = {
      ...this.props,
      metadata: newMetadata,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new LLMResponse(newProps);
  }

  /**
   * 移除元数据项
   * @param key 键
   */
  public removeMetadata(key: string): LLMResponse {
    this.props.deletionStatus.ensureActive();

    const newMetadata = { ...this.props.metadata };
    delete newMetadata[key];

    const newProps: LLMResponseProps = {
      ...this.props,
      metadata: newMetadata,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new LLMResponse(newProps);
  }

  /**
   * 检查是否有指定的元数据
   * @param key 键
   * @returns 是否有元数据
   */
  public hasMetadata(key: string): boolean {
    return key in this.props.metadata;
  }

  /**
   * 获取元数据值
   * @param key 键
   * @returns 值
   */
  public getMetadataValue(key: string): unknown {
    return this.props.metadata[key];
  }

  /**
   * 标记LLM响应为已删除
   */
  public markAsDeleted(): LLMResponse {
    if (this.props.deletionStatus.isDeleted()) {
      return this;
    }

    const newProps: LLMResponseProps = {
      ...this.props,
      deletionStatus: this.props.deletionStatus.markAsDeleted(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new LLMResponse(newProps);
  }

  /**
   * 检查LLM响应是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.deletionStatus.isDeleted();
  }

  /**
   * 检查LLM响应是否活跃
   * @returns 是否活跃
   */
  public isActive(): boolean {
    return this.props.deletionStatus.isActive();
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `llm-response:${this.props.id.toString()}`;
  }

  /**
   * 获取LLM响应属性（用于持久化）
   * @returns LLM响应属性
   */
  public toProps(): LLMResponseProps {
    return this.props;
  }

}