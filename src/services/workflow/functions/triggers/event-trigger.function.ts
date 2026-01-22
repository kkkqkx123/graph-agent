import { injectable, inject } from 'inversify';
import { BaseTriggerFunction } from './base-trigger-function';
import { TriggerFunctionConfig, WorkflowExecutionContext } from '../types';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';
import { TYPES } from '../../../../di/service-keys';

/**
 * 基于事件类型的触发器函数
 */
@injectable()
export class EventTriggerFunction extends BaseTriggerFunction<TriggerFunctionConfig> {
  constructor(@inject(TYPES.ConfigManager) configManager: IConfigManager) {
    super('trigger:event', 'event_trigger', '基于工作流事件类型的触发器', configManager, '1.0.0', 'builtin');
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'eventType',
        type: 'string',
        required: true,
        description: '要监听的事件类型',
      },
      {
        name: 'eventSource',
        type: 'string',
        required: false,
        description: '事件源，不指定则监听所有源',
        defaultValue: null,
      },
      {
        name: 'eventDataFilter',
        type: 'object',
        required: false,
        description: '事件数据过滤条件',
        defaultValue: {},
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config['eventType'] || typeof config['eventType'] !== 'string') {
      errors.push('eventType是必需的字符串参数');
    }

    if (config['eventSource'] && typeof config['eventSource'] !== 'string') {
      errors.push('eventSource必须是字符串类型');
    }

    if (config['eventDataFilter'] && typeof config['eventDataFilter'] !== 'object') {
      errors.push('eventDataFilter必须是对象类型');
    }

    return errors;
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: TriggerFunctionConfig
  ): Promise<boolean> {
    const eventType = config['eventType'];
    const eventSource = config['eventSource'];
    const eventDataFilter = config['eventDataFilter'] || {};

    // 获取事件列表
    const events = context.getVariable('events') || [];

    // 查找匹配的事件
    const matchingEvents = events.filter((event: any) => {
      // 检查事件类型
      if (event.type !== eventType) {
        return false;
      }

      // 检查事件源
      if (eventSource && event.source !== eventSource) {
        return false;
      }

      // 检查事件数据过滤条件
      for (const [key, value] of Object.entries(eventDataFilter)) {
        if (event.data && event.data[key] !== value) {
          return false;
        }
      }

      return true;
    });

    // 如果有匹配的事件，则触发
    return matchingEvents.length > 0;
  }
}
