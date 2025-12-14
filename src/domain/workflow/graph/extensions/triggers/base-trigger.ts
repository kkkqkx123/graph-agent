import { ID } from '../../../../common/value-objects/id';
import { TriggerType } from './trigger-type';
import { TriggerState } from './trigger-state';
import { TriggerContext } from './trigger-context';
import { TriggerExecutionResult, TriggerExecutionResultUtils } from './trigger-execution-result';

/**
 * 触发器配置接口
 */
export interface TriggerConfig {
  /** 触发器ID */
  readonly id: string;

  /** 触发器名称 */
  readonly name: string;

  /** 触发器描述 */
  readonly description?: string;

  /** 触发器类型 */
  readonly type: TriggerType;

  /** 关联的图ID */
  readonly graphId: ID;

  /** 是否启用 */
  readonly enabled: boolean;

  /** 触发器配置参数 */
  readonly config: Record<string, any>;

  /** 触发器元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 基础触发器抽象类
 * 定义了所有触发器必须实现的基本接口
 */
export abstract class BaseTrigger {
  /** 触发器配置 */
  protected readonly config: TriggerConfig;

  /** 触发器状态 */
  protected state: TriggerState;

  /** 创建时间 */
  protected readonly createdAt: Date;

  /** 最后更新时间 */
  protected updatedAt: Date;

  /** 最后触发时间 */
  protected lastTriggeredAt?: Date;

  /** 触发次数 */
  protected triggerCount: number;

  constructor(config: TriggerConfig) {
    this.config = config;
    this.state = config.enabled ? TriggerState.ACTIVE : TriggerState.INACTIVE;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.triggerCount = 0;
  }

  /**
   * 获取触发器ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * 获取触发器名称
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * 获取触发器描述
   */
  getDescription(): string | undefined {
    return this.config.description;
  }

  /**
   * 获取触发器类型
   */
  getType(): TriggerType {
    return this.config.type;
  }

  /**
   * 获取关联的图ID
   */
  getGraphId(): ID {
    return this.config.graphId;
  }

  /**
   * 获取触发器状态
   */
  getState(): TriggerState {
    return this.state;
  }

  /**
   * 获取创建时间
   */
  getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * 获取最后更新时间
   */
  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * 获取最后触发时间
   */
  getLastTriggeredAt(): Date | undefined {
    return this.lastTriggeredAt;
  }

  /**
   * 获取触发次数
   */
  getTriggerCount(): number {
    return this.triggerCount;
  }

  /**
   * 获取配置参数
   */
  getConfig(): Record<string, any> {
    return { ...this.config.config };
  }

  /**
   * 获取元数据
   */
  getMetadata(): Record<string, any> {
    return { ...this.config.metadata };
  }

  /**
   * 检查触发器是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 检查触发器是否活跃
   */
  isActive(): boolean {
    return this.state === TriggerState.ACTIVE;
  }

  /**
   * 激活触发器
   */
  async activate(): Promise<TriggerExecutionResult> {
    if (!this.config.enabled) {
      return TriggerExecutionResultUtils.failure('触发器已禁用，无法激活').build();
    }

    try {
      await this.onActivate();
      this.state = TriggerState.ACTIVE;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.success('触发器激活成功').build();
    } catch (error) {
      this.state = TriggerState.ERROR;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.failure('触发器激活失败', error as Error).build();
    }
  }

  /**
   * 停用触发器
   */
  async deactivate(): Promise<TriggerExecutionResult> {
    try {
      await this.onDeactivate();
      this.state = TriggerState.INACTIVE;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.success('触发器停用成功').build();
    } catch (error) {
      this.state = TriggerState.ERROR;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.failure('触发器停用失败', error as Error).build();
    }
  }

  /**
   * 暂停触发器
   */
  async pause(): Promise<TriggerExecutionResult> {
    if (this.state !== TriggerState.ACTIVE) {
      return TriggerExecutionResultUtils.failure('只有活跃的触发器才能暂停').build();
    }

    try {
      await this.onPause();
      this.state = TriggerState.PAUSED;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.paused('触发器暂停成功').build();
    } catch (error) {
      this.state = TriggerState.ERROR;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.failure('触发器暂停失败', error as Error).build();
    }
  }

