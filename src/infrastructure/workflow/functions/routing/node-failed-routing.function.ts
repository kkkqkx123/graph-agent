import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 节点失败路由函数
 * 检查节点是否执行失败
 */
export class NodeFailedRoutingFunction extends BaseWorkflowFunction {
  constructor() {
    super(
      'node_failed_routing',
      'nodeFailed',
      '检查节点是否执行失败',
      '1.0.0',
      WorkflowFunctionType.ROUTING,
      true,
      'builtin'
    );
  }

  async execute(context: any, config: any): Promise<boolean> {
    const nodeId = config.edge?.fromNodeId?.toString();
    const nodeStates = config.nodeStates;

    if (!nodeId || !nodeStates) {
      return false;
    }

    const nodeState = nodeStates.get(nodeId);
    return nodeState?.status?.isFailed?.() ?? false;
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.edge?.fromNodeId) {
      errors.push('缺少 edge.fromNodeId');
    }

    if (!config.nodeStates) {
      errors.push('缺少 nodeStates');
    }

    return errors;
  }
}