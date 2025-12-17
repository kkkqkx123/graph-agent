/**
 * HumanRelay响应实体
 * 
 * 封装人工中转的用户响应内容
 */

import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';

/**
 * 响应类型枚举
 */
export enum ResponseType {
  /**
   * 正常响应
   */
  NORMAL = 'normal',
  
  /**
   * 超时响应
   */
  TIMEOUT = 'timeout',
  
  /**
   * 错误响应
   */
  ERROR = 'error',
  
  /**
   * 取消响应
   */
  CANCELLED = 'cancelled'
}

/**
 * HumanRelay响应属性接口
 */
export interface HumanRelayResponseProps {
  /**
   * 响应ID
   */
  id: ID;
  
  /**
   * 响应内容
   */
  content: string;
  
  /**
   * 响应类型
   */
  type: ResponseType;
  
  /**
   * 响应时间（毫秒）
   */
  responseTime: number;
  
  /**
   * 用户交互时间（毫秒）
   */
  userInteractionTime: number;
  
  /**
   * 创建时间
   */
  createdAt: Timestamp;
  
  /**
   * 关联的提示ID
   */
  promptId?: ID;
  
  /**
   * 错误信息（错误类型响应）
   */
  errorMessage?: string;
  
  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * HumanRelay响应实体
 */
export class HumanRelayResponse extends Entity {
  private readonly props: HumanRelayResponseProps;

