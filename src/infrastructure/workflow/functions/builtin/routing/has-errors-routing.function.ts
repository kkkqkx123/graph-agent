import { injectable } from 'inversify';
import { IRoutingFunction, WorkflowFunctionType } from '../../../../../domain/workflow/interfaces/workflow-functions';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 检查是否有错误的路由函数
 */
@injectable()
export class HasErrorsRoutingFunction extends BaseWorkflowFunction implements IRoutingFunction {
  constructor() {
    super(
      'route:has_errors',
      'has_errors_routing',
      '检查工作流状态中是否有错误并决定路由',
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
        description: '有错误时的目标节点ID',
        defaultValue: 'error_handler'
      },
      {
        name: 'defaultNodeId',
        type: 'string',
        required: false,
        description: '无错误时的默认节点ID',
        defaultValue: 'continue'
      },
      {
        name: 'errorType',
        type: 'string',
        required: false,
        description: '特定错误类型过滤，不指定则检查任何错误',
        defaultValue: null
      }
    ];
  }

  async route(context: any, config: any): Promise<string | string[]> {
    this.checkInitialized();

    const targetNodeId = config.targetNodeId || 'error_handler';
    const defaultNodeId = config.defaultNodeId || 'continue';
    const errorType = config.errorType;

    const errors = context.getVariable('errors') || [];
    
    if (errors.length === 0) {
      return defaultNodeId;
    }

    // 如果指定了错误类型，检查是否有匹配的错误
    if (errorType) {
      const hasMatchingError = errors.some((error: any) => error.type === errorType);
      return hasMatchingError ? targetNodeId : defaultNodeId;
    }

    // 检查是否有任何错误
    return targetNodeId;
  }
}