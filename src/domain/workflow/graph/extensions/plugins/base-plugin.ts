import { PluginContext } from './plugin-context';
import { PluginExecutionResult, PluginExecutionResultBuilder } from './plugin-execution-result';

/**
 * 基础插件抽象类
 * 
 * 所有插件都应该继承此类
 */
export abstract class BasePlugin {
  /**
   * 插件ID
   */
  private readonly id: string;

  /**
   * 插件名称
   */
  private readonly name: string;

  /**
   * 插件版本
   */
  private readonly version: string;

  /**
   * 插件描述
   */
  private readonly description: string;

  /**
   * 插件作者
   */
  private readonly author: string;

  /**
   * 插件是否启用
   */
  private enabled: boolean;

  /**
   * 插件优先级
   */
  private priority: number;

  /**
   * 插件元数据
   */
  private metadata: Record<string, unknown>;

  /**
   * 插件依赖
   */
  private dependencies: string[];

  /**
   * 插件配置
   */
  private config: Record<string, unknown>;

  /**
   * 插件初始化状态
   */
  private initialized: boolean;

  /**
   * 插件启动状态
   */
  private started: boolean;

  /**
   * 构造函数
   */
  constructor(
    id: string,
    name: string,
    version: string,
    description: string = '',
    author: string = ''
  ) {
    this.id = id;
    this.name = name;
    this.version = version;
    this.description = description;
    this.author = author;
    this.enabled = true;
    this.priority = 0;
    this.metadata = {};
    this.dependencies = [];
    this.config = {};
    this.initialized = false;
    this.started = false;
  }

  /**
   * 获取插件ID
   */
  public getId(): string {
    return this.id;
  }

  /**
   * 获取插件名称
   */
  public getName(): string {
    return this.name;
  }

  /**
   * 获取插件版本
   */
  public getVersion(): string {
    return this.version;
  }

  /**
   * 获取插件描述
   */
  public getDescription(): string {
    return this.description;
  }

  /**
   * 获取插件作者
   */
  public getAuthor(): string {
    return this.author;
  }

  /**
   * 检查插件是否启用
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 设置插件启用状态
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 获取插件优先级
   */
  public getPriority(): number {
    return this.priority;
  }

  /**
   * 设置插件优先级
   */
  public setPriority(priority: number): void {
    this.priority = priority;
  }

  /**
   * 获取插件元数据
   */
  public getMetadata(): Record<string, unknown> {
    return { ...this.metadata };
  }

