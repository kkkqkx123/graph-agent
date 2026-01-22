import {
  IWorkflowFunction,
  FunctionParameter,
  ValidationResult,
  FunctionMetadata,
  WorkflowExecutionContext,
  ConditionFunctionConfig,
} from '../types';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/function-type';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';

/**
 * 条件函数基类
 * 专门用于条件类型的函数，返回 boolean
 *
 * 支持配置加载：
 * - 通过构造函数注入配置管理器
 * - 支持从配置文件加载基础配置
 * - 支持运行时配置覆盖
 */
export abstract class BaseConditionFunction<
  TConfig extends ConditionFunctionConfig = ConditionFunctionConfig,
> implements IWorkflowFunction {
  public readonly metadata?: Record<string, any>;
  /** 函数类型标识 */
  public readonly type: WorkflowFunctionType = WorkflowFunctionType.CONDITION;

  /** 配置管理器 */
  protected configManager: IConfigManager;
  /** 基础配置（从配置文件加载） */
  protected baseConfig: Record<string, any> = {};

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    configManager: IConfigManager,
    public readonly version: string = '1.0.0',
    public readonly category: string = 'builtin',
    metadata?: Record<string, any>
  ) {
    this.metadata = metadata;
    this.configManager = configManager;
    this.loadBaseConfig();
  }

  /**
   * 加载基础配置
   * 从配置文件中加载函数的基础配置
   */
  protected loadBaseConfig(): void {
    // 使用函数类名作为配置路径
    const configPath = `functions.${this.constructor.name}`;
    this.baseConfig = this.configManager.get(configPath, {});
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
        type: 'ConditionFunctionConfig',
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
