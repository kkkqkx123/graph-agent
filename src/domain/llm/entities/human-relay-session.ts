/**
 * HumanRelay会话实体
 * 
 * 管理人工中转会话的状态和对话历史
 */

import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { HumanRelayMode } from '../value-objects/human-relay-mode';
import { HumanRelaySessionStatus, HumanRelaySessionStatusUtils } from '../value-objects/human-relay-session-status';
import { HumanRelayPrompt } from './human-relay-prompt';
import { HumanRelayResponse } from './human-relay-response';
import { ILLMMessage, LLMMessageRole } from '../../../shared/types/llm';

/**
 * HumanRelay会话属性接口
 */
export interface HumanRelaySessionProps {
  /**
   * 会话ID
   */
  id: ID;
  
  /**
   * 会话名称
   */
  name: string;
  
  /**
   * 操作模式
   */
  mode: HumanRelayMode;
  
  /**
   * 会话状态
   */
  status: HumanRelaySessionStatus;
  
  /**
   * 对话历史
   */
  conversationHistory: ILLMMessage[];
  
  /**
   * 提示历史
   */
  promptHistory: HumanRelayPrompt[];
  
  /**
   * 响应历史
   */
  responseHistory: HumanRelayResponse[];
  
  /**
   * 创建时间
   */
  createdAt: Timestamp;
  
  /**
   * 最后活动时间
   */
  lastActivityAt: Timestamp;
  
  /**
   * 最大历史长度
   */
  maxHistoryLength: number;
  
  /**
   * 会话超时时间（秒）
   */
  sessionTimeout: number;
  
  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * HumanRelay会话实体
 */
export class HumanRelaySession extends Entity {
  private readonly props: HumanRelaySessionProps;

  constructor(props: HumanRelaySessionProps) {
    super(props.id, props.createdAt, Timestamp.now(), Version.initial());
    this.props = props;
  }

  // 属性访问器

  getId(): ID {
    return this.props.id;
  }

  getName(): string {
    return this.props.name;
  }

  getMode(): HumanRelayMode {
    return this.props.mode;
  }

  getStatus(): HumanRelaySessionStatus {
    return this.props.status;
  }

  getConversationHistory(): ILLMMessage[] {
    return [...this.props.conversationHistory];
  }

  getPromptHistory(): HumanRelayPrompt[] {
    return [...this.props.promptHistory];
  }

  getResponseHistory(): HumanRelayResponse[] {
    return [...this.props.responseHistory];
  }

  getCreatedAt(): Timestamp {
    return this.props.createdAt;
  }

  getLastActivityAt(): Timestamp {
    return this.props.lastActivityAt;
  }

  getMaxHistoryLength(): number {
    return this.props.maxHistoryLength;
  }

  getSessionTimeout(): number {
    return this.props.sessionTimeout;
  }

  getMetadata(): Record<string, any> | undefined {
    return this.props.metadata ? { ...this.props.metadata } : undefined;
  }

  // 状态管理方法

  /**
   * 更新会话状态
   */
  public updateStatus(newStatus: HumanRelaySessionStatus): void {
    if (!HumanRelaySessionStatusUtils.isValidTransition(this.props.status, newStatus)) {
      throw new Error(`无效的状态转换: ${this.props.status} -> ${newStatus}`);
    }
    
    this.props.status = newStatus;
    this.updateLastActivity();
  }

  /**
   * 激活会话
   */
  public activate(): void {
    this.updateStatus(HumanRelaySessionStatus.ACTIVE);
  }

  /**
   * 设置为等待用户状态
   */
  public setWaitingForUser(): void {
    this.updateStatus(HumanRelaySessionStatus.WAITING_FOR_USER);
  }

  /**
   * 设置为处理中状态
   */
  public setProcessing(): void {
    this.updateStatus(HumanRelaySessionStatus.PROCESSING);
  }

  /**
   * 完成会话
   */
  public complete(): void {
    this.updateStatus(HumanRelaySessionStatus.COMPLETED);
  }

  /**
   * 设置超时状态
   */
  public timeout(): void {
    this.updateStatus(HumanRelaySessionStatus.TIMEOUT);
  }

  /**
   * 取消会话
   */
  public cancel(): void {
    this.updateStatus(HumanRelaySessionStatus.CANCELLED);
  }

  /**
   * 设置错误状态
   */
  public setError(): void {
    this.updateStatus(HumanRelaySessionStatus.ERROR);
  }

