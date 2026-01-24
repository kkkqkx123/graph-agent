import { BaseConditionRouting } from './base-routing';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 节点成功路由函数
 * 检查节点是否执行成功
 */
export class NodeSuccessRouting extends BaseConditionRouting<RoutingFunctionConfig> {
  constructor() {
    super('node_success_routing', 'nodeSuccess', '检查节点是否执行成功', '1.0.0', 'builtin');
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: RoutingFunctionConfig
  ): Promise<boolean> {
    const nodeId = config['edge']?.['fromNodeId']?.toString();
    const nodeStates = config['nodeStates'];

    if (!nodeId || !nodeStates) {
      return false;
    }

    const nodeState = nodeStates.get(nodeId);
    return nodeState?.status?.isSuccess?.() ?? false;
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config['edge']?.['fromNodeId']) {
      errors.push('缺少 edge.fromNodeId');
    }

    if (!config['nodeStates']) {
      errors.push('缺少 nodeStates');
    }

    return errors;
  }
}
