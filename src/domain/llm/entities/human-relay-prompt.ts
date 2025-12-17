/**
 * HumanRelay提示实体
 * 
 * 封装人工中转的提示词内容和状态
 */

import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { HumanRelayMode } from '../value-objects/human-relay-mode';
import { PromptTemplate } from '../value-objects/prompt-template';
import { ILLMMessage, LLMMessageRole } from '../../../shared/types/llm';

/**
 * 提示状态枚举
 */
export enum PromptStatus {
  /**
   * 已创建
   */
  CREATED = 'created',
  
  /**
   * 已发送给用户
   */
  DELIVERED = 'delivered',
  
  /**
   * 用户已响应
   */
  RESPONDED = 'responded',
  
  /**
   * 已超时
   */
  TIMEOUT = 'timeout',
  
  /**
   * 已取消
   */
  CANCELLED = 'cancelled',
  
  /**
   * 发生错误
   */
  ERROR = 'error'
}

/**
 * HumanRelay提示属性接口
 */
export interface HumanRelayPromptProps {
  /**
   * 提示ID
   */
  id: ID;
  
  /**
   * 提示内容
   */
  content: string;
  
  /**
   * 操作模式
   */
  mode: HumanRelayMode;
  
  /**
   * 对话上下文（多轮模式）
   */
  conversationContext?: string;
  
  /**
   * 提示模板
   */
  template: PromptTemplate;
  
  /**
   * 创建时间
   */
  createdAt: Timestamp;
  
  /**
   * 提示状态
   */
  status: PromptStatus;
  
  /**
   * 发送时间
   */
  deliveredAt?: Timestamp;
  
  /**
   * 响应时间
   */
  respondedAt?: Timestamp;
  
  /**
   * 超时时间（秒）
   */
  timeout: number;
  
  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * HumanRelay提示实体
 */
export class HumanRelayPrompt extends Entity {
  private readonly props: HumanRelayPromptProps;

  constructor(props: HumanRelayPromptProps) {
    super(props.id, props.createdAt, Timestamp.now(), Version.initial());
    this.props = props;
  }

  // 属性访问器

  getId(): ID {
    return this.props.id;
  }

  getContent(): string {
    return this.props.content;
  }

  getMode(): HumanRelayMode {
    return this.props.mode;
  }

  getConversationContext(): string | undefined {
    return this.props.conversationContext;
  }

  getTemplate(): PromptTemplate {
    return this.props.template;
  }

  getCreatedAt(): Timestamp {
    return this.props.createdAt;
  }

  getStatus(): PromptStatus {
    return this.props.status;
  }

  getDeliveredAt(): Timestamp | undefined {
    return this.props.deliveredAt;
  }

  getRespondedAt(): Timestamp | undefined {
    return this.props.respondedAt;
  }

  getTimeout(): number {
    return this.props.timeout;
  }

  getMetadata(): Record<string, any> | undefined {
    return this.props.metadata ? { ...this.props.metadata } : undefined;
  }

  // 状态管理方法

  /**
   * 标记为已发送
   */
  public markAsDelivered(): void {
    if (this.props.status !== PromptStatus.CREATED) {
      throw new Error(`只能标记已创建的提示为已发送，当前状态: ${this.props.status}`);
    }
    
    this.props.status = PromptStatus.DELIVERED;
    this.props.deliveredAt = Timestamp.now();
  }

  /**
   * 标记为已响应
   */
  public markAsResponded(): void {
    if (this.props.status !== PromptStatus.DELIVERED) {
      throw new Error(`只能标记已发送的提示为已响应，当前状态: ${this.props.status}`);
    }
    
    this.props.status = PromptStatus.RESPONDED;
    this.props.respondedAt = Timestamp.now();
  }

  /**
   * 标记为超时
   */
  public markAsTimeout(): void {
    if (this.props.status === PromptStatus.RESPONDED || 
        this.props.status === PromptStatus.CANCELLED ||
        this.props.status === PromptStatus.ERROR) {
      throw new Error(`无法标记已完成的提示为超时，当前状态: ${this.props.status}`);
    }
    
    this.props.status = PromptStatus.TIMEOUT;
  }

  /**
   * 标记为已取消
   */
  public markAsCancelled(): void {
    if (this.props.status === PromptStatus.RESPONDED || 
        this.props.status === PromptStatus.ERROR) {
      throw new Error(`无法标记已完成的提示为已取消，当前状态: ${this.props.status}`);
    }
    
    this.props.status = PromptStatus.CANCELLED;
  }

  /**
   * 标记为错误状态
   */
  public markAsError(): void {
    if (this.props.status === PromptStatus.RESPONDED) {
      throw new Error(`无法标记已响应的提示为错误，当前状态: ${this.props.status}`);
    }
    
    this.props.status = PromptStatus.ERROR;
  }

  // 业务方法

  /**
   * 渲染提示内容
   */
  public render(): string {
    const variables: Record<string, string> = {
      prompt: this.props.content
    };

    if (this.props.conversationContext) {
      variables['conversation_history'] = this.props.conversationContext;
    }

    variables['timestamp'] = this.props.createdAt.toISOString();
    variables['session_id'] = this.props.id.value;

    return this.props.template.render(variables);
  }

