import { BaseWorkflowFunction } from '../../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 重试次数路由函数
 * 检查重试次数是否达到指定值
 */
export class RetryCountRoutingFunction extends BaseWorkflowFunction {
  constructor() {
    super(
      'retry_count_routing',
      'retryCount',
      '检查重试次数是否达到指定值',
      '1.0.0',
      WorkflowFunctionType.ROUTING,
      true,
      'builtin'
    );
  }

  async execute(context: any, config: any): Promise<boolean> {
    const maxRetries = config.edge?.properties?.maxRetries ?? 3;
    const currentNodeState = config.currentNodeState;

    if (!currentNodeState) {
      return false;
    }

    return currentNodeState.retryCount >= maxRetries;
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.currentNodeState) {
      errors.push('缺少 currentNodeState');
    }

    return errors;
  }
}