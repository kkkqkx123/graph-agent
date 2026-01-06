import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import { TriggerType, TriggerAction, TriggerStatus } from '../value-objects/trigger-value-object';

/**
 * 触发器配置接口
 */
export interface TriggerConfig {
  delay?: number;
  interval?: number;
  cron?: string;
  eventType?: string;
  eventDataPattern?: Record<string, unknown>;
  statePath?: string;
  expectedValue?: unknown;
}

/**
 * 触发器属性接口
 */
export interface TriggerProps {
  readonly id: ID;
  readonly type: TriggerType;
  readonly name: string;
  readonly description?: string;
  readonly config: TriggerConfig;
  readonly action: TriggerAction;
  readonly targetNodeId?: ID;
  readonly status: TriggerStatus;
  readonly triggeredAt?: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * 触发器验证结果接口
 */
export interface TriggerValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * 触发器执行结果接口
 */
export interface TriggerExecutionResult {
  readonly shouldTrigger: boolean;
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * 触发器上下文接口
 */
export interface TriggerContext {
  readonly workflowId: string;
  readonly currentTime: number;
  readonly state?: Record<string, unknown>;
  readonly events?: Array<{ type: string; data: unknown; timestamp: number }>;
}

/**
 * Trigger 实体
 *
 * 根据DDD原则，Trigger是领域实体，负责：
 * 1. 触发器生命周期管理（创建、启用、禁用、触发）
 * 2. 触发器状态管理（ENABLED/DISABLED/TRIGGERED）
 * 3. 触发器验证和评估
 * 4. 触发器配置管理
 */
export abstract class Trigger extends Entity {
  protected readonly props: TriggerProps;

  /**
   * 构造函数
   * @param props 触发器属性
   */
  protected constructor(props: TriggerProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 从已有属性重建触发器
   * @param props 触发器属性
   * @returns 触发器实例
   */
  public static fromProps(props: TriggerProps): Trigger {
    // 由子类实现
    throw new Error('Trigger.fromProps() 必须由子类实现');
  }

  /**
   * 获取触发器ID
   */
  public get triggerId(): ID {
    return this.props.id;
  }

  /**
   * 获取触发器类型
   */
  public get type(): TriggerType {
    return this.props.type;
  }

  /**
   * 获取触发器名称
   */
  public get name(): string {
    return this.props.name;
  }

  /**
   * 获取触发器描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取触发器配置
   */
  public get config(): TriggerConfig {
    return { ...this.props.config };
  }

  /**
   * 获取触发器动作
   */
  public get action(): TriggerAction {
    return this.props.action;
  }

  /**
   * 获取目标节点ID
   */
  public get targetNodeId(): ID | undefined {
    return this.props.targetNodeId;
  }

  /**
   * 获取触发器状态
   */
  public get status(): TriggerStatus {
    return this.props.status;
  }

  /**
   * 获取触发时间
   */
  public get triggeredAt(): number | undefined {
    return this.props.triggeredAt;
  }

  /**
   * 检查是否可以触发
   */
  public canTrigger(): boolean {
    return this.props.status.canTrigger() && this.props.status.getValue() !== 'triggered';
  }

  /**
   * 检查是否为时间触发器
   */
  public isTimeTrigger(): boolean {
    return this.props.type.isTime();
  }

  /**
   * 检查是否为事件触发器
   */
  public isEventTrigger(): boolean {
    return this.props.type.isEvent();
  }

  /**
   * 检查是否为状态触发器
   */
  public isStateTrigger(): boolean {
    return this.props.type.isState();
  }

  /**
   * 检查是否需要目标节点
   */
  public requiresTargetNode(): boolean {
    return this.props.action.isSkipNode();
  }

  /**
   * 启用触发器
   */
  public enable(): void {
    if (this.props.status.isEnabled()) {
      return;
    }

    (this.props as any).status = TriggerStatus.enabled();
    this.update();
  }

  /**
   * 禁用触发器
   */
  public disable(): void {
    if (this.props.status.isDisabled()) {
      return;
    }

    (this.props as any).status = TriggerStatus.disabled();
    this.update();
  }

  /**
   * 标记为已触发
   */
  public markAsTriggered(): void {
    if (!this.canTrigger()) {
      throw new Error('触发器不能被触发');
    }

    (this.props as any).status = TriggerStatus.triggered();
    (this.props as any).triggeredAt = Date.now();
    this.update();
  }

  /**
   * 重置触发器状态
   */
  public reset(): void {
    (this.props as any).status = TriggerStatus.enabled();
    (this.props as any).triggeredAt = undefined;
    this.update();
  }

  /**
   * 更新触发器配置
   * @param config 新配置
   */
  public updateConfig(config: TriggerConfig): void {
    (this.props as any).config = { ...config };
    this.update();
  }

  /**
   * 更新触发器名称
   * @param name 新名称
   */
  public updateName(name: string): void {
    (this.props as any).name = name;
    this.update();
  }

  /**
   * 更新触发器描述
   * @param description 新描述
   */
  public updateDescription(description: string): void {
    (this.props as any).description = description;
    this.update();
  }

  /**
   * 获取输入Schema
   * 根据触发器类型返回不同的输入Schema
   */
  public getInputSchema(): Record<string, any> {
    switch (this.props.type.getValue()) {
      case 'time':
        return {
          type: 'object',
          properties: {
            triggerId: { type: 'string', description: '触发器ID' },
            delay: { type: 'number', description: '延迟毫秒数' },
            interval: { type: 'number', description: '间隔毫秒数' },
            cron: { type: 'string', description: 'Cron表达式' },
          },
          required: ['triggerId'],
        };

      case 'event':
        return {
          type: 'object',
          properties: {
            triggerId: { type: 'string', description: '触发器ID' },
            eventType: { type: 'string', description: '事件类型' },
            eventDataPattern: { type: 'object', description: '事件数据模式' },
          },
          required: ['triggerId', 'eventType'],
        };

      case 'state':
        return {
          type: 'object',
          properties: {
            triggerId: { type: 'string', description: '触发器ID' },
            statePath: { type: 'string', description: '状态路径' },
            expectedValue: { type: 'any', description: '期望值' },
          },
          required: ['triggerId', 'statePath', 'expectedValue'],
        };

      default:
        return {
          type: 'object',
          properties: {},
          required: [],
        };
    }
  }

  /**
   * 获取输出Schema
   */
  public getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        shouldTrigger: { type: 'boolean', description: '是否应该触发' },
        reason: { type: 'string', description: '原因说明' },
        metadata: { type: 'object', description: '元数据' },
      },
      required: ['shouldTrigger', 'reason'],
    };
  }

