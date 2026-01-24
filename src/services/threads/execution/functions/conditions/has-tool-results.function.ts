import { SingletonConditionFunction } from './singleton-condition-function';
import { ConditionFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 检查是否有工具结果的条件函数（单例模式）
 *
 * 逻辑完全固定，无需配置
 * - 检查消息中是否有工具执行结果
 */
export class HasToolResultsConditionFunction extends SingletonConditionFunction {
  readonly id = 'condition:has_tool_results';
  readonly name = 'has_tool_results';
  readonly description = '检查工作流状态中是否有工具执行结果';
  override readonly version = '1.0.0';

  async execute(
    context: WorkflowExecutionContext,
    config?: ConditionFunctionConfig
  ): Promise<boolean> {
    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.role === 'tool' && message.content) {
        return true;
      }
    }
    return false;
  }
}

/**
 * 检查是否有工具结果的条件函数实例
 */
export const hasToolResultsCondition = new HasToolResultsConditionFunction().toConditionFunction();