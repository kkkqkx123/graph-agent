import { ID } from '../../common/value-objects/id';

/**
 * 消息类型枚举
 */
export enum MessageType {
  TEXT = 'text',
  BINARY = 'binary',
  JSON = 'json',
  EVENT = 'event',
  COMMAND = 'command',
  RESPONSE = 'response',
  ERROR = 'error'
}

/**
 * 传递模式枚举
 */
export enum PassingMode {
  SYNC = 'sync',
  ASYNC = 'async',
  BATCH = 'batch',
  STREAM = 'stream',
  QUEUE = 'queue'
}

/**
 * 消息可靠性级别
 */
export enum ReliabilityLevel {
  BEST_EFFORT = 'best_effort',
  AT_LEAST_ONCE = 'at_least_once',
  EXACTLY_ONCE = 'exactly_once'
}

/**
 * 消息接口
 */
export interface IMessage {
  messageId: string;
  type: MessageType;
  payload: any;
  headers: Record<string, string>;
  timestamp: Date;
  sourceId?: string;
  targetId?: string;
  correlationId?: string;
  replyTo?: string;
  expirationTime?: Date;
  priority: number;
  retryCount: number;
  metadata: Record<string, unknown>;
}

/**
 * 消息路由配置
 */
export interface MessageRoutingConfig {
  routingKey: string;
  exchange?: string;
  queue?: string;
  bindingKey?: string;
  headers?: Record<string, string>;
}

/**
 * 消息传递配置
 */
export interface MessagePassingConfig {
  mode: PassingMode;
  reliability: ReliabilityLevel;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  batchSize?: number;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
}

/**
 * 消息处理结果
 */
export interface MessageProcessingResult {
  messageId: string;
  success: boolean;
  result?: any;
  error?: Error;
  processingTime: number;
  retryCount: number;
  metadata: Record<string, unknown>;
}

/**
 * 消息处理器统计信息
 */
export interface MessageProcessorStats {
  totalMessages: number;
  processedMessages: number;
  failedMessages: number;
  averageProcessingTime: number;
  queueSize: number;
  throughput: number;
  messagesByType: Map<MessageType, number>;
  messagesBySource: Map<string, number>;
}

/**
 * 消息处理器接口
 * 
 * 负责处理节点间的消息传递，包括路由、转换和可靠性保证
 */
export interface IMessageProcessor {
  /**
   * 发送消息
   * 
   * @param message 要发送的消息
   * @param config 传递配置
   * @returns 处理结果
   */
  sendMessage(message: IMessage, config?: MessagePassingConfig): Promise<MessageProcessingResult>;

  /**
   * 批量发送消息
   * 
   * @param messages 消息列表
   * @param config 传递配置
   * @returns 处理结果列表
   */
  sendMessages(messages: IMessage[], config?: MessagePassingConfig): Promise<MessageProcessingResult[]>;

  /**
   * 接收消息
   * 
   * @param sourceId 源ID
   * @param timeout 超时时间
   * @returns 接收到的消息
   */
  receiveMessage(sourceId?: string, timeout?: number): Promise<IMessage | null>;

  /**
   * 批量接收消息
   * 
   * @param sourceId 源ID
   * @param batchSize 批量大小
   * @param timeout 超时时间
   * @returns 接收到的消息列表
   */
  receiveMessages(sourceId?: string, batchSize?: number, timeout?: number): Promise<IMessage[]>;

  /**
   * 路由消息
   * 
   * @param message 要路由的消息
   * @param routingConfig 路由配置
   * @returns 路由结果
   */
  routeMessage(message: IMessage, routingConfig: MessageRoutingConfig): Promise<string[]>;

  /**
   * 转换消息
   * 
   * @param message 原始消息
   * @param targetType 目标类型
   * @returns 转换后的消息
   */
  transformMessage(message: IMessage, targetType: MessageType): Promise<IMessage>;

  /**
   * 验证消息
   * 
   * @param message 要验证的消息
   * @returns 验证结果
   */
  validateMessage(message: IMessage): MessageValidationResult;

  /**
   * 序列化消息
   * 
   * @param message 要序列化的消息
   * @param format 序列化格式
   * @returns 序列化后的数据
   */
  serializeMessage(message: IMessage, format?: 'json' | 'binary' | 'protobuf'): Promise<Buffer>;

  /**
   * 反序列化消息
   * 
   * @param data 序列化数据
   * @param format 序列化格式
   * @returns 反序列化后的消息
   */
  deserializeMessage(data: Buffer, format?: 'json' | 'binary' | 'protobuf'): Promise<IMessage>;

