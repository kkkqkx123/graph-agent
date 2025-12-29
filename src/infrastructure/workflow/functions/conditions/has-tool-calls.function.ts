import { injectable } from 'inversify';
import { BaseConditionFunction } from './base-condition-function';
import { ConditionFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 检查是否有工具调用的条件函数
 */
@injectable()
export class HasToolCallsConditionFunction extends BaseConditionFunction<ConditionFunctionConfig> {
  constructor() {
    super(
      'condition:has_tool_calls',
      'has_tool_calls',
      '检查工作流状态中是否有工具调用',
      '1.0.0',
      'builtin'
    );
  }

  override async execute(context: WorkflowExecutionContext, config: ConditionFunctionConfig): Promise<boolean> {
    this.checkInitialized();

    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.tool_calls && message.tool_calls.length > 0) {
        return true;
      }
    }
    return false;
  }
}