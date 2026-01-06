import { injectable } from 'inversify';
import { BaseConditionFunction } from './base-condition-function';
import { ConditionFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 检查是否有工具结果的条件函数
 */
@injectable()
export class HasToolResultsConditionFunction extends BaseConditionFunction<ConditionFunctionConfig> {
  constructor() {
    super(
      'condition:has_tool_results',
      'has_tool_results',
      '检查工作流状态中是否有工具执行结果',
      '1.0.0',
      'builtin'
    );
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: ConditionFunctionConfig
  ): Promise<boolean> {
    this.checkInitialized();

    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.role === 'tool' && message.content) {
        return true;
      }
    }
    return false;
  }
}
