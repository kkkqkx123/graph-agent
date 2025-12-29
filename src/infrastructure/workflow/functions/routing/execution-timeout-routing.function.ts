import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 执行超时路由函数
 * 检查执行时长是否超过指定时间
 */
export class ExecutionTimeoutRoutingFunction extends BaseWorkflowFunction {
  constructor() {
    super(
      'execution_timeout_routing',
      'executionTimeout',
      '检查执行时长是否超过指定时间',
      '1.0.0',
      WorkflowFunctionType.ROUTING,
      true,
      'builtin'
    );
  }

  async execute(context: any, config: any): Promise<boolean> {
    const timeoutMs = config.edge?.properties?.timeoutMs ?? 30000;
    const currentNodeState = config.currentNodeState;

    if (!currentNodeState) {
      return false;
    }

    const duration = currentNodeState.duration ?? 0;
    return duration >= timeoutMs;
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.currentNodeState) {
      errors.push('缺少 currentNodeState');
    }

    return errors;
  }
}