import { injectable, inject } from 'inversify';
import { BaseTriggerFunction } from './base-trigger-function';
import { TriggerFunctionConfig, WorkflowExecutionContext } from '../types';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';
import { TYPES } from '../../../../di/service-keys';

/**
 * 基于状态条件的触发器函数
 */
@injectable()
export class StateTriggerFunction extends BaseTriggerFunction<TriggerFunctionConfig> {
  constructor(@inject(TYPES.ConfigManager) configManager: IConfigManager) {
    super('trigger:state', 'state_trigger', '基于工作流状态条件的触发器', configManager, '1.0.0', 'builtin');
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'stateVariable',
        type: 'string',
        required: true,
        description: '要监控的状态变量名',
      },
      {
        name: 'expectedValue',
        type: 'any',
        required: true,
        description: '期望的状态值',
      },
      {
        name: 'operator',
        type: 'string',
        required: false,
        description: '比较操作符：===, !==, >, <, >=, <=, contains, exists, not_exists',
        defaultValue: '===',
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config['stateVariable'] || typeof config['stateVariable'] !== 'string') {
      errors.push('stateVariable是必需的字符串参数');
    }

    const validOperators = ['===', '!==', '>', '<', '>=', '<=', 'contains', 'exists', 'not_exists'];
    if (config['operator'] && !validOperators.includes(config['operator'])) {
      errors.push(`operator必须是以下值之一: ${validOperators.join(', ')}`);
    }

    return errors;
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: TriggerFunctionConfig
  ): Promise<boolean> {
    const stateVariable = config['stateVariable'];
    const expectedValue = config['expectedValue'];
    const operator = config['operator'] || '===';

    // 获取当前状态值
    const currentValue = context.getVariable(stateVariable);

    // 根据操作符进行比较
    switch (operator) {
      case '===':
        return currentValue === expectedValue;
      case '!==':
        return currentValue !== expectedValue;
      case '>':
        return Number(currentValue) > Number(expectedValue);
      case '<':
        return Number(currentValue) < Number(expectedValue);
      case '>=':
        return Number(currentValue) >= Number(expectedValue);
      case '<=':
        return Number(currentValue) <= Number(expectedValue);
      case 'contains':
        return String(currentValue).includes(String(expectedValue));
      case 'exists':
        return currentValue !== undefined;
      case 'not_exists':
        return currentValue === undefined;
      default:
        return currentValue === expectedValue;
    }
  }
}
