import { injectable, inject } from 'inversify';
import { BaseConditionRoutingFunction } from './base-routing-function';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';
import { TYPES } from '../../../../di/service-keys';

/**
 * 进度路由函数
 * 检查工作流进度是否达到指定值
 */
@injectable()
export class ProgressReachedRoutingFunction extends BaseConditionRoutingFunction<RoutingFunctionConfig> {
  constructor(@inject(TYPES.ConfigManager) configManager: IConfigManager) {
    super(
      'progress_reached_routing',
      'progressReached',
      '检查工作流进度是否达到指定值',
      configManager,
      '1.0.0',
      'builtin'
    );
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: RoutingFunctionConfig
  ): Promise<boolean> {
    const targetProgress = config['edge']?.['properties']?.['targetProgress'] ?? 100;
    const executionState = config['executionState'];

    if (!executionState?.workflowState) {
      return false;
    }

    return executionState.workflowState.progress >= targetProgress;
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config['executionState']?.['workflowState']) {
      errors.push('缺少 executionState.workflowState');
    }

    return errors;
  }
}
