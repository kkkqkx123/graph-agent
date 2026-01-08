import {
  IWorkflowFunction,
  FunctionParameter,
  ValidationResult,
  FunctionMetadata,
  WorkflowExecutionContext,
  RoutingFunctionConfig,
} from '../types';
import { WorkflowFunctionType } from '../../../domain/workflow/value-objects/function-type';
import { ConfigLoadingModule } from '../../../config/loading/config-loading-module';

/**
 * 条件路由函数基类
 * 用于条件判断型路由函数，返回 boolean
 *
 * 支持配置加载：
 * - 可以通过 setConfigLoader() 注入配置加载器
 * - 支持从配置文件加载基础配置
 * - 支持运行时配置覆盖
 */
export abstract class BaseConditionRoutingFunction<
  TConfig extends RoutingFunctionConfig = RoutingFunctionConfig,
> implements IWorkflowFunction {
  protected _initialized: boolean = false;
  public readonly metadata?: Record<string, any>;
  /** 函数类型标识 */
  public readonly type: WorkflowFunctionType = WorkflowFunctionType.ROUTING;

  /** 配置加载器 */
  protected configLoader?: ConfigLoadingModule;
  /** 基础配置（从配置文件加载） */
  protected baseConfig: Record<string, any> = {};

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly version: string = '1.0.0',
    public readonly category: string = 'builtin',
    metadata?: Record<string, any>
  ) {
    this.metadata = metadata;
  }

  /**
   * 设置配置加载器
   * @param loader 配置加载器实例
   */
  setConfigLoader(loader: ConfigLoadingModule): void {
    this.configLoader = loader;
    this.loadBaseConfig();
  }

  /**
   * 加载基础配置
   * 从配置文件中加载函数的基础配置
   */
  protected loadBaseConfig(): void {
    if (!this.configLoader) return;

    // 使用函数类名作为配置路径
    const configPath = `functions.${this.constructor.name}`;
    this.baseConfig = this.configLoader.get(configPath, {});
  }

  /**
   * 获取配置
   * 合并基础配置和运行时配置
   * @param runtimeConfig 运行时配置
   * @returns 合并后的配置
   */
  protected getConfig<T = any>(runtimeConfig?: Record<string, any>): T {
    return { ...this.baseConfig, ...runtimeConfig } as T;
  }

  getParameters(): FunctionParameter[] {
    return [
      {
        name: 'context',
        type: 'WorkflowExecutionContext',
        required: true,
        description: '执行上下文',
      },
      {
        name: 'config',
        type: 'RoutingFunctionConfig',
        required: false,
        description: '函数配置',
        defaultValue: {},
      },
    ];
  }

  getReturnType(): string {
    return 'boolean';
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    // 基础验证
    if (config && typeof config !== 'object') {
      errors.push('配置必须是对象类型');
    }

    // 子类可以重写此方法进行特定验证
    const customErrors = this.validateCustomConfig(config);
    errors.push(...customErrors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getMetadata(): FunctionMetadata {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      isAsync: true,
      category: this.category,
      parameters: this.getParameters(),
      returnType: this.getReturnType(),
    };
  }

  /**
   * 子类可以重写此方法进行自定义配置验证
   */
  protected validateCustomConfig(config: any): string[] {
    return [];
  }

  /**
   * 初始化函数
   */
  initialize(config?: any): boolean {
    this._initialized = true;
    return true;
  }

  /**
   * 清理函数资源
   */
  cleanup(): boolean {
    this._initialized = false;
    return true;
  }

  /**
   * 检查函数是否已初始化
   */
  protected checkInitialized(): void {
    if (!this._initialized) {
      throw new Error(`函数 ${this.name} 尚未初始化`);
    }
  }

  /**
   * 执行函数（抽象方法，子类必须实现）
   * 使用类型安全的参数
   */
  abstract execute(context: WorkflowExecutionContext, config: TConfig): Promise<boolean>;

  /**
   * 验证参数
   */
  validateParameters(...args: any[]): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }
}

/**
 * 目标路由函数基类
 * 用于目标选择型路由函数，返回目标节点 ID
 *
 * 支持配置加载：
 * - 可以通过 setConfigLoader() 注入配置加载器
 * - 支持从配置文件加载基础配置
 * - 支持运行时配置覆盖
 */
export abstract class BaseTargetRoutingFunction<
  TConfig extends RoutingFunctionConfig = RoutingFunctionConfig,
> implements IWorkflowFunction {
  protected _initialized: boolean = false;
  public readonly metadata?: Record<string, any>;
  /** 函数类型标识 */
  public readonly type: WorkflowFunctionType = WorkflowFunctionType.ROUTING;

  /** 配置加载器 */
  protected configLoader?: ConfigLoadingModule;
  /** 基础配置（从配置文件加载） */
  protected baseConfig: Record<string, any> = {};

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly version: string = '1.0.0',
    public readonly category: string = 'builtin',
    metadata?: Record<string, any>
  ) {
    this.metadata = metadata;
  }

  /**
   * 设置配置加载器
   * @param loader 配置加载器实例
   */
  setConfigLoader(loader: ConfigLoadingModule): void {
    this.configLoader = loader;
    this.loadBaseConfig();
  }

  /**
   * 加载基础配置
   * 从配置文件中加载函数的基础配置
   */
  protected loadBaseConfig(): void {
    if (!this.configLoader) return;

    // 使用函数类名作为配置路径
    const configPath = `functions.${this.constructor.name}`;
    this.baseConfig = this.configLoader.get(configPath, {});
  }

  /**
   * 获取配置
   * 合并基础配置和运行时配置
   * @param runtimeConfig 运行时配置
   * @returns 合并后的配置
   */
  protected getConfig<T = any>(runtimeConfig?: Record<string, any>): T {
    return { ...this.baseConfig, ...runtimeConfig } as T;
  }

  getParameters(): FunctionParameter[] {
    return [
      {
        name: 'context',
        type: 'WorkflowExecutionContext',
        required: true,
        description: '执行上下文',
      },
      {
        name: 'config',
        type: 'RoutingFunctionConfig',
        required: false,
        description: '函数配置',
        defaultValue: {},
      },
    ];
  }

  getReturnType(): string {
    return 'string | string[]';
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    // 基础验证
    if (config && typeof config !== 'object') {
      errors.push('配置必须是对象类型');
    }

    // 子类可以重写此方法进行特定验证
    const customErrors = this.validateCustomConfig(config);
    errors.push(...customErrors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getMetadata(): FunctionMetadata {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      isAsync: true,
      category: this.category,
      parameters: this.getParameters(),
      returnType: this.getReturnType(),
    };
  }

  /**
   * 子类可以重写此方法进行自定义配置验证
   */
  protected validateCustomConfig(config: any): string[] {
    return [];
  }

  /**
   * 初始化函数
   */
  initialize(config?: any): boolean {
    this._initialized = true;
    return true;
  }

  /**
   * 清理函数资源
   */
  cleanup(): boolean {
    this._initialized = false;
    return true;
  }

  /**
   * 检查函数是否已初始化
   */
  protected checkInitialized(): void {
    if (!this._initialized) {
      throw new Error(`函数 ${this.name} 尚未初始化`);
    }
  }

  /**
   * 执行函数（抽象方法，子类必须实现）
   * 使用类型安全的参数
   */
  abstract execute(context: WorkflowExecutionContext, config: TConfig): Promise<string | string[]>;

  /**
   * 验证参数
   */
  validateParameters(...args: any[]): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }
}
