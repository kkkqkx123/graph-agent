import { SingletonConditionFunction } from './singleton-condition-function';
import { ConditionFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 检查是否没有工具调用的条件函数（单例模式）
 *
 * 逻辑完全固定，无需配置
 * - 检查消息中是否没有工具调用
 */
export class NoToolCallsConditionFunction extends SingletonConditionFunction {
  readonly id = 'condition:no_tool_calls';
  readonly name = 'no_tool_calls';
  readonly description = '检查工作流状态中是否没有工具调用';
  override readonly version = '1.0.0';

  async execute(
    context: WorkflowExecutionContext,
    config?: ConditionFunctionConfig
  ): Promise<boolean> {
    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.tool_calls && message.tool_calls.length > 0) {
        return false;
      }
    }
    return true;
  }
}

/**
 * 检查是否没有工具调用的条件函数实例
 */
export const noToolCallsCondition = new NoToolCallsConditionFunction().toConditionFunction();