  // 消息管理方法

  /**
   * 添加消息到对话历史
   */
  public addMessage(message: ILLMMessage): void {
    this.props.conversationHistory.push(message);
    this.trimHistoryIfNeeded();
    this.updateLastActivity();
  }

  /**
   * 添加多条消息到对话历史
   */
  public addMessages(messages: ILLMMessage[]): void {
    this.props.conversationHistory.push(...messages);
    this.trimHistoryIfNeeded();
    this.updateLastActivity();
  }

  /**
   * 清空对话历史
   */
  public clearHistory(): void {
    this.props.conversationHistory = [];
    this.updateLastActivity();
  }

  /**
   * 获取最后一条消息
   */
  public getLastMessage(): ILLMMessage | undefined {
    const history = this.props.conversationHistory;
    return history.length > 0 ? history[history.length - 1] : undefined;
  }

  /**
   * 获取最后N条消息
   */
  public getLastMessages(count: number): ILLMMessage[] {
    const history = this.props.conversationHistory;
    return history.slice(-count);
  }

  // 提示管理方法

  /**
   * 添加提示到历史
   */
  public addPrompt(prompt: HumanRelayPrompt): void {
    this.props.promptHistory.push(prompt);
    this.updateLastActivity();
  }

  /**
   * 获取当前活跃提示
   */
  public getCurrentPrompt(): HumanRelayPrompt | undefined {
    return this.props.promptHistory
      .slice()
      .reverse()
      .find(prompt => prompt.getStatus() === 'delivered');
  }

  /**
   * 获取最后一条提示
   */
  public getLastPrompt(): HumanRelayPrompt | undefined {
    const history = this.props.promptHistory;
    return history.length > 0 ? history[history.length - 1] : undefined;
  }

  // 响应管理方法

  /**
   * 添加响应到历史
   */
  public addResponse(response: HumanRelayResponse): void {
    this.props.responseHistory.push(response);
    this.updateLastActivity();
  }

  /**
   * 获取最后一条响应
   */
  public getLastResponse(): HumanRelayResponse | undefined {
    const history = this.props.responseHistory;
    return history.length > 0 ? history[history.length - 1] : undefined;
  }

  // 业务方法

  /**
   * 更新最后活动时间
   */
  public updateLastActivity(): void {
    this.props.lastActivityAt = Timestamp.now();
  }

  /**
   * 检查会话是否已超时
   */
  public isTimeout(): boolean {
    if (HumanRelaySessionStatusUtils.isTerminal(this.props.status)) {
      return false;
    }

    const now = Timestamp.now();
    const elapsed = now.getMilliseconds() - this.props.lastActivityAt.getMilliseconds();
    const timeoutMs = this.props.sessionTimeout * 1000;

    return elapsed > timeoutMs;
  }

  /**
   * 获取剩余时间（秒）
   */
  public getRemainingTime(): number {
    if (HumanRelaySessionStatusUtils.isTerminal(this.props.status)) {
      return 0;
    }

    const now = Timestamp.now();
    const elapsed = now.getMilliseconds() - this.props.lastActivityAt.getMilliseconds();
    const timeoutMs = this.props.sessionTimeout * 1000;
    const remainingMs = timeoutMs - elapsed;

    return Math.max(0, Math.floor(remainingMs / 1000));
  }

  /**
   * 检查是否可以接收新的交互
   */
  public canAcceptInteraction(): boolean {
    return HumanRelaySessionStatusUtils.canAcceptInteraction(this.props.status) && 
           !this.isTimeout();
  }

  /**
   * 检查是否为多轮模式
   */
  public isMultiMode(): boolean {
    return this.props.mode === HumanRelayMode.MULTI;
  }

  /**
   * 检查是否为单轮模式
   */
  public isSingleMode(): boolean {
    return this.props.mode === HumanRelayMode.SINGLE;
  }

  /**
   * 获取会话持续时间（秒）
   */
  public getDuration(): number {
    const now = Timestamp.now();
    const elapsed = now.getMilliseconds() - this.props.createdAt.getMilliseconds();
    return Math.floor(elapsed / 1000);
  }

