import { injectable } from 'inversify';
import { BaseConditionFunction } from './base-condition-function';
import { ConditionFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 检查是否没有工具调用的条件函数
 */
@injectable()
export class NoToolCallsConditionFunction extends BaseConditionFunction<ConditionFunctionConfig> {
  constructor() {
    super(
      'condition:no_tool_calls',
      'no_tool_calls',
      '检查工作流状态中是否没有工具调用',
      '1.0.0',
      'builtin'
    );
  }

  override async execute(context: WorkflowExecutionContext, config: ConditionFunctionConfig): Promise<boolean> {
    this.checkInitialized();

    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.tool_calls && message.tool_calls.length > 0) {
        return false;
      }
    }
    return true;
  }
}