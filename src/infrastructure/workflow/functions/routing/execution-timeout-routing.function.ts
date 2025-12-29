import { BaseConditionRoutingFunction } from './base-routing-function';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 执行超时路由函数
 * 检查执行时长是否超过指定时间
 */
export class ExecutionTimeoutRoutingFunction extends BaseConditionRoutingFunction<RoutingFunctionConfig> {
  constructor() {
    super(
      'execution_timeout_routing',
      'executionTimeout',
      '检查执行时长是否超过指定时间',
      '1.0.0',
      'builtin'
    );
  }

  override async execute(context: WorkflowExecutionContext, config: RoutingFunctionConfig): Promise<boolean> {
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