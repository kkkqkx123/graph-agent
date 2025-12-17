import { injectable } from 'inversify';
import { IRoutingFunction, WorkflowFunctionType } from '../../../../../domain/workflow/interfaces/workflow-functions';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 检查是否没有工具调用的路由函数
 */
@injectable()
export class NoToolCallsRoutingFunction extends BaseWorkflowFunction implements IRoutingFunction {
  constructor() {
    super(
      'route:no_tool_calls',
      'no_tool_calls_routing',
      '检查工作流状态中是否没有工具调用并决定路由',
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
        description: '无工具调用时的目标节点ID',
        defaultValue: 'end'
      },
      {
        name: 'defaultNodeId',
        type: 'string',
        required: false,
        description: '有工具调用时的默认节点ID',
        defaultValue: 'tools'
      }
    ];
  }

  async route(context: any, config: any): Promise<string | string[]> {
    this.checkInitialized();

    const targetNodeId = config.targetNodeId || 'end';
    const defaultNodeId = config.defaultNodeId || 'tools';

    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.tool_calls && message.tool_calls.length > 0) {
        return defaultNodeId;
      }
    }

    return targetNodeId;
  }
}