import { BaseWorkflowFunction, WorkflowExecutionContext, ValidationResult, FunctionParameter } from '../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';
import { CompositionStrategy } from './composition-strategy';
import {
  CompositeFunctionType,
  validateSameFunctionType,
  getCompositeReturnType,
  getWorkflowFunctionType
} from './composition-types';

/**
 * 组合函数基类
 * 提供类型安全的函数组合功能，确保只能组合相同类型的函数
 */
export abstract class BaseCompositeFunction<TConfig = any> extends BaseWorkflowFunction {
  protected functions: BaseWorkflowFunction[] = [];
  protected compositionStrategy: CompositionStrategy;
  public readonly compositeType: CompositeFunctionType;

  constructor(
    id: string,
    name: string,
    description: string,
    compositeType: CompositeFunctionType,
    strategy: CompositionStrategy,
    version: string = '1.0.0',
    category: string = 'composite'
  ) {
    const workflowFunctionType = getWorkflowFunctionType(compositeType);
    super(
      id,
      name,
      description,
      version,
      workflowFunctionType,
      true,
      category
    );
    this.compositeType = compositeType;
    this.compositionStrategy = strategy;
  }

  /**
   * 获取期望的函数类型
   * 子类必须实现此方法以指定组合的函数类型
   */
  protected abstract getExpectedFunctionType(): WorkflowFunctionType;

  /**
   * 添加函数到组合
   * @param func 工作流函数
   * @throws Error 如果函数类型不匹配
   */
  addFunction(func: BaseWorkflowFunction): void {
    const expectedType = this.getExpectedFunctionType();
    if (func.type !== expectedType) {
      throw new Error(
        `无法添加函数 ${func.name}：类型 ${func.type} 与期望类型 ${expectedType} 不匹配`
      );
    }
    this.functions.push(func);
  }

  /**
   * 移除函数
   * @param func 工作流函数
   * @returns 是否成功移除
   */
  removeFunction(func: BaseWorkflowFunction): boolean {
    const index = this.functions.indexOf(func);
    if (index > -1) {
      this.functions.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 获取组合中的所有函数
   * @returns 函数列表
   */
  getFunctions(): BaseWorkflowFunction[] {
    return [...this.functions];
  }

  /**
   * 设置组合策略
   * @param strategy 组合策略
   */
  setCompositionStrategy(strategy: CompositionStrategy): void {
    this.compositionStrategy = strategy;
  }

  /**
   * 获取组合策略
   * @returns 组合策略
   */
  getCompositionStrategy(): CompositionStrategy {
    return this.compositionStrategy;
  }

  /**
   * 验证函数组合
   * @returns 验证结果
   */
  protected validateComposition(): ValidationResult {
    return validateSameFunctionType(this.functions);
  }

  /**
   * 执行组合函数
   * @param context 执行上下文
   * @param config 配置对象
   * @returns 执行结果
   */
  override async execute(context: WorkflowExecutionContext, config: TConfig): Promise<any> {
    this.checkInitialized();

    // 验证函数组合
    const validation = this.validateComposition();
    if (!validation.valid) {
      throw new Error(`函数组合验证失败: ${validation.errors.join(', ')}`);
    }

    // 验证策略
    const strategyValidation = this.compositionStrategy.validate(this.functions);
    if (!strategyValidation.valid) {
      throw new Error(`组合策略验证失败: ${strategyValidation.errors.join(', ')}`);
    }

    return await this.compositionStrategy.execute(this.functions, context, config);
  }

  /**
   * 获取组合函数的参数
   * @returns 参数列表
   */
  override getParameters(): FunctionParameter[] {
    const parameters: FunctionParameter[] = [];

    // 合并所有子函数的参数
    for (const func of this.functions) {
      parameters.push(...func.getParameters());
    }

    // 去重处理
    return this.deduplicateParameters(parameters);
  }

  /**
   * 获取返回类型
   * @returns 返回类型字符串
   */
  override getReturnType(): string {
    return getCompositeReturnType(this.compositeType);
  }

  /**
   * 验证配置
   * @param config 配置对象
   * @returns 验证结果
   */
  override validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    // 基础验证
    if (config && typeof config !== 'object') {
      errors.push('配置必须是对象类型');
    }

    // 验证所有子函数的配置
    for (const func of this.functions) {
      const funcValidation = func.validateConfig(config);
      if (!funcValidation.valid) {
        errors.push(`函数 ${func.name} 配置验证失败: ${funcValidation.errors.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 去重参数
   * @param parameters 参数列表
   * @returns 去重后的参数列表
   */
  private deduplicateParameters(parameters: FunctionParameter[]): FunctionParameter[] {
    const seen = new Set<string>();
    const result: FunctionParameter[] = [];

    for (const param of parameters) {
      const key = `${param.name}:${param.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(param);
      }
    }

    return result;
  }

  /**
   * 获取元数据
   * @returns 函数元数据
   */
  override getMetadata() {
    const metadata = super.getMetadata();
    return {
      ...metadata,
      composite: true,
      compositeType: this.compositeType,
      functionCount: this.functions.length,
      strategy: this.compositionStrategy.constructor.name
    };
  }
}