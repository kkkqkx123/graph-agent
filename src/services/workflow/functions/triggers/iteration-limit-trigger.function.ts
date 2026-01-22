import { injectable, inject } from 'inversify';
import { BaseTriggerFunction } from './base-trigger-function';
import { TriggerFunctionConfig, WorkflowExecutionContext } from '../types';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';
import { TYPES } from '../../../../di/service-keys';

/**
 * 基于迭代次数限制的触发器函数
 */
@injectable()
export class IterationLimitTriggerFunction extends BaseTriggerFunction<TriggerFunctionConfig> {
  constructor(@inject(TYPES.ConfigManager) configManager: IConfigManager) {
    super(
      'trigger:iteration_limit',
      'iteration_limit_trigger',
      '基于工作流迭代次数限制的触发器',
      configManager,
      '1.0.0',
      'builtin'
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'maxIterations',
        type: 'number',
        required: true,
        description: '最大迭代次数',
      },
      {
        name: 'iterationVariable',
        type: 'string',
        required: false,
        description: '迭代计数器变量名',
        defaultValue: 'iteration',
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (
      !config['maxIterations'] ||
      typeof config['maxIterations'] !== 'number' ||
      config['maxIterations'] <= 0
    ) {
      errors.push('maxIterations必须是正数');
    }

    if (config['iterationVariable'] && typeof config['iterationVariable'] !== 'string') {
      errors.push('iterationVariable必须是字符串类型');
    }

    return errors;
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: TriggerFunctionConfig
  ): Promise<boolean> {
    const maxIterations = config['maxIterations'];
    const iterationVariable = config['iterationVariable'] || 'iteration';

    // 获取当前迭代次数
    const currentIteration = context.getVariable(iterationVariable) || 0;

    // 检查是否达到或超过最大迭代次数
    return currentIteration >= maxIterations;
  }
}