  /**
   * 检查是否已超时
   */
  public isTimeout(): boolean {
    if (this.props.status === PromptStatus.RESPONDED || 
        this.props.status === PromptStatus.CANCELLED ||
        this.props.status === PromptStatus.ERROR) {
      return false;
    }

    const now = Timestamp.now();
    const elapsed = now.getMilliseconds() - this.props.createdAt.getMilliseconds();
    const timeoutMs = this.props.timeout * 1000;

    return elapsed > timeoutMs;
  }

  /**
   * 获取剩余时间（秒）
   */
  public getRemainingTime(): number {
    if (this.props.status === PromptStatus.RESPONDED || 
        this.props.status === PromptStatus.CANCELLED ||
        this.props.status === PromptStatus.ERROR) {
      return 0;
    }

    const now = Timestamp.now();
    const elapsed = now.getMilliseconds() - this.props.createdAt.getMilliseconds();
    const timeoutMs = this.props.timeout * 1000;
    const remainingMs = timeoutMs - elapsed;

    return Math.max(0, Math.floor(remainingMs / 1000));
  }

  /**
   * 检查是否可以取消
   */
  public canCancel(): boolean {
    return this.props.status !== PromptStatus.RESPONDED && 
           this.props.status !== PromptStatus.CANCELLED &&
           this.props.status !== PromptStatus.ERROR;
  }

  /**
   * 检查是否等待响应
   */
  public isWaitingForResponse(): boolean {
    return this.props.status === PromptStatus.DELIVERED;
  }

  /**
   * 检查是否已完成
   */
  public isCompleted(): boolean {
    return this.props.status === PromptStatus.RESPONDED ||
           this.props.status === PromptStatus.TIMEOUT ||
           this.props.status === PromptStatus.CANCELLED ||
           this.props.status === PromptStatus.ERROR;
  }

  // 静态工厂方法

  /**
   * 创建单轮模式提示
   */
  public static createSingleTurn(
    content: string,
    template: PromptTemplate,
    timeout: number = 300
  ): HumanRelayPrompt {
    return new HumanRelayPrompt({
      id: ID.generate(),
      content,
      mode: HumanRelayMode.SINGLE,
      template,
      createdAt: Timestamp.now(),
      status: PromptStatus.CREATED,
      timeout
    });
  }

  /**
   * 创建多轮模式提示
   */
  public static createMultiTurn(
    content: string,
    conversationContext: string,
    template: PromptTemplate,
    timeout: number = 600
  ): HumanRelayPrompt {
    return new HumanRelayPrompt({
      id: ID.generate(),
      content,
      mode: HumanRelayMode.MULTI,
      conversationContext,
      template,
      createdAt: Timestamp.now(),
      status: PromptStatus.CREATED,
      timeout
    });
  }

  /**
   * 从LLM消息创建提示
   */
  public static fromLLMMessages(
    messages: ILLMMessage[],
    mode: HumanRelayMode,
    template: PromptTemplate,
    timeout: number = 300
  ): HumanRelayPrompt {
    // 构建提示内容
    const content = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // 构建对话上下文（多轮模式）
    let conversationContext: string | undefined;
    if (mode === HumanRelayMode.MULTI && messages.length > 1) {
      conversationContext = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    }

    return mode === HumanRelayMode.MULTI
      ? this.createMultiTurn(content, conversationContext!, template, timeout)
      : this.createSingleTurn(content, template, timeout);
  }

  /**
   * 克隆提示
   */
  public clone(): HumanRelayPrompt {
    return new HumanRelayPrompt({
      ...this.props,
      id: ID.generate(), // 生成新的ID
      createdAt: Timestamp.now(), // 重置创建时间
      status: PromptStatus.CREATED, // 重置状态
      deliveredAt: undefined,
      respondedAt: undefined
    });
  }

  /**
   * 获取提示摘要
   */
  public getSummary(): {
    id: string;
    mode: HumanRelayMode;
    status: PromptStatus;
    contentPreview: string;
    createdAt: string;
    remainingTime: number;
  } {
    const contentPreview = this.props.content.length > 100
      ? this.props.content.substring(0, 100) + '...'
      : this.props.content;

    return {
      id: this.props.id.value,
      mode: this.props.mode,
      status: this.props.status,
      contentPreview,
      createdAt: this.props.createdAt.toISOString(),
      remainingTime: this.getRemainingTime()
    };
  }

  /**
   * 验证提示实体的有效性
   */
  public validate(): void {
    if (!this.props.id || !this.props.id.value) {
      throw new Error('提示ID不能为空');
    }
    if (!this.props.content || this.props.content.trim() === '') {
      throw new Error('提示内容不能为空');
    }
    if (!this.props.template) {
      throw new Error('提示模板不能为空');
    }
    if (!this.props.createdAt) {
      throw new Error('创建时间不能为空');
    }
    if (this.props.timeout <= 0) {
      throw new Error('超时时间必须大于0');
    }
  }
}