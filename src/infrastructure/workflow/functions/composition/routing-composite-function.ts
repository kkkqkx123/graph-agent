import { BaseWorkflowFunction, WorkflowExecutionContext, RoutingFunctionConfig } from '../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';
import { CompositionStrategy } from './composition-strategy';
import { BaseCompositeFunction } from './base-composite-function';
import { CompositeFunctionType, RoutingCompositeConfig } from './composition-types';

/**
 * 路由函数组合
 * 只能组合路由类型的函数，返回boolean
 */
export class RoutingCompositeFunction extends BaseCompositeFunction<RoutingCompositeConfig> {
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
      CompositeFunctionType.ROUTING,
      strategy,
      version,
      category
    );
  }

  /**
   * 获取期望的函数类型
   */
  protected getExpectedFunctionType(): WorkflowFunctionType {
    return WorkflowFunctionType.ROUTING;
  }

  /**
   * 执行路由函数组合
   * @param context 执行上下文
   * @param config 配置对象
   * @returns 路由判断结果
   */
  override async execute(context: WorkflowExecutionContext, config: RoutingCompositeConfig): Promise<boolean> {
    const result = await super.execute(context, config);

    // 确保返回类型为boolean
    if (typeof result === 'boolean') {
      return result;
    }

    // 如果策略返回的不是boolean，转换为boolean
    return Boolean(result);
  }
}