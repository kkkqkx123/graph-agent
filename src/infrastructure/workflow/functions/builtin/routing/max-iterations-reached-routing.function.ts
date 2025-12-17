import { injectable } from 'inversify';
import { IRoutingFunction, WorkflowFunctionType } from '../../../../../domain/workflow/interfaces/workflow-functions';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 检查是否达到最大迭代次数的路由函数
 */
@injectable()
export class MaxIterationsReachedRoutingFunction extends BaseWorkflowFunction implements IRoutingFunction {
  constructor() {
    super(
      'route:max_iterations_reached',
      'max_iterations_reached_routing',
      '检查工作流执行是否达到最大迭代次数并决定路由',
      '1.0.0',
      WorkflowFunctionType.ROUTING,
      false
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'maxIterations',
        type: 'number',
        required: false,
        description: '最大迭代次数',
        defaultValue: 10
      },
      {
        name: 'targetNodeId',
        type: 'string',
        required: false,
        description: '达到最大迭代次数时的目标节点ID',
        defaultValue: 'timeout'
      },
      {
        name: 'defaultNodeId',
        type: 'string',
        required: false,
        description: '未达到最大迭代次数时的默认节点ID',
        defaultValue: 'continue'
      }
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (config.maxIterations !== undefined) {
      if (typeof config.maxIterations !== 'number' || config.maxIterations <= 0) {
        errors.push('maxIterations必须是正数');
      }
    }

    return errors;
  }

  async route(context: any, config: any): Promise<string | string[]> {
    this.checkInitialized();

    const maxIterations = config.maxIterations || 10;
    const targetNodeId = config.targetNodeId || 'timeout';
    const defaultNodeId = config.defaultNodeId || 'continue';
    
    const currentIteration = context.getVariable('iteration') || 0;
    
    if (currentIteration >= maxIterations) {
      return targetNodeId;
    }

    return defaultNodeId;
  }
}