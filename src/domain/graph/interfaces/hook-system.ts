import { ID } from '../../common/value-objects/id';

/**
 * 钩子点枚举
 */
export enum HookPoint {
  BEFORE_EXECUTE = 'before_execute',
  AFTER_EXECUTE = 'after_execute',
  ON_ERROR = 'on_error',
  BEFORE_COMPILE = 'before_compile',
  AFTER_COMPILE = 'after_compile',
  BEFORE_NODE_EXECUTE = 'before_node_execute',
  AFTER_NODE_EXECUTE = 'after_node_execute',
  ON_NODE_ERROR = 'on_node_error',
  BEFORE_EDGE_TRAVERSE = 'before_edge_traverse',
  AFTER_EDGE_TRAVERSE = 'after_edge_traverse',
  ON_STATE_CHANGE = 'on_state_change',
  ON_CHECKPOINT = 'on_checkpoint',
  ON_RESTORE = 'on_restore'
}

/**
 * 钩子上下文
 */
export interface HookContext {
  hookPoint: HookPoint;
  graphId?: ID;
  nodeId?: string;
  edgeId?: string;
  state?: any;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  error?: Error;
  timestamp: Date;
}

/**
 * 钩子执行结果
 */
export interface HookExecutionResult {
  hookId: string;
  success: boolean;
  result?: any;
  error?: Error;
  executionTime: number;
  shouldContinue: boolean;
  shouldRetry: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * 钩子配置
 */
export interface HookConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  retryPolicy?: RetryPolicy;
  conditions?: HookCondition[];
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
 * 钩子条件
 */
export interface HookCondition {
  type: 'graph' | 'node' | 'edge' | 'state' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  property: string;
  value: any;
}

/**
 * 钩子统计信息
 */
export interface HookStats {
  totalHooks: number;
  enabledHooks: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  executionsByHookPoint: Map<HookPoint, number>;
}

/**
 * 钩子系统接口
 * 
 * 负责管理和执行图执行过程中的各种钩子
 */
export interface IHookSystem {
  /**
   * 注册钩子
   * 
   * @param hookPoint 钩子点
   * @param hook 钩子实例
   * @param config 钩子配置
   * @returns 钩子ID
   */
  registerHook(hookPoint: HookPoint, hook: IHook, config?: HookConfig): string;

  /**
   * 注销钩子
   * 
   * @param hookPoint 钩子点
   * @param hookId 钩子ID
   * @returns 是否成功注销
   */
  unregisterHook(hookPoint: HookPoint, hookId: string): boolean;

  /**
   * 执行钩子
   * 
   * @param hookPoint 钩子点
   * @param context 钩子上下文
   * @returns 执行结果列表
   */
  executeHooks(hookPoint: HookPoint, context: HookContext): Promise<HookExecutionResult[]>;

  /**
   * 异步执行钩子
   * 
   * @param hookPoint 钩子点
   * @param context 钩子上下文
   * @returns 执行结果列表
   */
  executeHooksAsync(hookPoint: HookPoint, context: HookContext): Promise<HookExecutionResult[]>;

  /**
   * 获取钩子列表
   * 
   * @param hookPoint 钩子点
   * @returns 钩子列表
   */
  getHooks(hookPoint?: HookPoint): RegisteredHook[];

  /**
   * 获取钩子配置
   * 
   * @param hookId 钩子ID
   * @returns 钩子配置
   */
  getHookConfig(hookId: string): HookConfig | null;

  /**
   * 更新钩子配置
   * 
   * @param hookId 钩子ID
   * @param config 新配置
   * @returns 是否成功更新
   */
  updateHookConfig(hookId: string, config: Partial<HookConfig>): boolean;

  /**
   * 启用钩子
   * 
   * @param hookId 钩子ID
   * @returns 是否成功启用
   */
  enableHook(hookId: string): boolean;

  /**
   * 禁用钩子
   * 
   * @param hookId 钩子ID
   * @returns 是否成功禁用
   */
  disableHook(hookId: string): boolean;

  /**
   * 检查钩子是否应该执行
   * 
   * @param hookId 钩子ID
   * @param context 钩子上下文
   * @returns 是否应该执行
   */
  shouldExecuteHook(hookId: string, context: HookContext): boolean;

  /**
   * 获取钩子执行历史
   * 
   * @param hookId 钩子ID
   * @param limit 限制数量
   * @returns 执行历史
   */
  getHookExecutionHistory(hookId: string, limit?: number): Promise<HookExecutionRecord[]>;

  /**
   * 获取钩子统计信息
   * 
   * @returns 统计信息
   */
  getHookStats(): HookStats;

  /**
   * 清理钩子执行历史
   * 
   * @param olderThan 清理早于此时间的记录
   * @returns 清理的记录数量
   */
  cleanupExecutionHistory(olderThan?: Date): Promise<number>;

  /**
   * 设置全局钩子配置
   * 
   * @param config 全局配置
   */
  setGlobalConfig(config: GlobalHookConfig): void;

  /**
   * 重置钩子系统
   */
  reset(): void;

  /**
   * 销毁钩子系统，释放资源
   */
  destroy(): Promise<void>;
}

/**
 * 钩子接口
 */
export interface IHook {
  /**
   * 钩子ID
   */
  readonly hookId: string;

  /**
   * 钩子名称
   */
  readonly name: string;

  /**
   * 钩子描述
   */
  readonly description: string;

  /**
   * 钩子版本
   */
  readonly version: string;

  /**
   * 支持的钩子点
   */
  readonly supportedHookPoints: HookPoint[];

  /**
   * 执行钩子
   * 
   * @param context 钩子上下文
   * @returns 执行结果
   */
  execute(context: HookContext): Promise<HookExecutionResult>;

  /**
   * 验证钩子配置
   * 
   * @param config 钩子配置
   * @returns 验证结果
   */
  validateConfig(config: HookConfig): ValidationResult;

  /**
   * 初始化钩子
   * 
   * @param config 钩子配置
   * @returns 是否成功初始化
   */
  initialize(config: HookConfig): Promise<boolean>;

  /**
   * 清理钩子资源
   */
  cleanup(): Promise<void>;
}

/**
 * 已注册的钩子
 */
export interface RegisteredHook {
  hookId: string;
  hook: IHook;
  hookPoint: HookPoint;
  config: HookConfig;
  registeredAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

/**
 * 钩子执行记录
 */
export interface HookExecutionRecord {
  hookId: string;
  hookPoint: HookPoint;
  context: HookContext;
  result: HookExecutionResult;
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
 * 全局钩子配置
 */
export interface GlobalHookConfig {
  defaultTimeout: number;
  maxConcurrentHooks: number;
  enableRetry: boolean;
  defaultRetryPolicy: RetryPolicy;
  enableMetrics: boolean;
  metricsRetentionDays: number;
}