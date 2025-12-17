import { injectable } from 'inversify';
import { IRoutingFunction, WorkflowFunctionType } from '../../../../../domain/workflow/interfaces/workflow-functions';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 检查是否有工具结果的路由函数
 */
@injectable()
export class HasToolResultsRoutingFunction extends BaseWorkflowFunction implements IRoutingFunction {
  constructor() {
    super(
      'route:has_tool_results',
      'has_tool_results_routing',
      '检查工作流状态中是否有工具执行结果并决定路由',
      '1.0.0',
      WorkflowFunctionType.ROUTING,
      false
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'targetNodeId',
        type: 'string',
        required: false,
        description: '有工具结果时的目标节点ID',
        defaultValue: 'process_results'
      },
      {
        name: 'defaultNodeId',
        type: 'string',
        required: false,
        description: '无工具结果时的默认节点ID',
        defaultValue: 'end'
      }
    ];
  }

  async route(context: any, config: any): Promise<string | string[]> {
    this.checkInitialized();

    const targetNodeId = config.targetNodeId || 'process_results';
    const defaultNodeId = config.defaultNodeId || 'end';

    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.role === 'tool' && message.content) {
        return targetNodeId;
      }
    }

    return defaultNodeId;
  }
}