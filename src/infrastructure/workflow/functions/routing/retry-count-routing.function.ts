import { BaseConditionRoutingFunction } from './base-routing-function';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 重试次数路由函数
 * 检查重试次数是否达到指定值
 */
export class RetryCountRoutingFunction extends BaseConditionRoutingFunction<RoutingFunctionConfig> {
  constructor() {
    super('retry_count_routing', 'retryCount', '检查重试次数是否达到指定值', '1.0.0', 'builtin');
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: RoutingFunctionConfig
  ): Promise<boolean> {
    const maxRetries = config['edge']?.['properties']?.['maxRetries'] ?? 3;
    const currentNodeState = config['currentNodeState'];

    if (!currentNodeState) {
      return false;
    }

    return currentNodeState.retryCount >= maxRetries;
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config['currentNodeState']) {
      errors.push('缺少 currentNodeState');
    }

    return errors;
  }
}
