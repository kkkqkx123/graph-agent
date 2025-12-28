import { BaseWorkflowFunction, WorkflowExecutionContext, ConditionFunctionConfig } from '../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';
import { CompositionStrategy } from './composition-strategy';
import { BaseCompositeFunction } from './base-composite-function';
import { CompositeFunctionType, ConditionCompositeConfig } from './composition-types';

/**
 * 条件函数组合
 * 只能组合条件类型的函数，返回boolean
 */
export class ConditionCompositeFunction extends BaseCompositeFunction<ConditionCompositeConfig> {
  constructor(
    id: string,
    name: string,
    description: string,
    strategy: CompositionStrategy,
    version: string = '1.0.0',
    category: string = 'composite'
  ) {
    super(
      id,
      name,
      description,
      CompositeFunctionType.CONDITION,
      strategy,
      version,
      category
    );
  }

  /**
   * 获取期望的函数类型
   */
  protected getExpectedFunctionType(): WorkflowFunctionType {
    return WorkflowFunctionType.CONDITION;
  }

  /**
   * 执行条件函数组合
   * @param context 执行上下文
   * @param config 配置对象
   * @returns 条件判断结果
   */
  override async execute(context: WorkflowExecutionContext, config: ConditionCompositeConfig): Promise<boolean> {
    const result = await super.execute(context, config);

    // 确保返回类型为boolean
    if (typeof result === 'boolean') {
      return result;
    }

    // 如果策略返回的不是boolean，转换为boolean
    return Boolean(result);
  }
}