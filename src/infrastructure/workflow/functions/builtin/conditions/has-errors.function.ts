import { injectable } from 'inversify';
import { IConditionFunction, WorkflowFunctionType } from '../../../../../domain/workflow/interfaces/workflow-functions';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 检查是否有错误的条件函数
 */
@injectable()
export class HasErrorsConditionFunction extends BaseWorkflowFunction implements IConditionFunction {
  constructor() {
    super(
      'condition:has_errors',
      'has_errors',
      '检查工作流状态中是否有错误',
      '1.0.0',
      WorkflowFunctionType.CONDITION,
      false
    );
  }

  async evaluate(context: any, config: any): Promise<boolean> {
    this.checkInitialized();

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