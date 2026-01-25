import { SingletonConditionFunction } from './singleton-condition-function';
import { ConditionFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 检查是否有错误的条件函数（单例模式）
 *
 * 逻辑完全固定，无需配置
 * - 检查工具结果中的错误
 * - 检查消息中的错误
 */
export class HasErrorsConditionFunction extends SingletonConditionFunction {
  readonly id = 'condition:has_errors';
  readonly name = 'has_errors';
  readonly description = '检查工作流状态中是否有错误';
  override readonly version = '1.0.0';

  async execute(
    context: WorkflowExecutionContext,
    config?: ConditionFunctionConfig
  ): Promise<boolean> {
    // 检查工具结果中的错误
    const toolResults = context.getVariable('tool_results') || [];
    for (const result of toolResults) {
      if (result.success === false) {
        return true;
      }
    }

    // 检查消息中的错误
    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.type === 'error') {
        return true;
      }
    }

    return false;
  }
}

/**
 * 检查是否有错误的条件函数实例
 */
export const hasErrorsCondition = new HasErrorsConditionFunction().toConditionFunction();