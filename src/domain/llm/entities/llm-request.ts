import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';

/**
 * LLM消息接口
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

/**
 * LLM请求实体接口
 */
export interface LLMRequestProps {
  id: ID;
  sessionId?: ID;
  threadId?: ID;
  workflowId?: ID;
  nodeId?: ID;
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  toolChoice?: 'none' | 'auto' | 'required' | { type: string; function: { name: string } };
  stream?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
  verbosity?: 'concise' | 'normal' | 'detailed';
  previousResponseId?: string;
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  isDeleted: boolean;
}

/**
 * LLM请求实体
 * 
 * 表示对大语言模型的请求
 */
export class LLMRequest extends Entity {
  private readonly props: LLMRequestProps;

  /**
   * 构造函数
   * @param props LLM请求属性
   */
  private constructor(props: LLMRequestProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新LLM请求
   * @param model 模型名称
   * @param messages 消息列表
   * @param options 请求选项
   * @returns 新LLM请求实例
   */
  public static create(
    model: string,
    messages: LLMMessage[],
    options?: {
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      nodeId?: ID;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
      tools?: Array<{
        type: string;
        function: {
          name: string;
          description?: string;
          parameters?: Record<string, unknown>;
        };
      }>;
      toolChoice?: 'none' | 'auto' | 'required' | { type: string; function: { name: string } };
      stream?: boolean;
      reasoningEffort?: 'low' | 'medium' | 'high';
      verbosity?: 'concise' | 'normal' | 'detailed';
      previousResponseId?: string;
      metadata?: Record<string, unknown>;
    }
  ): LLMRequest {
    const now = Timestamp.now();
    const requestId = ID.generate();

    const props: LLMRequestProps = {
      id: requestId,
      sessionId: options?.sessionId,
      threadId: options?.threadId,
      workflowId: options?.workflowId,
      nodeId: options?.nodeId,
      model,
      messages: [...messages],
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 1000,
      topP: options?.topP ?? 1.0,
      frequencyPenalty: options?.frequencyPenalty ?? 0.0,
      presencePenalty: options?.presencePenalty ?? 0.0,
      stop: options?.stop,
      tools: options?.tools,
      toolChoice: options?.toolChoice,
      stream: options?.stream ?? false,
      reasoningEffort: options?.reasoningEffort,
      verbosity: options?.verbosity,
      previousResponseId: options?.previousResponseId,
      metadata: options?.metadata || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    return new LLMRequest(props);
  }

  /**
   * 从已有属性重建LLM请求
   * @param props LLM请求属性
   * @returns LLM请求实例
   */
  public static fromProps(props: LLMRequestProps): LLMRequest {
    return new LLMRequest(props);
  }

  /**
   * 获取请求ID
   * @returns 请求ID
   */
  public get requestId(): ID {
    return this.props.id;
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
   * 获取消息列表
   * @returns 消息列表
   */
  public get messages(): LLMMessage[] {
    return [...this.props.messages];
  }

  /**
   * 获取温度参数
   * @returns 温度参数
   */
  public get temperature(): number | undefined {
    return this.props.temperature;
  }

  /**
   * 获取最大token数
   * @returns 最大token数
   */
  public get maxTokens(): number | undefined {
    return this.props.maxTokens;
  }

  /**
   * 获取top_p参数
   * @returns top_p参数
   */
  public get topP(): number | undefined {
    return this.props.topP;
  }

  /**
   * 获取频率惩罚参数
   * @returns 频率惩罚参数
   */
  public get frequencyPenalty(): number | undefined {
    return this.props.frequencyPenalty;
  }

  /**
   * 获取存在惩罚参数
   * @returns 存在惩罚参数
   */
  public get presencePenalty(): number | undefined {
    return this.props.presencePenalty;
  }

  /**
   * 获取停止词列表
   * @returns 停止词列表
   */
  public get stop(): string[] | undefined {
    return this.props.stop;
  }

  /**
   * 获取工具列表
   * @returns 工具列表
   */
  public get tools(): Array<{
    type: string;
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }> | undefined {
    return this.props.tools;
  }

  /**
   * 获取工具选择参数
   * @returns 工具选择参数
   */
  public get toolChoice(): 'none' | 'auto' | 'required' | { type: string; function: { name: string } } | undefined {
    return this.props.toolChoice;
  }

  /**
   * 获取是否流式传输
   * @returns 是否流式传输
   */
  public get stream(): boolean | undefined {
    return this.props.stream;
  }

  /**
   * 获取推理努力程度
   * @returns 推理努力程度
   */
  public get reasoningEffort(): 'low' | 'medium' | 'high' | undefined {
    return this.props.reasoningEffort;
  }

  /**
   * 获取详细程度
   * @returns 详细程度
   */
  public get verbosity(): 'concise' | 'normal' | 'detailed' | undefined {
    return this.props.verbosity;
  }

  /**
   * 获取前一个响应ID
   * @returns 前一个响应ID
   */
  public get previousResponseId(): string | undefined {
    return this.props.previousResponseId;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 添加消息
   * @param message 消息
   */
  public addMessage(message: LLMMessage): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法为已删除的LLM请求添加消息');
    }

    const newMessages = [...this.props.messages, message];

    const newProps = {
      ...this.props,
      messages: newMessages,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新消息
   * @param index 消息索引
   * @param message 新消息
   */
  public updateMessage(index: number, message: LLMMessage): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除LLM请求的消息');
    }

    if (index < 0 || index >= this.props.messages.length) {
      throw new DomainError('消息索引超出范围');
    }

    const newMessages = [...this.props.messages];
    newMessages[index] = message;

    const newProps = {
      ...this.props,
      messages: newMessages,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除消息
   * @param index 消息索引
   */
  public removeMessage(index: number): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法移除已删除LLL请求的消息');
    }

    if (index < 0 || index >= this.props.messages.length) {
      throw new DomainError('消息索引超出范围');
    }

    const newMessages = [...this.props.messages];
    newMessages.splice(index, 1);

    const newProps = {
      ...this.props,
      messages: newMessages,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新参数
   * @param updates 参数更新
   */
  public updateParameters(updates: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
    tools?: Array<{
      type: string;
      function: {
        name: string;
        description?: string;
        parameters?: Record<string, unknown>;
      };
    }>;
    toolChoice?: 'none' | 'auto' | 'required' | { type: string; function: { name: string } };
    stream?: boolean;
  }): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除LLM请求的参数');
    }

    const newProps = {
      ...this.props,
      ...updates,
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
      throw new DomainError('无法更新已删除LLM请求的元数据');
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
      throw new DomainError('无法设置已删除LLM请求的元数据');
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
      throw new DomainError('无法移除已删除LLM请求的元数据');
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
   * 获取消息数量
   * @returns 消息数量
   */
  public getMessageCount(): number {
    return this.props.messages.length;
  }

  /**
   * 获取系统消息数量
   * @returns 系统消息数量
   */
  public getSystemMessageCount(): number {
    return this.props.messages.filter(msg => msg.role === 'system').length;
  }

  /**
   * 获取用户消息数量
   * @returns 用户消息数量
   */
  public getUserMessageCount(): number {
    return this.props.messages.filter(msg => msg.role === 'user').length;
  }

  /**
   * 获取助手消息数量
   * @returns 助手消息数量
   */
  public getAssistantMessageCount(): number {
    return this.props.messages.filter(msg => msg.role === 'assistant').length;
  }

  /**
   * 获取工具消息数量
   * @returns 工具消息数量
   */
  public getToolMessageCount(): number {
    return this.props.messages.filter(msg => msg.role === 'tool').length;
  }

  /**
   * 获取最后一条消息
   * @returns 最后一条消息或undefined
   */
  public getLastMessage(): LLMMessage | undefined {
    return this.props.messages.length > 0 ? this.props.messages[this.props.messages.length - 1] : undefined;
  }

  /**
   * 获取系统消息
   * @returns 系统消息列表
   */
  public getSystemMessages(): LLMMessage[] {
    return this.props.messages.filter(msg => msg.role === 'system');
  }

  /**
   * 获取用户消息
   * @returns 用户消息列表
   */
  public getUserMessages(): LLMMessage[] {
    return this.props.messages.filter(msg => msg.role === 'user');
  }

  /**
   * 获取助手消息
   * @returns 助手消息列表
   */
  public getAssistantMessages(): LLMMessage[] {
    return this.props.messages.filter(msg => msg.role === 'assistant');
  }

  /**
   * 获取工具消息
   * @returns 工具消息列表
   */
  public getToolMessages(): LLMMessage[] {
    return this.props.messages.filter(msg => msg.role === 'tool');
  }

  /**
   * 检查是否有工具调用
   * @returns 是否有工具调用
   */
  public hasToolCalls(): boolean {
    return this.props.messages.some(msg => msg.tool_calls && msg.tool_calls.length > 0);
  }

  /**
   * 获取所有工具调用
   * @returns 工具调用列表
   */
  public getToolCalls(): Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }> {
    const toolCalls: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }> = [];

    for (const message of this.props.messages) {
      if (message.tool_calls) {
        toolCalls.push(...message.tool_calls);
      }
    }

    return toolCalls;
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
   * 标记LLM请求为已删除
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
   * 检查LLM请求是否已删除
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
    return `llm-request:${this.props.id.toString()}`;
  }

  /**
   * 验证LLM请求的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('LLM请求ID不能为空');
    }

    if (!this.props.model || this.props.model.trim().length === 0) {
      throw new DomainError('模型名称不能为空');
    }

    if (!this.props.messages || this.props.messages.length === 0) {
      throw new DomainError('消息列表不能为空');
    }

    // 验证消息格式
    for (const message of this.props.messages) {
      if (!message.role || !message.content) {
        throw new DomainError('消息必须包含role和content字段');
      }

      const validRoles = ['system', 'user', 'assistant', 'tool'];
      if (!validRoles.includes(message.role)) {
        throw new DomainError(`无效的消息角色: ${message.role}`);
      }
    }

    // 验证温度参数范围
    if (this.props.temperature !== undefined) {
      if (this.props.temperature < 0 || this.props.temperature > 2) {
        throw new DomainError('温度参数必须在0到2之间');
      }
    }

    // 验证top_p参数范围
    if (this.props.topP !== undefined) {
      if (this.props.topP < 0 || this.props.topP > 1) {
        throw new DomainError('top_p参数必须在0到1之间');
      }
    }

    // 验证频率惩罚参数范围
    if (this.props.frequencyPenalty !== undefined) {
      if (this.props.frequencyPenalty < -2 || this.props.frequencyPenalty > 2) {
        throw new DomainError('频率惩罚参数必须在-2到2之间');
      }
    }

    // 验证存在惩罚参数范围
    if (this.props.presencePenalty !== undefined) {
      if (this.props.presencePenalty < -2 || this.props.presencePenalty > 2) {
        throw new DomainError('存在惩罚参数必须在-2到2之间');
      }
    }

    // 验证最大token数
    if (this.props.maxTokens !== undefined) {
      if (this.props.maxTokens <= 0) {
        throw new DomainError('最大token数必须大于0');
      }
    }
  }

}