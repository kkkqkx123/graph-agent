import { ID } from '../../common/value-objects/id';

/**
 * 触发器类型枚举
 */
export enum TriggerType {
  TIME = 'time',
  STATE = 'state',
  EVENT = 'event',
  CUSTOM = 'custom',
  CONDITION = 'condition',
  SCHEDULE = 'schedule',
  THRESHOLD = 'threshold'
}

/**
 * 触发器事件
 */
export interface TriggerEvent {
  id: string;
  triggerId: string;
  triggerType: TriggerType;
  timestamp: Date;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  state?: any;
  context?: Record<string, unknown>;
}

/**
 * 触发器执行结果
 */
export interface TriggerExecutionResult {
  triggerId: string;
  eventId: string;
  success: boolean;
  result?: any;
  error?: Error;
  executionTime: number;
  shouldContinue: boolean;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

/**
 * 触发器配置
 */
export interface TriggerConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  maxExecutions?: number;
  rateLimit?: number;
  cooldownPeriod?: number;
  retryPolicy?: RetryPolicy;
  conditions?: TriggerCondition[];
  parameters?: Record<string, unknown>;
}

/**
 * 重试策略
 */
export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * 触发器条件
 */
export interface TriggerCondition {
  type: 'state' | 'event' | 'time' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'regex';
  property: string;
  value: any;
  weight?: number;
}

/**
 * 触发器统计信息
 */
export interface TriggerStats {
  totalTriggers: number;
  activeTriggers: number;
  totalEvents: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  eventsByTriggerType: Map<TriggerType, number>;
  executionsByTriggerId: Map<string, number>;
}

/**
 * 触发器系统接口
 * 
 * 负责管理和执行图执行过程中的各种触发器
 */
export interface ITriggerSystem {
  /**
   * 注册触发器
   * 
   * @param trigger 触发器实例
   * @param config 触发器配置
   * @returns 是否成功注册
   */
  registerTrigger(trigger: ITrigger, config?: TriggerConfig): Promise<boolean>;

  /**
   * 注销触发器
   * 
   * @param triggerId 触发器ID
   * @returns 是否成功注销
   */
  unregisterTrigger(triggerId: string): Promise<boolean>;

  /**
   * 评估触发器
   * 
   * @param state 当前状态
   * @param context 上下文信息
   * @returns 触发事件列表
   */
  evaluateTriggers(state: any, context?: Record<string, unknown>): Promise<TriggerEvent[]>;

  /**
   * 执行触发器
   * 
   * @param triggerEvent 触发事件
   * @returns 执行结果
   */
  executeTrigger(triggerEvent: TriggerEvent): Promise<TriggerExecutionResult>;

  /**
   * 批量执行触发器
   * 
   * @param triggerEvents 触发事件列表
   * @returns 执行结果列表
   */
  executeTriggers(triggerEvents: TriggerEvent[]): Promise<TriggerExecutionResult[]>;

  /**
   * 异步执行触发器
   * 
   * @param triggerEvent 触发事件
   * @returns 执行结果
   */
  executeTriggerAsync(triggerEvent: TriggerEvent): Promise<TriggerExecutionResult>;

  /**
   * 获取触发器列表
   * 
   * @param triggerType 触发器类型
   * @param enabled 是否启用
   * @returns 触发器列表
   */
  getTriggers(triggerType?: TriggerType, enabled?: boolean): RegisteredTrigger[];

  /**
   * 获取触发器
   * 
   * @param triggerId 触发器ID
   * @returns 触发器实例
   */
  getTrigger(triggerId: string): ITrigger | null;

  /**
   * 获取触发器配置
   * 
   * @param triggerId 触发器ID
   * @returns 触发器配置
   */
  getTriggerConfig(triggerId: string): TriggerConfig | null;

  /**
   * 更新触发器配置
   * 
   * @param triggerId 触发器ID
   * @param config 新配置
   * @returns 是否成功更新
   */
  updateTriggerConfig(triggerId: string, config: Partial<TriggerConfig>): Promise<boolean>;

  /**
   * 启用触发器
   * 
   * @param triggerId 触发器ID
   * @returns 是否成功启用
   */
  enableTrigger(triggerId: string): Promise<boolean>;

  /**
   * 禁用触发器
   * 
   * @param triggerId 触发器ID
   * @returns 是否成功禁用
   */
  disableTrigger(triggerId: string): Promise<boolean>;

  /**
   * 检查触发器是否应该触发
   * 
   * @param triggerId 触发器ID
   * @param state 当前状态
   * @param context 上下文信息
   * @returns 是否应该触发
   */
  shouldTrigger(triggerId: string, state: any, context?: Record<string, unknown>): Promise<boolean>;

