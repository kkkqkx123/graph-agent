import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';

/**
 * Token使用统计接口
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptTokensCost?: number;
  completionTokensCost?: number;
  totalCost?: number;
  reasoningTokens?: number;
}

/**
 * LLM工具调用接口
 */
export interface LLMToolCall {
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
  message: {
    role: string;
    content: string;
    tool_calls?: LLMToolCall[];
    thoughts?: any;
  };
  finish_reason: string;
}

/**
 * LLM响应实体接口
 */
export interface LLMResponseProps {
  id: ID;
  requestId: ID;
  sessionId?: ID;
  threadId?: ID;
  workflowId?: ID;
  nodeId?: ID;
  model: string;
  choices: LLMChoice[];
  usage: TokenUsage;
  finishReason: string;
  duration: number; // 毫秒
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  isDeleted: boolean;
}

/**
 * LLM响应实体
 * 
 * 表示大语言模型的响应
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
      isDeleted: false
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
    return this.props.choices[0]?.message?.content || '';
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
  public getToolCalls(): LLMToolCall[] {
    const toolCalls: LLMToolCall[] = [];
    for (const choice of this.props.choices) {
      if (choice.message.tool_calls) {
        toolCalls.push(...choice.message.tool_calls);
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
   * 检查是否成功完成
   * @returns 是否成功完成
   */
  public isSuccessful(): boolean {
    return this.props.finishReason === 'stop';
  }

  /**
   * 检查是否因长度限制完成
   * @returns 是否因长度限制完成
   */
  public isLengthLimited(): boolean {
    return this.props.finishReason === 'length';
  }

  /**
   * 检查是否因内容过滤完成
   * @returns 是否因内容过滤完成
   */
  public isContentFiltered(): boolean {
    return this.props.finishReason === 'content_filter';
  }

  /**
   * 检查是否因工具调用完成
   * @returns 是否因工具调用完成
   */
  public isToolCall(): boolean {
    return this.props.finishReason === 'tool_calls';
  }

  /**
   * 更新选择列表
   * @param choices 新选择列表
   */
  public updateChoices(choices: LLMChoice[]): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除LLM响应的选择列表');
    }

    const newProps = {
      ...this.props,
      choices: [...choices],
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新Token使用统计
   * @param usage 新Token使用统计
   */
  public updateUsage(usage: TokenUsage): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除LLM响应的Token使用统计');
    }

    const newProps = {
      ...this.props,
      usage: { ...usage },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除LLM响应的元数据');
    }

    const newProps = {
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 设置元数据项
   * @param key 键
   * @param value 值
   */
  public setMetadata(key: string, value: unknown): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法设置已删除LLM响应的元数据');
    }

    const newMetadata = { ...this.props.metadata };
    newMetadata[key] = value;

    const newProps = {
      ...this.props,
      metadata: newMetadata,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除元数据项
   * @param key 键
   */
  public removeMetadata(key: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法移除已删除LLM响应的元数据');
    }

    const newMetadata = { ...this.props.metadata };
    delete newMetadata[key];

    const newProps = {
      ...this.props,
      metadata: newMetadata,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
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
  public markAsDeleted(): void {
    if (this.props.isDeleted) {
      return;
    }

    const newProps = {
      ...this.props,
      isDeleted: true,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 检查LLM响应是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `llm-response:${this.props.id.toString()}`;
  }

  /**
   * 验证LLM响应的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('LLM响应ID不能为空');
    }

    if (!this.props.requestId) {
      throw new DomainError('LLM请求ID不能为空');
    }

    if (!this.props.model || this.props.model.trim().length === 0) {
      throw new DomainError('模型名称不能为空');
    }

    if (!this.props.choices || this.props.choices.length === 0) {
      throw new DomainError('选择列表不能为空');
    }

    if (!this.props.usage) {
      throw new DomainError('Token使用统计不能为空');
    }

    if (!this.props.finishReason || this.props.finishReason.trim().length === 0) {
      throw new DomainError('完成原因不能为空');
    }

    if (this.props.duration < 0) {
      throw new DomainError('响应时间不能为负数');
    }

    // 验证Token使用统计
    if (this.props.usage.promptTokens < 0) {
      throw new DomainError('提示Token数不能为负数');
    }

    if (this.props.usage.completionTokens < 0) {
      throw new DomainError('完成Token数不能为负数');
    }

    if (this.props.usage.totalTokens < 0) {
      throw new DomainError('总Token数不能为负数');
    }

    if (this.props.usage.totalTokens !== this.props.usage.promptTokens + this.props.usage.completionTokens) {
      throw new DomainError('总Token数必须等于提示Token数加完成Token数');
    }

    // 验证成本数据
    if (this.props.usage.promptTokensCost !== undefined && this.props.usage.promptTokensCost < 0) {
      throw new DomainError('提示Token成本不能为负数');
    }

    if (this.props.usage.completionTokensCost !== undefined && this.props.usage.completionTokensCost < 0) {
      throw new DomainError('完成Token成本不能为负数');
    }

    if (this.props.usage.totalCost !== undefined && this.props.usage.totalCost < 0) {
      throw new DomainError('总成本不能为负数');
    }
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    this.validateInvariants();
  }
}