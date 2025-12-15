import { injectable } from 'inversify';
import { ITriggerFunction, WorkflowFunctionType } from '../../../../../domain/workflow/graph/interfaces/workflow-functions';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 时间触发器函数
 */
@injectable()
export class TimeTriggerFunction extends BaseWorkflowFunction implements ITriggerFunction {
  constructor() {
    super(
      'trigger:time',
      'time_trigger',
      '基于时间条件的触发器，支持间隔时间和特定时间点两种模式',
      '1.0.0',
      WorkflowFunctionType.TRIGGER,
      false
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'triggerTime',
        type: 'string | number',
        required: true,
        description: '触发时间，可以是秒数（间隔）或HH:MM格式（特定时间）'
      },
      {
        name: 'lastTriggered',
        type: 'string',
        required: false,
        description: '上次触发时间（ISO字符串）'
      }
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];
    
    if (!config.triggerTime) {
      errors.push('triggerTime是必需的');
    }
    
    return errors;
  }

  async check(context: any, config: any): Promise<boolean> {
    this.checkInitialized();
    
    const triggerTime = config.triggerTime;
    const lastTriggered = config.lastTriggered;
    
    if (!triggerTime) {
      return false;
    }
    
    const now = new Date();
    
    // 检查是否为间隔时间（秒数）
    if (typeof triggerTime === 'number' || /^\d+$/.test(triggerTime)) {
      const intervalSeconds = parseInt(String(triggerTime));
      
      if (!lastTriggered) {
        return true;
      }
      
      const lastTime = new Date(lastTriggered);
      return (now.getTime() - lastTime.getTime()) >= intervalSeconds * 1000;
    } else {
      // 解析时间格式 "HH:MM"
      try {
        const [hour, minute] = triggerTime.split(':').map(Number);
        const nextTrigger = new Date(now);
        nextTrigger.setHours(hour, minute, 0, 0);
        
        // 如果今天的时间已过，则设置为明天
        if (nextTrigger <= now) {
          nextTrigger.setDate(nextTrigger.getDate() + 1);
        }
        
        if (!lastTriggered) {
          return true;
        }
        
        const lastTime = new Date(lastTriggered);
        return now >= nextTrigger && now.getDate() !== lastTime.getDate();
      } catch (error) {
        return false;
      }
    }
  }
}