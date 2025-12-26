import { BaseWorkflowFunction, FunctionParameter, ValidationResult } from '../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';
import { CompositionStrategy } from './composition-strategy';

/**
 * 组合函数
 * 支持将多个函数组合成一个复合函数
 */
export class CompositeFunction extends BaseWorkflowFunction {
  private functions: BaseWorkflowFunction[] = [];
  private compositionStrategy: CompositionStrategy;

  constructor(
    id: string,
    name: string,
    description: string,
    strategy: CompositionStrategy
  ) {
    super(
      id,
      name,
      description,
      '1.0.0',
      WorkflowFunctionType.NODE,
      true,
      'composite'
    );
    this.compositionStrategy = strategy;
  }

  /**
   * 添加函数到组合
   * @param func 工作流函数
   */
  addFunction(func: BaseWorkflowFunction): void {
    this.functions.push(func);
  }

  /**
   * 移除函数
   * @param func 工作流函数
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
   * 执行组合函数
   * @param context 执行上下文
   * @param config 配置对象
   * @returns 执行结果
   */
  override async execute(context: any, config: any): Promise<any> {
    this.checkInitialized();

    // 验证函数组合
    const validation = this.compositionStrategy.validate(this.functions);
    if (!validation.valid) {
      throw new Error(`函数组合验证失败: ${validation.errors.join(', ')}`);
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
    if (this.functions.length === 0) {
      return 'any';
    }

    // 返回最后一个函数的返回类型
    const lastFunc = this.functions[this.functions.length - 1];
    return lastFunc ? lastFunc.getReturnType() : 'any';
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
      functionCount: this.functions.length,
      strategy: this.compositionStrategy.constructor.name
    };
  }
}