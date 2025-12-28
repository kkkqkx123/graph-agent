import { injectable } from 'inversify';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 检查是否达到最大迭代次数的条件函数
 */
@injectable()
export class MaxIterationsReachedConditionFunction extends BaseWorkflowFunction {
  constructor() {
    super(
      'condition:max_iterations_reached',
      'max_iterations_reached',
      '检查工作流执行是否达到最大迭代次数',
      '1.0.0',
      WorkflowFunctionType.CONDITION,
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

  async execute(context: any, config: any): Promise<boolean> {
    this.checkInitialized();

    const maxIterations = config.maxIterations || 10;
    const currentIteration = context.getVariable('iteration') || 0;
    
    return currentIteration >= maxIterations;
  }
}