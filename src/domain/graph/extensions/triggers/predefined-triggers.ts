import { BaseTrigger, TriggerConfig } from './base-trigger';
import { TriggerType } from './trigger-type';
import { TriggerContext } from './trigger-context';
import { TriggerExecutionResult, TriggerExecutionResultUtils } from './trigger-execution-result';

/**
 * 时间触发器配置
 */
export interface TimeTriggerConfig {
  /** 触发时间表达式（cron表达式） */
  readonly cronExpression: string;
  /** 时区 */
  readonly timezone?: string;
  /** 是否立即触发一次 */
  readonly triggerImmediately?: boolean;
}

/**
 * 时间触发器
 * 基于时间计划触发的触发器
 */
export class TimeTrigger extends BaseTrigger {
  private readonly timeConfig: TimeTriggerConfig;
  private timer?: NodeJS.Timeout;

  constructor(config: TriggerConfig & { config: TimeTriggerConfig }) {
    super(config);
    this.timeConfig = config.config;
  }

  /**
   * 检查触发条件
   */
  async checkCondition(context: TriggerContext): Promise<boolean> {
    // 时间触发器的条件检查由内部定时器处理
    return true;
  }

  /**
   * 激活触发器
   */
  protected async onActivate(): Promise<void> {
    if (this.timeConfig.triggerImmediately) {
      // 立即触发一次
      const context = TriggerContextUtils.create(
        this.getId(),
        this.getType(),
        this.getGraphId()
      ).withTriggerSource('immediate').build();
      
      await this.trigger(context);
    }

    // 设置定时器
    this.setupTimer();
  }

  /**
   * 停用触发器
   */
  protected async onDeactivate(): Promise<void> {
    this.clearTimer();
  }

  /**
   * 暂停触发器
   */
  protected async onPause(): Promise<void> {
    this.clearTimer();
  }

  /**
   * 恢复触发器
   */
  protected async onResume(): Promise<void> {
    this.setupTimer();
  }

  /**
   * 禁用触发器
   */
  protected async onDisable(): Promise<void> {
    this.clearTimer();
  }

  /**
   * 触发执行
   */
  protected async onTrigger(context: TriggerContext): Promise<TriggerExecutionResult> {
    try {
      // 执行时间触发器的具体逻辑
      const result = await this.executeTimeTrigger(context);
      return TriggerExecutionResultUtils.success('时间触发器执行成功', result).build();
    } catch (error) {
      return TriggerExecutionResultUtils.failure('时间触发器执行失败', error as Error).build();
    }
  }

  /**
   * 重置触发器
   */
  protected async onReset(): Promise<void> {
    this.clearTimer();
  }

  /**
   * 设置定时器
   */
  private setupTimer(): void {
    // 这里应该实现cron表达式的解析和定时器设置
    // 简化实现，实际项目中可以使用node-cron等库
    const interval = this.parseCronExpression(this.timeConfig.cronExpression);
    this.timer = setInterval(async () => {
      const context = TriggerContextUtils.create(
        this.getId(),
        this.getType(),
        this.getGraphId()
      ).withTriggerSource('timer').build();
      
      await this.trigger(context);
    }, interval);
  }

  /**
   * 清除定时器
   */
  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * 解析cron表达式（简化实现）
   */
  private parseCronExpression(cronExpression: string): number {
    // 简化实现，实际项目中应该使用完整的cron解析库
    // 这里假设cron表达式是简单的间隔时间（秒）
    const seconds = parseInt(cronExpression);
    return isNaN(seconds) ? 60000 : seconds * 1000; // 默认1分钟
  }

  /**
   * 执行时间触发器的具体逻辑
   */
  private async executeTimeTrigger(context: TriggerContext): Promise<Record<string, any>> {
    // 子类可以重写此方法实现具体的触发逻辑
    return {
      triggeredAt: context.triggeredAt,
      cronExpression: this.timeConfig.cronExpression,
      timezone: this.timeConfig.timezone || 'UTC'
    };
  }
}

/**
 * 事件触发器配置
 */
export interface EventTriggerConfig {
  /** 监听的事件类型 */
  readonly eventType: string;
  /** 事件源 */
  readonly eventSource?: string;
  /** 事件过滤器 */
  readonly eventFilter?: Record<string, any>;
}

/**
 * 事件触发器
 * 基于事件触发的触发器
 */
export class EventTrigger extends BaseTrigger {
  private readonly eventConfig: EventTriggerConfig;
  private eventListeners: Map<string, Function> = new Map();

