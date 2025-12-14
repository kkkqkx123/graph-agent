import { ID } from '../../common/value-objects/id';

/**
 * 插件类型枚举
 */
export enum PluginType {
  START = 'start',
  END = 'end',
  NODE = 'node',
  EDGE = 'edge',
  WORKFLOW = 'workflow',
  EXECUTION = 'execution',
  MONITORING = 'monitoring',
  CUSTOM = 'custom'
}

/**
 * 插件状态枚举
 */
export enum PluginStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  ERROR = 'error',
  DISABLED = 'disabled',
  LOADING = 'loading',
  UNLOADING = 'unloading'
}

/**
 * 插件上下文
 */
export interface PluginContext {
  workflowId: ID;
  threadId?: string;
  sessionId?: string;
  executionStartTime?: Date;
  nodeId?: string;
  edgeId?: string;
  state?: any;
  metadata: Record<string, unknown>;
}

/**
 * 插件执行结果
 */
export interface PluginExecutionResult {
  pluginId: string;
  status: PluginStatus;
  success: boolean;
  result?: any;
  error?: Error;
  executionTime: number;
  memoryUsage?: number;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * 插件配置
 */
export interface PluginConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  maxMemoryUsage?: number;
  retryPolicy?: RetryPolicy;
  dependencies?: string[];
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
 * 插件依赖
 */
export interface PluginDependency {
  pluginId: string;
  version: string;
  optional: boolean;
}

/**
 * 插件元数据
 */
export interface PluginMetadata {
  pluginId: string;
  name: string;
  description: string;
  version: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
  pluginType: PluginType;
  supportedVersions: string[];
  dependencies: PluginDependency[];
  minSystemVersion: string;
}

/**
 * 插件统计信息
 */
export interface PluginStats {
  totalPlugins: number;
  activePlugins: number;
  errorPlugins: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  memoryUsage: number;
  executionsByPluginType: Map<PluginType, number>;
}

/**
 * 插件系统接口
 * 
 * 负责管理和执行图执行过程中的各种插件
 */
export interface IPluginSystem {
  /**
   * 注册插件
   * 
   * @param plugin 插件实例
   * @param config 插件配置
   * @returns 是否成功注册
   */
  registerPlugin(plugin: IPlugin, config?: PluginConfig): Promise<boolean>;

  /**
   * 注销插件
   * 
   * @param pluginId 插件ID
   * @returns 是否成功注销
   */
  unregisterPlugin(pluginId: string): Promise<boolean>;

  /**
   * 执行插件
   * 
   * @param pluginType 插件类型
   * @param context 插件上下文
   * @returns 执行结果列表
   */
  executePlugins(pluginType: PluginType, context: PluginContext): Promise<PluginExecutionResult[]>;

  /**
   * 执行特定插件
   * 
   * @param pluginId 插件ID
   * @param context 插件上下文
   * @returns 执行结果
   */
  executePlugin(pluginId: string, context: PluginContext): Promise<PluginExecutionResult>;

  /**
   * 异步执行插件
   * 
   * @param pluginType 插件类型
   * @param context 插件上下文
   * @returns 执行结果列表
   */
  executePluginsAsync(pluginType: PluginType, context: PluginContext): Promise<PluginExecutionResult[]>;

  /**
   * 获取插件列表
   * 
   * @param pluginType 插件类型
   * @param status 插件状态
   * @returns 插件列表
   */
  getPlugins(pluginType?: PluginType, status?: PluginStatus): RegisteredPlugin[];

  /**
   * 获取插件
   * 
   * @param pluginId 插件ID
   * @returns 插件实例
   */
  getPlugin(pluginId: string): IPlugin | null;

  /**
   * 获取插件配置
   * 
   * @param pluginId 插件ID
   * @returns 插件配置
   */
  getPluginConfig(pluginId: string): PluginConfig | null;

  /**
   * 更新插件配置
   * 
   * @param pluginId 插件ID
   * @param config 新配置
   * @returns 是否成功更新
   */
  updatePluginConfig(pluginId: string, config: Partial<PluginConfig>): Promise<boolean>;

  /**
   * 启用插件
   * 
   * @param pluginId 插件ID
   * @returns 是否成功启用
   */
  enablePlugin(pluginId: string): Promise<boolean>;

  /**
   * 禁用插件
   * 
   * @param pluginId 插件ID
   * @returns 是否成功禁用
   */
  disablePlugin(pluginId: string): Promise<boolean>;

  /**
   * 加载插件
   * 
   * @param pluginPath 插件路径
   * @returns 是否成功加载
   */
  loadPlugin(pluginPath: string): Promise<boolean>;

