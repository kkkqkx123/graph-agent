import { BaseConditionRoutingFunction } from './base-routing-function';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 所有节点完成路由函数
 * 检查所有节点是否已完成
 */
export class AllNodesCompletedRoutingFunction extends BaseConditionRoutingFunction<RoutingFunctionConfig> {
  constructor() {
    super(
      'all_nodes_completed_routing',
      'allNodesCompleted',
      '检查所有节点是否已完成',
      '1.0.0',
      'builtin'
    );
  }

  override async execute(context: WorkflowExecutionContext, config: RoutingFunctionConfig): Promise<boolean> {
    const executionState = config['executionState'];

    if (!executionState?.workflowState) {
      return false;
    }

    const totalNodes = executionState.workflowState.totalNodes;
    const completedNodes = executionState.workflowState.completedNodes;

    return completedNodes >= totalNodes;
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config['executionState']?.workflowState) {
      errors.push('缺少 executionState.workflowState');
    }

    return errors;
  }
}