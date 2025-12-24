import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 函数参数接口
 */
export interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 函数元数据接口
 */
export interface FunctionMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  type: WorkflowFunctionType;
  isAsync: boolean;
  category: string;
  parameters: FunctionParameter[];
  returnType: string;
}

/**
 * 工作流函数接口
 */
export interface IWorkflowFunction {
  id: string;
  name: string;
  type: WorkflowFunctionType;
  description?: string;
  version: string;
  getParameters(): FunctionParameter[];
  getReturnType(): string;
  validateConfig(config: any): ValidationResult;
  getMetadata(): FunctionMetadata;
  initialize(config?: any): boolean;
  cleanup(): boolean;
}

/**
 * 工作流函数基础抽象类
 *
 * 提供通用实现，减少重复代码
 */
export abstract class BaseWorkflowFunction implements IWorkflowFunction {
  protected _initialized: boolean = false;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly version: string,
    public readonly type: WorkflowFunctionType,
    public readonly isAsync: boolean,
    public readonly category: string = 'builtin'
  ) { }

  getParameters(): FunctionParameter[] {
    return [
      {
        name: 'context',
        type: 'IExecutionContext',
        required: true,
        description: '执行上下文'
      },
      {
        name: 'config',
        type: 'any',
        required: false,
        description: '函数配置',
        defaultValue: {}
      }
    ];
  }

  getReturnType(): string {
    switch (this.type) {
      case WorkflowFunctionType.CONDITION:
      case WorkflowFunctionType.TRIGGER:
        return 'boolean';
      case WorkflowFunctionType.ROUTING:
        return 'string | null';
      case WorkflowFunctionType.NODE:
        return 'any';
      default:
        return 'any';
    }
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
      type: this.type,
      isAsync: this.isAsync,
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
}