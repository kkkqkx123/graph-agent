import { SingletonConditionFunction } from './singleton-condition-function';
import { ConditionFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 检查是否有工具调用的条件函数（单例模式）
 *
 * 逻辑完全固定，无需配置
 * - 检查消息中是否有工具调用
 */
export class HasToolCallsConditionFunction extends SingletonConditionFunction {
  readonly id = 'condition:has_tool_calls';
  readonly name = 'has_tool_calls';
  readonly description = '检查工作流状态中是否有工具调用';
  override readonly version = '1.0.0';

  async execute(
    context: WorkflowExecutionContext,
    config?: ConditionFunctionConfig
  ): Promise<boolean> {
    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.tool_calls && message.tool_calls.length > 0) {
        return true;
      }
    }
    return false;
  }
}

/**
 * 检查是否有工具调用的条件函数实例
 */
export const hasToolCallsCondition = new HasToolCallsConditionFunction().toConditionFunction();