  /**
   * 获取触发器元数据
   */
  public getMetadata(): Record<string, unknown> {
    return {
      triggerId: this.props.id.toString(),
      type: this.props.type.toString(),
      name: this.props.name,
      description: this.props.description,
      action: this.props.action.toString(),
      status: this.props.status.toString(),
      targetNodeId: this.props.targetNodeId?.toString(),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      version: this.props.version.toString(),
    };
  }

  /**
   * 验证触发器
   * @returns 验证结果
   */
  public validate(): TriggerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证基本属性
    if (!this.props.name || this.props.name.trim().length === 0) {
      errors.push('触发器名称不能为空');
    }

    // 验证配置
    if (this.props.type.isTime()) {
      const hasTimeConfig =
        this.props.config.delay !== undefined ||
        this.props.config.interval !== undefined ||
        this.props.config.cron !== undefined;
      if (!hasTimeConfig) {
        errors.push('时间触发器必须配置 delay、interval 或 cron');
      }
    }

    if (this.props.type.isEvent()) {
      if (!this.props.config.eventType) {
        errors.push('事件触发器必须配置 eventType');
      }
    }

    if (this.props.type.isState()) {
      if (!this.props.config.statePath) {
        errors.push('状态触发器必须配置 statePath');
      }
      if (this.props.config.expectedValue === undefined) {
        errors.push('状态触发器必须配置 expectedValue');
      }
    }

    // 验证动作和目标节点
    if (this.props.action.isSkipNode() && !this.props.targetNodeId) {
      errors.push('SKIP_NODE 动作必须指定目标节点');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 评估触发器（抽象方法，由子类实现）
   * @param context 触发器上下文
   * @returns 执行结果
   */
  public abstract evaluate(context: TriggerContext): Promise<TriggerExecutionResult>;

  /**
   * 更新实体
   */
  protected override update(): void {
    (this.props as any).updatedAt = Timestamp.now();
    (this.props as any).version = this.props.version.nextPatch();
    super.update();
  }

  /**
   * 获取字符串表示
   */
  public override toString(): string {
    return `Trigger(id=${this.props.id.toString()}, type=${this.props.type.toString()}, name=${this.props.name}, action=${this.props.action.toString()}, status=${this.props.status.toString()})`;
  }
}
