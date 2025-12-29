import {
  IWorkflowFunction,
  FunctionParameter,
  ValidationResult,
  FunctionMetadata,
  WorkflowExecutionContext,
  NodeFunctionConfig,
  NodeFunctionResult
} from '../types';

/**
 * 钩子函数基类
 * 专门用于钩子类型的函数，返回 NodeFunctionResult
 */
export abstract class BaseHookFunction<TConfig extends NodeFunctionConfig = NodeFunctionConfig>
  implements IWorkflowFunction {
  protected _initialized: boolean = false;
  public readonly metadata?: Record<string, any>;

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

  getParameters(): FunctionParameter[] {
    return [
      {
        name: 'context',
        type: 'WorkflowExecutionContext',
        required: true,
        description: '执行上下文'
      },
      {
        name: 'config',
        type: 'NodeFunctionConfig',
        required: false,
        description: '函数配置',
        defaultValue: {}
      }
    ];
  }

  getReturnType(): string {
    return 'NodeFunctionResult';
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
      errors
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
      returnType: this.getReturnType()
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
  abstract execute(context: WorkflowExecutionContext, config: TConfig): Promise<NodeFunctionResult>;

  /**
   * 验证参数
   */
  validateParameters(...args: any[]): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }
}