import { injectable, inject } from 'inversify';
import { BaseConditionRoutingFunction } from './base-routing-function';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';
import { TYPES } from '../../../../di/service-keys';

/**
 * 执行超时路由函数
 * 检查执行时长是否超过指定时间
 */
@injectable()
export class ExecutionTimeoutRoutingFunction extends BaseConditionRoutingFunction<RoutingFunctionConfig> {
  constructor(@inject(TYPES.ConfigManager) configManager: IConfigManager) {
    super(
      'execution_timeout_routing',
      'executionTimeout',
      '检查执行时长是否超过指定时间',
      configManager,
      '1.0.0',
      'builtin'
    );
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: RoutingFunctionConfig
  ): Promise<boolean> {
    const timeoutMs = config['edge']?.['properties']?.['timeoutMs'] ?? 30000;
    const currentNodeState = config['currentNodeState'];

    if (!currentNodeState) {
      return false;
    }

    const duration = currentNodeState.duration ?? 0;
    return duration >= timeoutMs;
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config['currentNodeState']) {
      errors.push('缺少 currentNodeState');
    }

    return errors;
  }
}