  /**
   * 获取触发器执行历史
   * 
   * @param triggerId 触发器ID
   * @param limit 限制数量
   * @returns 执行历史
   */
  getTriggerExecutionHistory(triggerId: string, limit?: number): Promise<TriggerExecutionRecord[]>;

  /**
   * 获取触发器事件历史
   * 
   * @param triggerId 触发器ID
   * @param limit 限制数量
   * @returns 事件历史
   */
  getTriggerEventHistory(triggerId: string, limit?: number): Promise<TriggerEvent[]>;

  /**
   * 获取触发器统计信息
   * 
   * @returns 统计信息
   */
  getTriggerStats(): TriggerStats;

  /**
   * 清理触发器执行历史
   * 
   * @param olderThan 清理早于此时间的记录
   * @returns 清理的记录数量
   */
  cleanupExecutionHistory(olderThan?: Date): Promise<number>;

  /**
   * 设置全局触发器配置
   * 
   * @param config 全局配置
   */
  setGlobalConfig(config: GlobalTriggerConfig): void;

  /**
   * 重置触发器系统
   */
  reset(): Promise<void>;

  /**
   * 销毁触发器系统，释放资源
   */
  destroy(): Promise<void>;
}

/**
 * 触发器接口
 */
export interface ITrigger {
  /**
   * 触发器ID
   */
  readonly triggerId: string;

  /**
   * 触发器类型
   */
  readonly triggerType: TriggerType;

  /**
   * 触发器名称
   */
  readonly name: string;

  /**
   * 触发器描述
   */
  readonly description: string;

  /**
   * 触发器版本
   */
  readonly version: string;

  /**
   * 是否启用
   */
  enabled: boolean;

  /**
   * 最后触发时间
   */
  lastTriggered?: Date;

  /**
   * 触发次数
   */
  triggerCount: number;

  /**
   * 评估触发器是否应该触发
   * 
   * @param state 当前状态
   * @param context 上下文信息
   * @returns 是否应该触发
   */
  evaluate(state: any, context?: Record<string, unknown>): Promise<boolean>;

  /**
   * 执行触发器动作
   * 
   * @param state 当前状态
   * @param context 上下文信息
   * @returns 执行结果
   */
  execute(state: any, context?: Record<string, unknown>): Promise<Record<string, unknown>>;

  /**
   * 获取触发器配置
   * 
   * @returns 触发器配置
   */
  getConfig(): Record<string, unknown>;

  /**
   * 设置触发器配置
   * 
   * @param config 触发器配置
   */
  setConfig(config: Record<string, unknown>): void;

  /**
   * 检查触发器是否启用
   * 
   * @returns 是否启用
   */
  isEnabled(): boolean;

  /**
   * 启用触发器
   */
  enable(): void;

  /**
   * 禁用触发器
   */
  disable(): void;

  /**
   * 创建触发器事件
   * 
   * @param data 事件数据
   * @param metadata 事件元数据
   * @returns 触发器事件
   */
  createEvent(data: Record<string, unknown>, metadata?: Record<string, unknown>): TriggerEvent;

  /**
   * 更新触发器信息
   */
  updateTriggerInfo(): void;

  /**
   * 验证触发器配置
   * 
   * @param config 触发器配置
   * @returns 验证结果
   */
  validateConfig(config: Record<string, unknown>): ValidationResult;

  /**
   * 初始化触发器
   * 
   * @param config 触发器配置
   * @returns 是否成功初始化
   */
  initialize(config: Record<string, unknown>): Promise<boolean>;

  /**
   * 清理触发器资源
   */
  cleanup(): Promise<void>;
}

/**
 * 已注册的触发器
 */
export interface RegisteredTrigger {
  triggerId: string;
  trigger: ITrigger;
  config: TriggerConfig;
  registeredAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  enabled: boolean;
}

/**
 * 触发器执行记录
 */
export interface TriggerExecutionRecord {
  triggerId: string;
  eventId: string;
  triggerType: TriggerType;
  state: any;
  context: Record<string, unknown>;
  result: TriggerExecutionResult;
  executedAt: Date;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 全局触发器配置
 */
export interface GlobalTriggerConfig {
  defaultTimeout: number;
  maxConcurrentTriggers: number;
  enableRetry: boolean;
  defaultRetryPolicy: RetryPolicy;
  enableMetrics: boolean;
  metricsRetentionDays: number;
  maxEventQueueSize: number;
  eventProcessingBatchSize: number;
  enableEventPersistence: boolean;
}