  /**
   * 卸载插件
   * 
   * @param pluginId 插件ID
   * @returns 是否成功卸载
   */
  unloadPlugin(pluginId: string): Promise<boolean>;

  /**
   * 检查插件依赖
   * 
   * @param pluginId 插件ID
   * @returns 依赖检查结果
   */
  checkDependencies(pluginId: string): Promise<DependencyCheckResult>;

  /**
   * 解析插件依赖
   * 
   * @param pluginId 插件ID
   * @returns 是否成功解析
   */
  resolveDependencies(pluginId: string): Promise<boolean>;

  /**
   * 获取插件执行历史
   * 
   * @param pluginId 插件ID
   * @param limit 限制数量
   * @returns 执行历史
   */
  getPluginExecutionHistory(pluginId: string, limit?: number): Promise<PluginExecutionRecord[]>;

  /**
   * 获取插件统计信息
   * 
   * @returns 统计信息
   */
  getPluginStats(): PluginStats;

  /**
   * 清理插件执行历史
   * 
   * @param olderThan 清理早于此时间的记录
   * @returns 清理的记录数量
   */
  cleanupExecutionHistory(olderThan?: Date): Promise<number>;

  /**
   * 设置全局插件配置
   * 
   * @param config 全局配置
   */
  setGlobalConfig(config: GlobalPluginConfig): void;

  /**
   * 重置插件系统
   */
  reset(): Promise<void>;

  /**
   * 销毁插件系统，释放资源
   */
  destroy(): Promise<void>;
}

/**
 * 插件接口
 */
export interface IPlugin {
  /**
   * 插件ID
   */
  readonly pluginId: string;

  /**
   * 插件类型
   */
  readonly pluginType: PluginType;

  /**
   * 插件版本
   */
  readonly version: string;

  /**
   * 插件描述
   */
  readonly description: string;

  /**
   * 插件状态
   */
  status: PluginStatus;

  /**
   * 插件元数据
   */
  readonly metadata: PluginMetadata;

  /**
   * 初始化插件
   * 
   * @param config 插件配置
   * @returns 是否成功初始化
   */
  initialize(config: PluginConfig): Promise<boolean>;

  /**
   * 执行插件
   * 
   * @param context 插件上下文
   * @returns 执行结果
   */
  execute(context: PluginContext): Promise<PluginExecutionResult>;

  /**
   * 验证插件配置
   * 
   * @param config 插件配置
   * @returns 验证结果
   */
  validateConfig(config: PluginConfig): ValidationResult;

  /**
   * 清理插件资源
   */
  cleanup(): Promise<void>;

  /**
   * 获取插件信息
   * 
   * @returns 插件信息
   */
  getPluginInfo(): PluginInfo;

  /**
   * 设置插件状态
   * 
   * @param status 插件状态
   */
  setPluginStatus(status: PluginStatus): void;
}

/**
 * 已注册的插件
 */
export interface RegisteredPlugin {
  pluginId: string;
  plugin: IPlugin;
  config: PluginConfig;
  registeredAt: Date;
  lastExecuted?: Date;
  executionCount: number;
  status: PluginStatus;
}

/**
 * 插件执行记录
 */
export interface PluginExecutionRecord {
  pluginId: string;
  pluginType: PluginType;
  context: PluginContext;
  result: PluginExecutionResult;
  executedAt: Date;
}

/**
 * 依赖检查结果
 */
export interface DependencyCheckResult {
  satisfied: boolean;
  missingDependencies: string[];
  conflictingDependencies: string[];
  versionConflicts: VersionConflict[];
}

/**
 * 版本冲突
 */
export interface VersionConflict {
  dependency: string;
  requiredVersion: string;
  installedVersion: string;
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
 * 插件信息
 */
export interface PluginInfo {
  pluginId: string;
  name: string;
  description: string;
  version: string;
  author: string;
  license: string;
  pluginType: PluginType;
  status: PluginStatus;
  dependencies: PluginDependency[];
  lastExecuted?: Date;
  executionCount: number;
  averageExecutionTime: number;
  memoryUsage: number;
}

/**
 * 全局插件配置
 */
export interface GlobalPluginConfig {
  defaultTimeout: number;
  maxConcurrentPlugins: number;
  maxMemoryUsage: number;
  enableRetry: boolean;
  defaultRetryPolicy: RetryPolicy;
  enableMetrics: boolean;
  metricsRetentionDays: number;
  pluginDirectory: string;
  autoLoadPlugins: boolean;
  enableHotReload: boolean;
}