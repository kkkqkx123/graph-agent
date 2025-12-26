/**
 * 触发器实体实现
 * 
 * 本文件实现了图工作流中的触发器实体
 */

import {
  TriggerId,
  TriggerType,
  TriggerAction,
  TriggerStatus,
  TriggerConfig,
  TimeTriggerConfig,
  EventTriggerConfig,
  StateTriggerConfig,
  createTriggerId,
  ExecutionContext,
  WorkflowEngine
} from '../types/workflow-types';

/**
 * 触发器实体类
 */
export class TriggerImpl {
  private _id: TriggerId;
  private _type: TriggerType;
  private _name: string;
  private _config: TriggerConfig;
  private _action: TriggerAction;
  private _targetNodeId: string | undefined;
  private _status: TriggerStatus;
  private _triggeredAt: number | undefined;

  constructor(
    id: string,
    type: TriggerType,
    name: string,
    config: TriggerConfig,
    action: TriggerAction,
    targetNodeId?: string
  ) {
    this._id = createTriggerId(id);
    this._type = type;
    this._name = name;
    this._config = { ...config };
    this._action = action;
    this._targetNodeId = targetNodeId;
    this._status = TriggerStatus.ENABLED;
    this._triggeredAt = undefined;
  }

  /**
   * 获取触发器ID
   */
  get id(): TriggerId {
    return this._id;
  }

  /**
   * 获取触发器类型
   */
  get type(): TriggerType {
    return this._type;
  }

  /**
   * 获取触发器名称
   */
  get name(): string {
    return this._name;
  }

  /**
   * 获取触发器配置
   */
  get config(): TriggerConfig {
    return { ...this._config };
  }

  /**
   * 获取触发器动作
   */
  get action(): TriggerAction {
    return this._action;
  }

  /**
   * 获取目标节点ID
   */
  get targetNodeId(): string | undefined {
    return this._targetNodeId;
  }

  /**
   * 获取触发器状态
   */
  get status(): TriggerStatus {
    return this._status;
  }

  /**
   * 获取触发时间
   */
  get triggeredAt(): number | undefined {
    return this._triggeredAt;
  }

  /**
   * 启用触发器
   */
  enable(): void {
    this._status = TriggerStatus.ENABLED;
    this._triggeredAt = undefined;
  }

  /**
   * 禁用触发器
   */
  disable(): void {
    this._status = TriggerStatus.DISABLED;
  }

  /**
   * 评估触发器是否应该触发
   * 
   * @param context 执行上下文
   * @returns 是否应该触发
   */
  async evaluate(context: ExecutionContext): Promise<boolean> {
    // 如果触发器被禁用，不触发
    if (this._status === TriggerStatus.DISABLED) {
      return false;
    }

    // 如果已经触发过，不重复触发
    if (this._status === TriggerStatus.TRIGGERED) {
      return false;
    }

    try {
      switch (this._type) {
        case TriggerType.TIME:
          return await this.evaluateTimeTrigger(context);
        case TriggerType.EVENT:
          return await this.evaluateEventTrigger(context);
        case TriggerType.STATE:
          return await this.evaluateStateTrigger(context);
        default:
          return false;
      }
    } catch (error) {
      console.error(`评估触发器失败: ${this._id}`, error);
      return false;
    }
  }

  /**
   * 评估时间触发器
   * 
   * @param context 执行上下文
   * @returns 是否应该触发
   */
  private async evaluateTimeTrigger(context: ExecutionContext): Promise<boolean> {
    const config = this._config as TimeTriggerConfig;

    // 检查延迟触发
    if (config.delay !== undefined) {
      return this.checkDelayMet(config.delay, context);
    }

    // 检查间隔触发
    if (config.interval !== undefined) {
      return this.checkIntervalMet(config.interval, context);
    }

    // 检查cron触发（简化版本，仅支持基本检查）
    if (config.cron !== undefined) {
      return this.checkCronMatch(config.cron);
    }

    return false;
  }

  /**
   * 检查延迟是否满足
   * 
   * @param delay 延迟毫秒数
   * @param context 执行上下文
   * @returns 是否满足
   */
  private checkDelayMet(delay: number, context: ExecutionContext): boolean {
    const startTime = context.getVariable('workflow.startTime') as number;
    if (!startTime) {
      return false;
    }
    const currentTime = Date.now();
    return (currentTime - startTime) >= delay;
  }

  /**
   * 检查间隔是否满足
   * 
   * @param interval 间隔毫秒数
   * @param context 执行上下文
   * @returns 是否满足
   */
  private checkIntervalMet(interval: number, context: ExecutionContext): boolean {
    const lastTriggerTime = context.getVariable(`trigger.${this._id}.lastTriggerTime`) as number;
    if (!lastTriggerTime) {
      return true;
    }
    const currentTime = Date.now();
    return (currentTime - lastTriggerTime) >= interval;
  }

  /**
   * 检查cron表达式是否匹配
   * 
   * @param cron cron表达式
   * @returns 是否匹配
   */
  private checkCronMatch(cron: string): boolean {
    // 简化版本，仅支持基本检查
    // 实际实现应该使用cron解析库
    const now = new Date();
    const minute = now.getMinutes();
    const hour = now.getHours();

    // 简单的每分钟检查
    if (cron === '* * * * *') {
      return true;
    }

    // 简单的每小时检查
    if (cron === '0 * * * *' && minute === 0) {
      return true;
    }

    // 简单的每天检查
    if (cron === '0 0 * * *' && minute === 0 && hour === 0) {
      return true;
    }

    return false;
  }

