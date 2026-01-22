import { injectable, inject } from 'inversify';
import { BaseConditionFunction } from './base-condition-function';
import { ConditionFunctionConfig, WorkflowExecutionContext } from '../types';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';
import { TYPES } from '../../../../di/service-keys';

/**
 * 最大迭代次数配置接口
 */
export interface MaxIterationsConfig extends ConditionFunctionConfig {
  /** 最大迭代次数 */
  maxIterations?: number;
}

/**
 * 检查是否达到最大迭代次数的条件函数
 *
 * 支持配置：
 * - maxIterations：最大迭代次数（默认为10）
 * - 支持从配置文件加载基础配置
 * - 支持运行时配置覆盖
 */
@injectable()
export class MaxIterationsReachedConditionFunction extends BaseConditionFunction<MaxIterationsConfig> {
  /**
   * 默认配置
   */
  private readonly defaultConfig: Required<MaxIterationsConfig> = {
    maxIterations: 10,
  };

  constructor(@inject(TYPES.ConfigManager) configManager: IConfigManager) {
    super(
      'condition:max_iterations_reached',
      'max_iterations_reached',
      '检查工作流执行是否达到最大迭代次数',
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
        required: false,
        description: '最大迭代次数',
        defaultValue: 10,
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (config['maxIterations'] !== undefined) {
      if (typeof config['maxIterations'] !== 'number' || config['maxIterations'] <= 0) {
        errors.push('maxIterations必须是正数');
      }
    }

    return errors;
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: MaxIterationsConfig
  ): Promise<boolean> {
    this.checkInitialized();

    // 合并基础配置和运行时配置
    const mergedConfig = this.getConfig<MaxIterationsConfig>(config);
    const finalConfig = { ...this.defaultConfig, ...mergedConfig };

    const maxIterations = finalConfig.maxIterations || 10;
    const currentIteration = context.getVariable('iteration') || 0;

    return currentIteration >= maxIterations;
  }
}