  constructor(config: TriggerConfig & { config: EventTriggerConfig }) {
    super(config);
    this.eventConfig = config.config;
  }

  /**
   * 检查触发条件
   */
  async checkCondition(context: TriggerContext): Promise<boolean> {
    const eventData = context.triggerData;
    
    // 检查事件类型
    if (eventData.eventType !== this.eventConfig.eventType) {
      return false;
    }

    // 检查事件源
    if (this.eventConfig.eventSource && eventData.eventSource !== this.eventConfig.eventSource) {
      return false;
    }

    // 检查事件过滤器
    if (this.eventConfig.eventFilter) {
      for (const [key, value] of Object.entries(this.eventConfig.eventFilter)) {
        if (eventData[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 激活触发器
   */
  protected async onActivate(): Promise<void> {
    this.setupEventListeners();
  }

  /**
   * 停用触发器
   */
  protected async onDeactivate(): Promise<void> {
    this.clearEventListeners();
  }

  /**
   * 暂停触发器
   */
  protected async onPause(): Promise<void> {
    this.clearEventListeners();
  }

  /**
   * 恢复触发器
   */
  protected async onResume(): Promise<void> {
    this.setupEventListeners();
  }

  /**
   * 禁用触发器
   */
  protected async onDisable(): Promise<void> {
    this.clearEventListeners();
  }

  /**
   * 触发执行
   */
  protected async onTrigger(context: TriggerContext): Promise<TriggerExecutionResult> {
    try {
      // 执行事件触发器的具体逻辑
      const result = await this.executeEventTrigger(context);
      return TriggerExecutionResultUtils.success('事件触发器执行成功', result).build();
    } catch (error) {
      return TriggerExecutionResultUtils.failure('事件触发器执行失败', error as Error).build();
    }
  }

  /**
   * 重置触发器
   */
  protected async onReset(): Promise<void> {
    this.clearEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 这里应该实现具体的事件监听逻辑
    // 简化实现，实际项目中可能需要使用EventEmitter等
    const listener = (eventData: any) => {
      const context = TriggerContextUtils.create(
        this.getId(),
        this.getType(),
        this.getGraphId()
      ).withTriggerData(eventData)
        .withTriggerSource('event')
        .build();
      
      this.trigger(context);
    };

    this.eventListeners.set(this.eventConfig.eventType, listener);
  }

  /**
   * 清除事件监听器
   */
  private clearEventListeners(): void {
    // 这里应该实现具体的事件监听器清除逻辑
    this.eventListeners.clear();
  }

  /**
   * 执行事件触发器的具体逻辑
   */
  private async executeEventTrigger(context: TriggerContext): Promise<Record<string, any>> {
    // 子类可以重写此方法实现具体的触发逻辑
    return {
      triggeredAt: context.triggeredAt,
      eventType: this.eventConfig.eventType,
      eventSource: this.eventConfig.eventSource,
      eventData: context.triggerData
    };
  }
}

/**
 * 条件触发器配置
 */
export interface ConditionTriggerConfig {
  /** 条件表达式 */
  readonly condition: string;
  /** 条件评估间隔（毫秒） */
  readonly evaluationInterval?: number;
}

/**
 * 条件触发器
 * 基于条件满足触发的触发器
 */
export class ConditionTrigger extends BaseTrigger {
  private readonly conditionConfig: ConditionTriggerConfig;
  private evaluationTimer?: NodeJS.Timeout;

  constructor(config: TriggerConfig & { config: ConditionTriggerConfig }) {
    super(config);
    this.conditionConfig = config.config;
  }

  /**
   * 检查触发条件
   */
  async checkCondition(context: TriggerContext): Promise<boolean> {
    try {
      // 评估条件表达式
      return await this.evaluateCondition(context);
    } catch (error) {
      return false;
    }
  }

  /**
   * 激活触发器
   */
  protected async onActivate(): Promise<void> {
    this.setupEvaluationTimer();
  }

  /**
   * 停用触发器
   */
  protected async onDeactivate(): Promise<void> {
    this.clearEvaluationTimer();
  }

  /**
   * 暂停触发器
   */
  protected async onPause(): Promise<void> {
    this.clearEvaluationTimer();
  }

  /**
   * 恢复触发器
   */
  protected async onResume(): Promise<void> {
    this.setupEvaluationTimer();
  }

  /**
   * 禁用触发器
   */
  protected async onDisable(): Promise<void> {
    this.clearEvaluationTimer();
  }

  /**
   * 触发执行
   */
  protected async onTrigger(context: TriggerContext): Promise<TriggerExecutionResult> {
    try {
      // 执行条件触发器的具体逻辑
      const result = await this.executeConditionTrigger(context);
      return TriggerExecutionResultUtils.success('条件触发器执行成功', result).build();
    } catch (error) {
      return TriggerExecutionResultUtils.failure('条件触发器执行失败', error as Error).build();
    }
  }

  /**
   * 重置触发器
   */
  protected async onReset(): Promise<void> {
    this.clearEvaluationTimer();
  }

  /**
   * 设置评估定时器
   */
  private setupEvaluationTimer(): void {
    const interval = this.conditionConfig.evaluationInterval || 60000; // 默认1分钟
    this.evaluationTimer = setInterval(async () => {
      const context = TriggerContextUtils.create(
        this.getId(),
        this.getType(),
        this.getGraphId()
      ).withTriggerSource('condition-evaluation').build();
      
      const shouldTrigger = await this.checkCondition(context);
      if (shouldTrigger) {
        await this.trigger(context);
      }
    }, interval);
  }

  /**
   * 清除评估定时器
   */
  private clearEvaluationTimer(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = undefined;
    }
  }

  /**
   * 评估条件表达式
   */
  private async evaluateCondition(context: TriggerContext): Promise<boolean> {
    // 这里应该实现条件表达式的评估逻辑
    // 简化实现，实际项目中可能需要使用表达式解析库
    try {
      // 简单的条件评估示例
      const condition = this.conditionConfig.condition;
      const data = context.triggerData;
      
      // 这里应该有更安全的表达式评估逻辑
      // 简化实现，实际项目中应该使用专门的表达式解析库
      return eval(condition);
    } catch (error) {
      return false;
    }
  }

  /**
   * 执行条件触发器的具体逻辑
   */
  private async executeConditionTrigger(context: TriggerContext): Promise<Record<string, any>> {
    // 子类可以重写此方法实现具体的触发逻辑
    return {
      triggeredAt: context.triggeredAt,
      condition: this.conditionConfig.condition,
      evaluationResult: true
    };
  }
}

/**
 * 手动触发器配置
 */
export interface ManualTriggerConfig {
  /** 是否需要确认 */
  readonly requireConfirmation?: boolean;
  /** 确认消息 */
  readonly confirmationMessage?: string;
}

/**
 * 手动触发器
 * 手动触发的触发器
 */
export class ManualTrigger extends BaseTrigger {
  private readonly manualConfig: ManualTriggerConfig;

  constructor(config: TriggerConfig & { config: ManualTriggerConfig }) {
    super(config);
    this.manualConfig = config.config;
  }

  /**
   * 检查触发条件
   */
  async checkCondition(context: TriggerContext): Promise<boolean> {
    // 手动触发器总是返回true，因为触发是手动的
    return true;
  }

  /**
   * 触发执行
   */
  protected async onTrigger(context: TriggerContext): Promise<TriggerExecutionResult> {
    try {
      // 检查是否需要确认
      if (this.manualConfig.requireConfirmation) {
        const confirmed = await this.requestConfirmation(context);
        if (!confirmed) {
          return TriggerExecutionResultUtils.failure('用户取消了触发操作').build();
        }
      }

      // 执行手动触发器的具体逻辑
      const result = await this.executeManualTrigger(context);
      return TriggerExecutionResultUtils.success('手动触发器执行成功', result).build();
    } catch (error) {
      return TriggerExecutionResultUtils.failure('手动触发器执行失败', error as Error).build();
    }
  }

  /**
   * 请求确认
   */
  private async requestConfirmation(context: TriggerContext): Promise<boolean> {
    // 这里应该实现确认逻辑
    // 简化实现，实际项目中可能需要通过UI或其他方式请求确认
    const message = this.manualConfig.confirmationMessage || '确认要触发此触发器吗？';
    console.log(`[ManualTrigger] ${message}`);
    return true; // 简化实现，总是返回true
  }

  /**
   * 执行手动触发器的具体逻辑
   */
  private async executeManualTrigger(context: TriggerContext): Promise<Record<string, any>> {
    // 子类可以重写此方法实现具体的触发逻辑
    return {
      triggeredAt: context.triggeredAt,
      triggeredBy: context.triggerSource || 'manual',
      requireConfirmation: this.manualConfig.requireConfirmation || false
    };
  }
}