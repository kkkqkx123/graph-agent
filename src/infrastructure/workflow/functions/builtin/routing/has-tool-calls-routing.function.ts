import { injectable } from 'inversify';
import { IRoutingFunction, WorkflowFunctionType } from '../../../../domain/workflow/functions/interfaces';
import { IExecutionContext } from '../../../../domain/workflow/graph/interfaces/execution-context.interface';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 检查是否有工具调用的路由函数
 */
@injectable()
export class HasToolCallsRoutingFunction extends BaseWorkflowFunction implements IRoutingFunction {
  constructor() {
    super(
      'route:has_tool_calls',
      'has_tool_calls_routing',
      '检查工作流状态中是否有工具调用并决定路由',
      '1.0.0',
      WorkflowFunctionType.ROUTING,
      false
    );
  }

  getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'targetNodeId',
        type: 'string',
        required: false,
        description: '有工具调用时的目标节点ID',
        defaultValue: 'tools'
      },
      {
        name: 'defaultNodeId',
        type: 'string',
        required: false,
        description: '无工具调用时的默认节点ID',
        defaultValue: 'end'
      }
    ];
  }

  async route(context: IExecutionContext, params: any): Promise<string | null> {
    this.checkInitialized();
    
    const targetNodeId = params.targetNodeId || 'tools';
    const defaultNodeId = params.defaultNodeId || 'end';
    
    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.tool_calls && message.tool_calls.length > 0) {
        return targetNodeId;
      }
    }
    
    return defaultNodeId;
  }
}