import { BaseConditionRouting } from './base-routing';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 变量值路由函数
 * 检查变量值是否等于指定值
 */
export class VariableEqualsRouting extends BaseConditionRouting<RoutingFunctionConfig> {
  constructor() {
    super(
      'variable_equals_routing',
      'variableEquals',
      '检查变量值是否等于指定值',
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