  /**
   * 设置插件元数据
   */
  public setMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...metadata };
  }

  /**
   * 添加元数据
   */
  public addMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  /**
   * 获取插件依赖
   */
  public getDependencies(): string[] {
    return [...this.dependencies];
  }

  /**
   * 设置插件依赖
   */
  public setDependencies(dependencies: string[]): void {
    this.dependencies = [...dependencies];
  }

  /**
   * 添加依赖
   */
  public addDependency(dependency: string): void {
    if (!this.dependencies.includes(dependency)) {
      this.dependencies.push(dependency);
    }
  }

  /**
   * 移除依赖
   */
  public removeDependency(dependency: string): void {
    const index = this.dependencies.indexOf(dependency);
    if (index >= 0) {
      this.dependencies.splice(index, 1);
    }
  }

  /**
   * 获取插件配置
   */
  public getConfig(): Record<string, unknown> {
    return { ...this.config };
  }

  /**
   * 设置插件配置
   */
  public setConfig(config: Record<string, unknown>): void {
    this.config = { ...config };
  }

  /**
   * 获取配置项
   */
  public getConfigValue<T>(key: string, defaultValue?: T): T {
    const value = this.config[key] as T;
    return value !== undefined ? value : (defaultValue as T);
  }

  /**
   * 设置配置项
   */
  public setConfigValue(key: string, value: unknown): void {
    this.config[key] = value;
  }

  /**
   * 检查插件是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 检查插件是否已启动
   */
  public isStarted(): boolean {
    return this.started;
  }

  /**
   * 初始化插件
   */
  public async initialize(context: PluginContext): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.onInitialize(context);
      this.initialized = true;
    } catch (error) {
      throw new Error(`插件 ${this.id} 初始化失败: ${(error as Error).message}`);
    }
  }

  /**
   * 启动插件
   */
  public async start(context: PluginContext): Promise<void> {
    if (!this.initialized) {
      throw new Error(`插件 ${this.id} 未初始化`);
    }

    if (this.started) {
      return;
    }

    try {
      await this.onStart(context);
      this.started = true;
    } catch (error) {
      throw new Error(`插件 ${this.id} 启动失败: ${(error as Error).message}`);
    }
  }

  /**
   * 停止插件
   */
  public async stop(context: PluginContext): Promise<void> {
    if (!this.started) {
      return;
    }

    try {
      await this.onStop(context);
      this.started = false;
    } catch (error) {
      throw new Error(`插件 ${this.id} 停止失败: ${(error as Error).message}`);
    }
  }

  /**
   * 销毁插件
   */
  public async destroy(context: PluginContext): Promise<void> {
    if (this.started) {
      await this.stop(context);
    }

    if (!this.initialized) {
      return;
    }

    try {
      await this.onDestroy(context);
      this.initialized = false;
    } catch (error) {
      throw new Error(`插件 ${this.id} 销毁失败: ${(error as Error).message}`);
    }
  }

  /**
   * 执行插件
   */
  public async execute(context: PluginContext): Promise<PluginExecutionResult> {
    if (!this.enabled) {
      return PluginExecutionResultBuilder.skipped(this.id, '插件已禁用');
    }

    if (!this.initialized) {
      return PluginExecutionResultBuilder.failure(this.id, new Error('插件未初始化'));
    }

    if (!this.started) {
      return PluginExecutionResultBuilder.failure(this.id, new Error('插件未启动'));
    }

    const startTime = Date.now();

    try {
      const result = await this.onExecute(context);
      const executionTime = Date.now() - startTime;
      return PluginExecutionResultBuilder.success(this.id, result, executionTime);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return PluginExecutionResultBuilder.failure(this.id, error as Error, executionTime);
    }
  }

  /**
   * 检查插件是否应该执行
   */
  public shouldExecute(context: PluginContext): boolean {
    if (!this.enabled || !this.initialized || !this.started) {
      return false;
    }

    return this.onShouldExecute(context);
  }

  /**
   * 获取插件信息
   */
  public getInfo(): PluginInfo {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      author: this.author,
      enabled: this.enabled,
      priority: this.priority,
      metadata: { ...this.metadata },
      dependencies: [...this.dependencies],
      initialized: this.initialized,
      started: this.started
    };
  }

  /**
   * 获取插件状态
   */
  public getStatus(): PluginStatus {
    if (!this.initialized) {
      return PluginStatus.UNINITIALIZED;
    }

    if (!this.started) {
      return PluginStatus.STOPPED;
    }

    if (!this.enabled) {
      return PluginStatus.DISABLED;
    }

    return PluginStatus.RUNNING;
  }

  /**
   * 验证插件配置
   */
  public validateConfig(): boolean {
    return this.onValidateConfig();
  }

  /**
   * 子类实现的初始化方法
   */
  protected abstract onInitialize(context: PluginContext): Promise<void>;

  /**
   * 子类实现的启动方法
   */
  protected abstract onStart(context: PluginContext): Promise<void>;

  /**
   * 子类实现的停止方法
   */
  protected abstract onStop(context: PluginContext): Promise<void>;

  /**
   * 子类实现的销毁方法
   */
  protected abstract onDestroy(context: PluginContext): Promise<void>;

  /**
   * 子类实现的执行方法
   */
  protected abstract onExecute(context: PluginContext): Promise<any>;

  /**
   * 子类实现的执行条件检查方法
   */
  protected onShouldExecute(context: PluginContext): boolean {
    return true;
  }

  /**
   * 子类实现的配置验证方法
   */
  protected onValidateConfig(): boolean {
    return true;
  }

  /**
   * 比较插件优先级
   */
  public static compareByPriority(a: BasePlugin, b: BasePlugin): number {
    return b.getPriority() - a.getPriority();
  }

  /**
   * 比较插件ID
   */
  public static compareById(a: BasePlugin, b: BasePlugin): number {
    return a.getId().localeCompare(b.getId());
  }

  /**
   * 比较插件名称
   */
  public static compareByName(a: BasePlugin, b: BasePlugin): number {
    return a.getName().localeCompare(b.getName());
  }
}

/**
 * 插件信息接口
 */
export interface PluginInfo {
  /**
   * 插件ID
   */
  id: string;

  /**
   * 插件名称
   */
  name: string;

  /**
   * 插件版本
   */
  version: string;

  /**
   * 插件描述
   */
  description: string;

  /**
   * 插件作者
   */
  author: string;

  /**
   * 是否启用
   */
  enabled: boolean;

  /**
   * 优先级
   */
  priority: number;

  /**
   * 元数据
   */
  metadata: Record<string, unknown>;

  /**
   * 依赖
   */
  dependencies: string[];

  /**
   * 是否已初始化
   */
  initialized: boolean;

  /**
   * 是否已启动
   */
  started: boolean;
}

/**
 * 插件状态枚举
 */
export enum PluginStatus {
  /**
   * 未初始化
   */
  UNINITIALIZED = 'uninitialized',

  /**
   * 已停止
   */
  STOPPED = 'stopped',

  /**
   * 运行中
   */
  RUNNING = 'running',

  /**
   * 已禁用
   */
  DISABLED = 'disabled',

  /**
   * 错误状态
   */
  ERROR = 'error'
}