  /**
   * 评估事件触发器
   * 
   * @param context 执行上下文
   * @returns 是否应该触发
   */
  private async evaluateEventTrigger(context: ExecutionContext): Promise<boolean> {
    const config = this._config as EventTriggerConfig;

    // 获取最近的事件
    const recentEvent = context.getRecentEvent(config.eventType);
    if (!recentEvent) {
      return false;
    }

    // 如果有事件数据模式，检查是否匹配
    if (config.eventDataPattern) {
      return this.matchEventData(recentEvent.data, config.eventDataPattern);
    }

    return true;
  }

  /**
   * 匹配事件数据
   * 
   * @param eventData 事件数据
   * @param pattern 匹配模式
   * @returns 是否匹配
   */
  private matchEventData(eventData: any, pattern: Record<string, any>): boolean {
    for (const key in pattern) {
      if (eventData[key] !== pattern[key]) {
        return false;
      }
    }
    return true;
  }

  /**
   * 评估状态触发器
   * 
   * @param context 执行上下文
   * @returns 是否应该触发
   */
  private async evaluateStateTrigger(context: ExecutionContext): Promise<boolean> {
    const config = this._config as StateTriggerConfig;

    // 从上下文获取状态值
    const actualValue = context.getVariable(config.statePath);

    // 比较状态值
    return actualValue === config.expectedValue;
  }

  /**
   * 执行触发器动作
   * 
   * @param engine 工作流引擎
   */
  async executeAction(engine: WorkflowEngine): Promise<void> {
    // 标记为已触发
    this._status = TriggerStatus.TRIGGERED;
    this._triggeredAt = Date.now();

    try {
      switch (this._action) {
        case TriggerAction.START:
          // 启动工作流（由引擎处理）
          console.log(`触发器 ${this._id} 执行动作: START`);
          break;

        case TriggerAction.STOP:
          engine.stop();
          console.log(`触发器 ${this._id} 执行动作: STOP`);
          break;

        case TriggerAction.PAUSE:
          engine.pause();
          console.log(`触发器 ${this._id} 执行动作: PAUSE`);
          break;

        case TriggerAction.RESUME:
          engine.resume();
          console.log(`触发器 ${this._id} 执行动作: RESUME`);
          break;

        case TriggerAction.SKIP_NODE:
          if (this._targetNodeId) {
            console.log(`触发器 ${this._id} 执行动作: SKIP_NODE ${this._targetNodeId}`);
            // 跳过节点的逻辑由引擎处理
          }
          break;

        default:
          console.warn(`未知的触发器动作: ${this._action}`);
      }
    } catch (error) {
      console.error(`执行触发器动作失败: ${this._id}`, error);
    }
  }

  /**
   * 转换为字符串表示
   */
  toString(): string {
    return `Trigger(id=${this._id}, type=${this._type}, name=${this._name}, action=${this._action}, status=${this._status})`;
  }
}

/**
 * 创建触发器的工厂函数
 */
export function createTrigger(
  id: string,
  type: TriggerType,
  name: string,
  config: TriggerConfig,
  action: TriggerAction,
  targetNodeId?: string
): TriggerImpl {
  return new TriggerImpl(id, type, name, config, action, targetNodeId);
}

/**
 * 创建时间触发器
 */
export function createTimeTrigger(
  id: string,
  name: string,
  config: TimeTriggerConfig,
  action: TriggerAction,
  targetNodeId?: string
): TriggerImpl {
  return new TriggerImpl(id, TriggerType.TIME, name, config, action, targetNodeId);
}

/**
 * 创建事件触发器
 */
export function createEventTrigger(
  id: string,
  name: string,
  config: EventTriggerConfig,
  action: TriggerAction,
  targetNodeId?: string
): TriggerImpl {
  return new TriggerImpl(id, TriggerType.EVENT, name, config, action, targetNodeId);
}

/**
 * 创建状态触发器
 */
export function createStateTrigger(
  id: string,
  name: string,
  config: StateTriggerConfig,
  action: TriggerAction,
  targetNodeId?: string
): TriggerImpl {
  return new TriggerImpl(id, TriggerType.STATE, name, config, action, targetNodeId);
}

/**
 * 创建超时触发器
 */
export function createTimeoutTrigger(
  id: string,
  delay: number,
  targetNodeId?: string
): TriggerImpl {
  return new TriggerImpl(
    id,
    TriggerType.TIME,
    `TimeoutTrigger_${id}`,
    { delay },
    TriggerAction.SKIP_NODE,
    targetNodeId
  );
}

/**
 * 创建错误触发器
 */
export function createErrorTrigger(
  id: string,
  nodeId: string
): TriggerImpl {
  return new TriggerImpl(
    id,
    TriggerType.STATE,
    `ErrorTrigger_${id}`,
    {
      statePath: `${nodeId}.status`,
      expectedValue: 'failed'
    },
    TriggerAction.STOP
  );
}

export { TriggerAction, TriggerType };
