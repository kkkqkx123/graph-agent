import { BaseWorkflowFunction, WorkflowExecutionContext, NodeFunctionResult, NodeFunctionConfig } from '../../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../../domain/workflow/value-objects/workflow-function-type';
import { CompositionStrategy } from '../composition-strategy';
import { BaseCompositeFunction } from '../base-composite-function';
import { CompositeFunctionType, NodeCompositeConfig } from '../composition-types';

/**
 * 节点函数组合
 * 只能组合节点类型的函数，返回NodeFunctionResult
 */
export class NodeCompositeFunction extends BaseCompositeFunction<NodeCompositeConfig> {
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
      CompositeFunctionType.NODE,
      strategy,
      version,
      category
    );
  }

  /**
   * 获取期望的函数类型
   */
  protected getExpectedFunctionType(): WorkflowFunctionType {
    return WorkflowFunctionType.NODE;
  }

  /**
   * 执行节点函数组合
   * @param context 执行上下文
   * @param config 配置对象
   * @returns 节点执行结果
   */
  override async execute(context: WorkflowExecutionContext, config: NodeCompositeConfig): Promise<NodeFunctionResult> {
    try {
      const result = await super.execute(context, config);

      // 确保返回类型正确
      if (typeof result === 'object' && result !== null) {
        if ('success' in result) {
          return result as NodeFunctionResult;
        }
      }

      // 如果策略返回的不是NodeFunctionResult，包装成NodeFunctionResult
      return {
        success: true,
        output: result,
        metadata: {
          composite: true,
          functionCount: this.functions.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}