  /**
   * 获取会话统计信息
   */
  public getStatistics(): {
    totalPrompts: number;
    totalResponses: number;
    averageResponseTime: number;
    successRate: number;
    duration: number;
  } {
    const totalPrompts = this.props.promptHistory.length;
    const totalResponses = this.props.responseHistory.length;
    
    // 计算平均响应时间
    const normalResponses = this.props.responseHistory.filter(r => r.isNormal());
    const averageResponseTime = normalResponses.length > 0
      ? normalResponses.reduce((sum, r) => sum + r.getResponseTime(), 0) / normalResponses.length
      : 0;

    // 计算成功率
    const successRate = totalPrompts > 0
      ? (normalResponses.length / totalPrompts) * 100
      : 0;

    return {
      totalPrompts,
      totalResponses,
      averageResponseTime,
      successRate,
      duration: this.getDuration()
    };
  }

  /**
   * 获取对话上下文（多轮模式）
   */
  public getConversationContext(): string {
    if (this.props.mode !== HumanRelayMode.MULTI) {
      return '';
    }

    return this.props.conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  // 私有方法

  /**
   * 根据需要修剪历史记录
   */
  private trimHistoryIfNeeded(): void {
    if (this.props.conversationHistory.length > this.props.maxHistoryLength) {
      const excess = this.props.conversationHistory.length - this.props.maxHistoryLength;
      this.props.conversationHistory.splice(0, excess);
    }
  }

  // 静态工厂方法

  /**
   * 创建新会话
   */
  public static create(
    name: string,
    mode: HumanRelayMode,
    maxHistoryLength: number = 50,
    sessionTimeout: number = 1800
  ): HumanRelaySession {
    const now = Timestamp.now();
    return new HumanRelaySession({
      id: ID.generate(),
      name,
      mode,
      status: HumanRelaySessionStatus.ACTIVE,
      conversationHistory: [],
      promptHistory: [],
      responseHistory: [],
      createdAt: now,
      lastActivityAt: now,
      maxHistoryLength,
      sessionTimeout
    });
  }

  /**
   * 创建单轮模式会话
   */
  public static createSingleTurn(
    name: string,
    sessionTimeout: number = 300
  ): HumanRelaySession {
    return this.create(name, HumanRelayMode.SINGLE, 1, sessionTimeout);
  }

  /**
   * 创建多轮模式会话
   */
  public static createMultiTurn(
    name: string,
    maxHistoryLength: number = 100,
    sessionTimeout: number = 1800
  ): HumanRelaySession {
    return this.create(name, HumanRelayMode.MULTI, maxHistoryLength, sessionTimeout);
  }

  /**
   * 获取会话摘要
   */
  public getSummary(): {
    id: string;
    name: string;
    mode: HumanRelayMode;
    status: HumanRelaySessionStatus;
    duration: number;
    remainingTime: number;
    messageCount: number;
    statistics: Record<string, any>;
  } {
    const statistics = this.getStatistics();
    return {
      id: this.props.id.value,
      name: this.props.name,
      mode: this.props.mode,
      status: this.props.status,
      duration: this.getDuration(),
      remainingTime: this.getRemainingTime(),
      messageCount: this.props.conversationHistory.length,
      statistics: statistics
    };
  }

  /**
   * 转换为JSON对象
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.props.id.value,
      name: this.props.name,
      mode: this.props.mode,
      status: this.props.status,
      conversationHistory: this.props.conversationHistory,
      promptHistory: this.props.promptHistory.map(p => p.getSummary()),
      responseHistory: this.props.responseHistory.map(r => r.getSummary()),
      createdAt: this.props.createdAt.toISOString(),
      lastActivityAt: this.props.lastActivityAt.toISOString(),
      maxHistoryLength: this.props.maxHistoryLength,
      sessionTimeout: this.props.sessionTimeout,
      metadata: this.props.metadata,
      statistics: this.getStatistics()
    };
  }

  /**
   * 验证会话实体的有效性
   */
  public validate(): void {
    if (!this.props.id || !this.props.id.value) {
      throw new Error('会话ID不能为空');
    }
    if (!this.props.name || this.props.name.trim() === '') {
      throw new Error('会话名称不能为空');
    }
    if (!this.props.createdAt) {
      throw new Error('创建时间不能为空');
    }
    if (!this.props.lastActivityAt) {
      throw new Error('最后活动时间不能为空');
    }
    if (this.props.maxHistoryLength <= 0) {
      throw new Error('最大历史长度必须大于0');
    }
    if (this.props.sessionTimeout <= 0) {
      throw new Error('会话超时时间必须大于0');
    }
  }
  }