  constructor(props: HumanRelayResponseProps) {
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

  getType(): ResponseType {
    return this.props.type;
  }

  getResponseTime(): number {
    return this.props.responseTime;
  }

  getUserInteractionTime(): number {
    return this.props.userInteractionTime;
  }

  getCreatedAt(): Timestamp {
    return this.props.createdAt;
  }

  getPromptId(): ID | undefined {
    return this.props.promptId;
  }

  getErrorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  getMetadata(): Record<string, any> | undefined {
    return this.props.metadata ? { ...this.props.metadata } : undefined;
  }

  // 业务方法

  /**
   * 检查是否为正常响应
   */
  public isNormal(): boolean {
    return this.props.type === ResponseType.NORMAL;
  }

  /**
   * 检查是否为超时响应
   */
  public isTimeout(): boolean {
    return this.props.type === ResponseType.TIMEOUT;
  }

  /**
   * 检查是否为错误响应
   */
  public isError(): boolean {
    return this.props.type === ResponseType.ERROR;
  }

  /**
   * 检查是否为取消响应
   */
  public isCancelled(): boolean {
    return this.props.type === ResponseType.CANCELLED;
  }

  /**
   * 检查是否有有效内容
   */
  public hasValidContent(): boolean {
    return this.isNormal() && this.props.content.trim().length > 0;
  }

  /**
   * 获取内容长度
   */
  public getContentLength(): number {
    return this.props.content.length;
  }

  /**
   * 获取内容预览
   */
  public getContentPreview(maxLength: number = 100): string {
    if (this.props.content.length <= maxLength) {
      return this.props.content;
    }
    return this.props.content.substring(0, maxLength) + '...';
  }

  /**
   * 获取响应效率评分
   * 
   * @returns 效率评分（0-100）
   */
  public getEfficiencyScore(): number {
    if (!this.isNormal()) {
      return 0;
    }

    // 基于响应时间计算效率评分
    // 响应时间越短，评分越高
    const maxExpectedTime = 300000; // 5分钟
    const minExpectedTime = 10000;  // 10秒
    
    if (this.props.responseTime <= minExpectedTime) {
      return 100;
    }
    
    if (this.props.responseTime >= maxExpectedTime) {
      return 20;
    }
    
    // 线性插值
    const ratio = (this.props.responseTime - minExpectedTime) / (maxExpectedTime - minExpectedTime);
    return Math.round(100 - ratio * 80);
  }

  /**
   * 获取用户参与度评分
   * 
   * @returns 参与度评分（0-100）
   */
  public getEngagementScore(): number {
    if (!this.isNormal()) {
      return 0;
    }

    let score = 50; // 基础分

    // 基于内容长度
    const contentLength = this.getContentLength();
    if (contentLength > 500) {
      score += 20;
    } else if (contentLength > 200) {
      score += 10;
    } else if (contentLength < 50) {
      score -= 20;
    }

    // 基于用户交互时间
    if (this.props.userInteractionTime > 60000) { // 超过1分钟
      score += 15;
    } else if (this.props.userInteractionTime < 10000) { // 少于10秒
      score -= 15;
    }

    // 基于响应时间与交互时间的比例
    const ratio = this.props.userInteractionTime / this.props.responseTime;
    if (ratio > 0.8) { // 用户大部分时间都在交互
      score += 15;
    } else if (ratio < 0.3) { // 用户交互时间很少
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  // 静态工厂方法

  /**
   * 创建正常响应
   */
  public static createNormal(
    content: string,
    responseTime: number,
    userInteractionTime: number,
    promptId?: ID,
    metadata?: Record<string, any>
  ): HumanRelayResponse {
    return new HumanRelayResponse({
      id: ID.generate(),
      content,
      type: ResponseType.NORMAL,
      responseTime,
      userInteractionTime,
      createdAt: Timestamp.now(),
      promptId,
      metadata
    });
  }

  /**
   * 创建超时响应
   */
  public static createTimeout(
    responseTime: number,
    promptId?: ID
  ): HumanRelayResponse {
    return new HumanRelayResponse({
      id: ID.generate(),
      content: '',
      type: ResponseType.TIMEOUT,
      responseTime,
      userInteractionTime: responseTime,
      createdAt: Timestamp.now(),
      promptId,
      errorMessage: '用户响应超时'
    });
  }

  /**
   * 创建错误响应
   */
  public static createError(
    errorMessage: string,
    responseTime: number,
    promptId?: ID
  ): HumanRelayResponse {
    return new HumanRelayResponse({
      id: ID.generate(),
      content: '',
      type: ResponseType.ERROR,
      responseTime,
      userInteractionTime: responseTime,
      createdAt: Timestamp.now(),
      promptId,
      errorMessage
    });
  }

  /**
   * 创建取消响应
   */
  public static createCancelled(
    responseTime: number,
    promptId?: ID
  ): HumanRelayResponse {
    return new HumanRelayResponse({
      id: ID.generate(),
      content: '',
      type: ResponseType.CANCELLED,
      responseTime,
      userInteractionTime: responseTime,
      createdAt: Timestamp.now(),
      promptId,
      errorMessage: '用户取消了交互'
    });
  }

  /**
   * 从用户输入创建响应
   */
  public static fromUserInput(
    userInput: string,
    startTime: Timestamp,
    endTime: Timestamp,
    promptId?: ID,
    metadata?: Record<string, any>
  ): HumanRelayResponse {
    const responseTime = endTime.getMilliseconds() - startTime.getMilliseconds();
    
    // 估算用户交互时间（简化实现）
    const userInteractionTime = Math.min(responseTime, responseTime * 0.8);
    
    return this.createNormal(
      userInput,
      responseTime,
      userInteractionTime,
      promptId,
      metadata
    );
  }

  /**
   * 获取响应摘要
   */
  public getSummary(): {
    id: string;
    type: ResponseType;
    contentPreview: string;
    responseTime: number;
    userInteractionTime: number;
    efficiencyScore: number;
    engagementScore: number;
    createdAt: string;
  } {
    return {
      id: this.props.id.value,
      type: this.props.type,
      contentPreview: this.getContentPreview(),
      responseTime: this.props.responseTime,
      userInteractionTime: this.props.userInteractionTime,
      efficiencyScore: this.getEfficiencyScore(),
      engagementScore: this.getEngagementScore(),
      createdAt: this.props.createdAt.toISOString()
    };
  }

  /**
   * 转换为JSON对象
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.props.id.value,
      content: this.props.content,
      type: this.props.type,
      responseTime: this.props.responseTime,
      userInteractionTime: this.props.userInteractionTime,
      createdAt: this.props.createdAt.toISOString(),
      promptId: this.props.promptId?.value,
      errorMessage: this.props.errorMessage,
      metadata: this.props.metadata,
      efficiencyScore: this.getEfficiencyScore(),
      engagementScore: this.getEngagementScore()
    };
  }

  /**
   * 从JSON对象创建响应
   */
  public static fromJSON(json: Record<string, any>): HumanRelayResponse {
    return new HumanRelayResponse({
      id: ID.fromString(json['id']),
      content: json['content'],
      type: json['type'] as ResponseType,
      responseTime: json['responseTime'],
      userInteractionTime: json['userInteractionTime'],
      createdAt: Timestamp.fromISOString(json['createdAt']),
      promptId: json['promptId'] ? ID.fromString(json['promptId']) : undefined,
      errorMessage: json['errorMessage'],
      metadata: json['metadata']
    });
  }

  /**
   * 验证响应实体的有效性
   */
  public validate(): void {
    if (!this.props.id || !this.props.id.value) {
      throw new Error('响应ID不能为空');
    }
    if (!this.props.content || this.props.content.trim() === '') {
      throw new Error('响应内容不能为空');
    }
    if (!this.props.createdAt) {
      throw new Error('创建时间不能为空');
    }
    if (this.props.responseTime < 0) {
      throw new Error('响应时间不能为负数');
    }
    if (this.props.userInteractionTime < 0) {
      throw new Error('用户交互时间不能为负数');
    }
  }
  }