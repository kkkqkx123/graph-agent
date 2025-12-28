import { injectable } from 'inversify';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 检查是否有工具结果的条件函数
 */
@injectable()
export class HasToolResultsConditionFunction extends BaseWorkflowFunction {
  constructor() {
    super(
      'condition:has_tool_results',
      'has_tool_results',
      '检查工作流状态中是否有工具执行结果',
      '1.0.0',
      WorkflowFunctionType.CONDITION,
      false
    );
  }

  async execute(context: any, config: any): Promise<boolean> {
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