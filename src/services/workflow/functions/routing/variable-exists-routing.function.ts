import { injectable, inject } from 'inversify';
import { BaseConditionRoutingFunction } from './base-routing-function';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';
import { TYPES } from '../../../../di/service-keys';

/**
 * 变量存在路由函数
 * 检查变量是否存在
 */
@injectable()
export class VariableExistsRoutingFunction extends BaseConditionRoutingFunction<RoutingFunctionConfig> {
  constructor(@inject(TYPES.ConfigManager) configManager: IConfigManager) {
    super('variable_exists_routing', 'variableExists', '检查变量是否存在', configManager, '1.0.0', 'builtin');
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: RoutingFunctionConfig
  ): Promise<boolean> {
    const variableName = config['edge']?.['properties']?.['variableName'];
    const variables = config['variables'];

    if (!variableName || !variables) {
      return false;
    }

    return variables.has(variableName);
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
