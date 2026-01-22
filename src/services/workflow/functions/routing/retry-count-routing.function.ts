import { injectable, inject } from 'inversify';
import { BaseConditionRoutingFunction } from './base-routing-function';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';
import { TYPES } from '../../../../di/service-keys';

/**
 * 重试次数路由函数
 * 检查重试次数是否达到指定值
 */
@injectable()
export class RetryCountRoutingFunction extends BaseConditionRoutingFunction<RoutingFunctionConfig> {
  constructor(@inject(TYPES.ConfigManager) configManager: IConfigManager) {
    super('retry_count_routing', 'retryCount', '检查重试次数是否达到指定值', configManager, '1.0.0', 'builtin');
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