  /**
   * 创建消息
   * 
   * @param type 消息类型
   * @param payload 消息载荷
   * @param headers 消息头
   * @returns 创建的消息
   */
  createMessage(type: MessageType, payload: any, headers?: Record<string, string>): IMessage;

  /**
   * 创建响应消息
   * 
   * @param originalMessage 原始消息
   * @param payload 响应载荷
   * @param success 是否成功
   * @returns 响应消息
   */
  createResponseMessage(originalMessage: IMessage, payload: any, success: boolean): IMessage;

  /**
   * 创建错误消息
   * 
   * @param originalMessage 原始消息
   * @param error 错误信息
   * @returns 错误消息
   */
  createErrorMessage(originalMessage: IMessage, error: Error): IMessage;

  /**
   * 获取消息队列大小
   * 
   * @param queueId 队列ID
   * @returns 队列大小
   */
  getQueueSize(queueId?: string): number;

  /**
   * 清空消息队列
   * 
   * @param queueId 队列ID
   * @returns 清空的消息数量
   */
  clearQueue(queueId?: string): number;

  /**
   * 获取消息处理历史
   * 
   * @param messageId 消息ID
   * @returns 处理历史
   */
  getMessageHistory(messageId: string): Promise<MessageProcessingRecord[]>;

  /**
   * 获取消息处理器统计信息
   * 
   * @returns 统计信息
   */
  getProcessorStats(): MessageProcessorStats;

  /**
   * 设置消息处理器配置
   * 
   * @param config 处理器配置
   */
  setProcessorConfig(config: MessageProcessorConfig): void;

  /**
   * 注册消息处理器
   * 
   * @param messageType 消息类型
   * @param handler 处理器函数
   * @returns 处理器ID
   */
  registerMessageHandler(messageType: MessageType, handler: MessageHandler): string;

  /**
   * 注销消息处理器
   * 
   * @param handlerId 处理器ID
   * @returns 是否成功注销
   */
  unregisterMessageHandler(handlerId: string): boolean;

  /**
   * 重置消息处理器
   */
  reset(): void;

  /**
   * 销毁消息处理器，释放资源
   */
  destroy(): Promise<void>;
}

/**
 * 消息验证结果
 */
export interface MessageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 消息处理记录
 */
export interface MessageProcessingRecord {
  messageId: string;
  messageType: MessageType;
  sourceId?: string;
  targetId?: string;
  result: MessageProcessingResult;
  processedAt: Date;
}

/**
 * 消息处理器配置
 */
export interface MessageProcessorConfig {
  defaultMode: PassingMode;
  defaultReliability: ReliabilityLevel;
  defaultTimeout: number;
  maxQueueSize: number;
  enablePersistence: boolean;
  enableCompression: boolean;
  enableEncryption: boolean;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  processingThreads: number;
}

/**
 * 消息处理器函数
 */
export type MessageHandler = (message: IMessage) => Promise<MessageProcessingResult>;

/**
 * 消息路由器接口
 */
export interface IMessageRouter {
  /**
   * 添加路由规则
   * 
   * @param rule 路由规则
   */
  addRoutingRule(rule: RoutingRule): void;

  /**
   * 移除路由规则
   * 
   * @param ruleId 规则ID
   * @returns 是否成功移除
   */
  removeRoutingRule(ruleId: string): boolean;

  /**
   * 路由消息
   * 
   * @param message 要路由的消息
   * @returns 目标ID列表
   */
  route(message: IMessage): string[];

  /**
   * 获取路由规则
   * 
   * @param ruleId 规则ID
   * @returns 路由规则
   */
  getRoutingRule(ruleId: string): RoutingRule | null;

  /**
   * 获取所有路由规则
   * 
   * @returns 路由规则列表
   */
  getRoutingRules(): RoutingRule[];
}

/**
 * 路由规则
 */
export interface RoutingRule {
  ruleId: string;
  name: string;
  description: string;
  priority: number;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
  enabled: boolean;
}

/**
 * 路由条件
 */
export interface RoutingCondition {
  type: 'header' | 'payload' | 'source' | 'target' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'regex' | 'greater_than' | 'less_than';
  property: string;
  value: any;
  weight?: number;
}

/**
 * 路由动作
 */
export interface RoutingAction {
  type: 'forward' | 'transform' | 'filter' | 'duplicate' | 'custom';
  target?: string;
  parameters?: Record<string, unknown>;
}