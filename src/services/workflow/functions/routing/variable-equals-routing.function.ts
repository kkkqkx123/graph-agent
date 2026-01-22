import { injectable, inject } from 'inversify';
import { BaseConditionRoutingFunction } from './base-routing-function';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';
import { TYPES } from '../../../../di/service-keys';

/**
 * 变量值路由函数
 * 检查变量值是否等于指定值
 */
@injectable()
export class VariableEqualsRoutingFunction extends BaseConditionRoutingFunction<RoutingFunctionConfig> {
  constructor(@inject(TYPES.ConfigManager) configManager: IConfigManager) {
    super(
      'variable_equals_routing',
      'variableEquals',
      '检查变量值是否等于指定值',
      configManager,
      '1.0.0',
      'builtin'
    );
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: RoutingFunctionConfig
  ): Promise<boolean> {
    const variableName = config['edge']?.['properties']?.['variableName'];
    const expectedValue = config['edge']?.['properties']?.['expectedValue'];
    const variables = config['variables'];

    if (!variableName || !variables) {
      return false;
    }

    const actualValue = variables.get(variableName);
    return actualValue === expectedValue;
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config['edge']?.['properties']?.['variableName']) {
      errors.push('缺少 edge.properties.variableName');
    }

    if (!config['variables']) {
      errors.push('缺少 variables');
    }

    return errors;
  }
}
