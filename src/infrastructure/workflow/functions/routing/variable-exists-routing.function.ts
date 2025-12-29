import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 变量存在路由函数
 * 检查变量是否存在
 */
export class VariableExistsRoutingFunction extends BaseWorkflowFunction {
  constructor() {
    super(
      'variable_exists_routing',
      'variableExists',
      '检查变量是否存在',
      '1.0.0',
      WorkflowFunctionType.ROUTING,
      true,
      'builtin'
    );
  }

  async execute(context: any, config: any): Promise<boolean> {
    const variableName = config.edge?.properties?.variableName;
    const variables = config.variables;

    if (!variableName || !variables) {
      return false;
    }

    return variables.has(variableName);
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.edge?.properties?.variableName) {
      errors.push('缺少 edge.properties.variableName');
    }

    if (!config.variables) {
      errors.push('缺少 variables');
    }

    return errors;
  }
}