  /**
   * 恢复触发器
   */
  async resume(): Promise<TriggerExecutionResult> {
    if (this.state !== TriggerState.PAUSED) {
      return TriggerExecutionResultUtils.failure('只有暂停的触发器才能恢复').build();
    }

    try {
      await this.onResume();
      this.state = TriggerState.ACTIVE;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.success('触发器恢复成功').build();
    } catch (error) {
      this.state = TriggerState.ERROR;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.failure('触发器恢复失败', error as Error).build();
    }
  }

  /**
   * 禁用触发器
   */
  async disable(): Promise<TriggerExecutionResult> {
    try {
      await this.onDisable();
      this.state = TriggerState.DISABLED;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.disabled('触发器禁用成功').build();
    } catch (error) {
      this.state = TriggerState.ERROR;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.failure('触发器禁用失败', error as Error).build();
    }
  }

  /**
   * 启用触发器
   */
  async enable(): Promise<TriggerExecutionResult> {
    if (this.state !== TriggerState.DISABLED) {
      return TriggerExecutionResultUtils.failure('只有禁用的触发器才能启用').build();
    }

    try {
      await this.onEnable();
      this.state = TriggerState.ACTIVE;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.success('触发器启用成功').build();
    } catch (error) {
      this.state = TriggerState.ERROR;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.failure('触发器启用失败', error as Error).build();
    }
  }

  /**
   * 触发执行
   */
  async trigger(context: TriggerContext): Promise<TriggerExecutionResult> {
    if (this.state !== TriggerState.ACTIVE) {
      return TriggerExecutionResultUtils.failure('触发器未处于活跃状态').build();
    }

    this.state = TriggerState.TRIGGERING;
    this.updateTimestamp();

    try {
      const result = await this.onTrigger(context);
      this.triggerCount++;
      this.lastTriggeredAt = new Date();
      this.state = result.state;
      this.updateTimestamp();
      return result;
    } catch (error) {
      this.state = TriggerState.ERROR;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.failure('触发器执行失败', error as Error).build();
    }
  }

  /**
   * 重置触发器
   */
  async reset(): Promise<TriggerExecutionResult> {
    try {
      await this.onReset();
      this.triggerCount = 0;
      this.lastTriggeredAt = undefined;
      this.state = this.config.enabled ? TriggerState.ACTIVE : TriggerState.INACTIVE;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.success('触发器重置成功').build();
    } catch (error) {
      this.state = TriggerState.ERROR;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.failure('触发器重置失败', error as Error).build();
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: Partial<TriggerConfig>): Promise<TriggerExecutionResult> {
    try {
      await this.onUpdateConfig(newConfig);
      this.updateTimestamp();
      return TriggerExecutionResultUtils.success('触发器配置更新成功').build();
    } catch (error) {
      this.state = TriggerState.ERROR;
      this.updateTimestamp();
      return TriggerExecutionResultUtils.failure('触发器配置更新失败', error as Error).build();
    }
  }

  /**
   * 检查触发条件
   */
  abstract checkCondition(context: TriggerContext): Promise<boolean>;

  /**
   * 激活时的回调
   */
  protected async onActivate(): Promise<void> {
    // 子类可以重写此方法
  }

  /**
   * 停用时的回调
   */
  protected async onDeactivate(): Promise<void> {
    // 子类可以重写此方法
  }

  /**
   * 暂停时的回调
   */
  protected async onPause(): Promise<void> {
    // 子类可以重写此方法
  }

  /**
   * 恢复时的回调
   */
  protected async onResume(): Promise<void> {
    // 子类可以重写此方法
  }

  /**
   * 禁用时的回调
   */
  protected async onDisable(): Promise<void> {
    // 子类可以重写此方法
  }

  /**
   * 启用时的回调
   */
  protected async onEnable(): Promise<void> {
    // 子类可以重写此方法
  }

  /**
   * 触发执行时的回调
   */
  protected abstract onTrigger(context: TriggerContext): Promise<TriggerExecutionResult>;

  /**
   * 重置时的回调
   */
  protected async onReset(): Promise<void> {
    // 子类可以重写此方法
  }

  /**
   * 更新配置时的回调
   */
  protected async onUpdateConfig(newConfig: Partial<TriggerConfig>): Promise<void> {
    // 子类可以重写此方法
  }

  /**
   * 更新时间戳
   */
  private updateTimestamp(): void {
    this.updatedAt = new Date();
  }

  /**
   * 获取触发器摘要
   */
  getSummary(): string {
    return `Trigger[${this.config.id}] ${this.config.name} (${this.config.type}) - State: ${this.state}, Triggers: ${this.triggerCount}`;
  }
}