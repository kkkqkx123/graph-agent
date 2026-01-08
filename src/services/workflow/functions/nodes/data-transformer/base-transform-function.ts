import {
  IWorkflowFunction,
  FunctionParameter,
  ValidationResult,
  FunctionMetadata,
  WorkflowExecutionContext,
} from '../../types';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/function-type';

// 重新导出以供子类使用
export type { WorkflowExecutionContext };

/**
 * 转换函数配置接口
 */
export interface TransformFunctionConfig {
  sourceData: any[];
  config: Record<string, unknown>;
}

/**
 * 转换函数基类
 * 专门用于数据转换类型的函数
 */
export abstract class BaseTransformFunction<
  TConfig extends TransformFunctionConfig = TransformFunctionConfig,
> implements IWorkflowFunction {
  protected _initialized: boolean = false;
  /** 函数类型标识 */
  public readonly type: WorkflowFunctionType = WorkflowFunctionType.DATA_TRANSFORM;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly version: string = '1.0.0',
    public readonly category: string = 'transform'
  ) { }

  getParameters(): FunctionParameter[] {
    return [
      {
        name: 'sourceData',
        type: 'array',
        required: true,
        description: '源数据数组',
      },
      {
        name: 'config',
        type: 'object',
        required: false,
        description: '转换配置',
        defaultValue: {},
      },
    ];
  }

  getReturnType(): string {
    return 'any';
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push('配置必须是对象类型');
    }

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
      isAsync: false,
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
   * 执行转换（抽象方法，子类必须实现）
   */
  abstract execute(context: WorkflowExecutionContext, config: TConfig): Promise<any>;

  /**
   * 验证参数
   */
  validateParameters(...args: any[]): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }
}
