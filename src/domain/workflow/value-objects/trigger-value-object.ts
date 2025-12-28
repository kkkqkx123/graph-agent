import { ValueObject, ID } from '../../common/value-objects';

/**
 * 触发器类型枚举
 */
export enum TriggerTypeValue {
  TIME = 'time',
  EVENT = 'event',
  STATE = 'state'
}

/**
 * 触发器动作枚举
 */
export enum TriggerActionValue {
  START = 'start',
  STOP = 'stop',
  PAUSE = 'pause',
  RESUME = 'resume',
  SKIP_NODE = 'skip_node'
}

/**
 * 触发器状态枚举
 */
export enum TriggerStatusValue {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  TRIGGERED = 'triggered'
}

/**
 * 触发器类型值对象
 */
export class TriggerType extends ValueObject<{ value: TriggerTypeValue }> {
  public static time(): TriggerType {
    return new TriggerType({ value: TriggerTypeValue.TIME });
  }

  public static event(): TriggerType {
    return new TriggerType({ value: TriggerTypeValue.EVENT });
  }

  public static state(): TriggerType {
    return new TriggerType({ value: TriggerTypeValue.STATE });
  }

  public static fromString(type: string): TriggerType {
    if (!Object.values(TriggerTypeValue).includes(type as TriggerTypeValue)) {
      throw new Error(`无效的触发器类型: ${type}`);
    }
    return new TriggerType({ value: type as TriggerTypeValue });
  }

  public getValue(): TriggerTypeValue {
    return this.props.value;
  }

  public isTime(): boolean {
    return this.props.value === TriggerTypeValue.TIME;
  }

  public isEvent(): boolean {
    return this.props.value === TriggerTypeValue.EVENT;
  }

  public isState(): boolean {
    return this.props.value === TriggerTypeValue.STATE;
  }

  public override validate(): void {
    if (!this.props.value) {
      throw new Error('触发器类型不能为空');
    }
  }

  public override toString(): string {
    return this.props.value;
  }
}

/**
 * 触发器动作值对象
 */
export class TriggerAction extends ValueObject<{ value: TriggerActionValue }> {
  public static start(): TriggerAction {
    return new TriggerAction({ value: TriggerActionValue.START });
  }

  public static stop(): TriggerAction {
    return new TriggerAction({ value: TriggerActionValue.STOP });
  }

  public static pause(): TriggerAction {
    return new TriggerAction({ value: TriggerActionValue.PAUSE });
  }

  public static resume(): TriggerAction {
    return new TriggerAction({ value: TriggerActionValue.RESUME });
  }

  public static skipNode(): TriggerAction {
    return new TriggerAction({ value: TriggerActionValue.SKIP_NODE });
  }

  public static fromString(action: string): TriggerAction {
    if (!Object.values(TriggerActionValue).includes(action as TriggerActionValue)) {
      throw new Error(`无效的触发器动作: ${action}`);
    }
    return new TriggerAction({ value: action as TriggerActionValue });
  }

  public getValue(): TriggerActionValue {
    return this.props.value;
  }

  public isStart(): boolean {
    return this.props.value === TriggerActionValue.START;
  }

  public isStop(): boolean {
    return this.props.value === TriggerActionValue.STOP;
  }

  public isPause(): boolean {
    return this.props.value === TriggerActionValue.PAUSE;
  }

  public isResume(): boolean {
    return this.props.value === TriggerActionValue.RESUME;
  }

  public isSkipNode(): boolean {
    return this.props.value === TriggerActionValue.SKIP_NODE;
  }

  public override validate(): void {
    if (!this.props.value) {
      throw new Error('触发器动作不能为空');
    }
  }

  public override toString(): string {
    return this.props.value;
  }
}

/**
 * 触发器状态值对象
 */
export class TriggerStatus extends ValueObject<{ value: TriggerStatusValue }> {
  public static enabled(): TriggerStatus {
    return new TriggerStatus({ value: TriggerStatusValue.ENABLED });
  }

  public static disabled(): TriggerStatus {
    return new TriggerStatus({ value: TriggerStatusValue.DISABLED });
  }

  public static triggered(): TriggerStatus {
    return new TriggerStatus({ value: TriggerStatusValue.TRIGGERED });
  }

  public static fromString(status: string): TriggerStatus {
    if (!Object.values(TriggerStatusValue).includes(status as TriggerStatusValue)) {
      throw new Error(`无效的触发器状态: ${status}`);
    }
    return new TriggerStatus({ value: status as TriggerStatusValue });
  }

  public getValue(): TriggerStatusValue {
    return this.props.value;
  }

  public isEnabled(): boolean {
    return this.props.value === TriggerStatusValue.ENABLED;
  }

  public isDisabled(): boolean {
    return this.props.value === TriggerStatusValue.DISABLED;
  }

  public isTriggered(): boolean {
    return this.props.value === TriggerStatusValue.TRIGGERED;
  }

  public canTrigger(): boolean {
    return this.props.value === TriggerStatusValue.ENABLED;
  }

  public override validate(): void {
    if (!this.props.value) {
      throw new Error('触发器状态不能为空');
    }
  }

  public override toString(): string {
    return this.props.value;
  }
}

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
 * 触发器值对象属性接口
 */
export interface TriggerValueObjectProps {
  readonly id: ID;
  readonly type: TriggerType;
  readonly name: string;
  readonly description?: string;
  readonly config: TriggerConfig;
  readonly action: TriggerAction;
  readonly targetNodeId?: ID;
  readonly status: TriggerStatus;
  readonly triggeredAt?: number;
}

/**
 * 触发器值对象
 * 封装触发器数据，提供类型安全和验证
 */
export class TriggerValueObject extends ValueObject<TriggerValueObjectProps> {
  /**
   * 创建触发器值对象
   */
  public static create(props: TriggerValueObjectProps): TriggerValueObject {
    // 验证
    if (!props.id) {
      throw new Error('触发器ID不能为空');
    }
    if (!props.type) {
      throw new Error('触发器类型不能为空');
    }
    if (!props.name) {
      throw new Error('触发器名称不能为空');
    }
    if (!props.action) {
      throw new Error('触发器动作不能为空');
    }
    if (!props.status) {
      throw new Error('触发器状态不能为空');
    }

    return new TriggerValueObject(props);
  }

  /**
   * 获取触发器ID
   */
  public get id(): ID {
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
   * 获取输入Schema
   * 根据触发器类型返回不同的输入Schema
   */
  public getInputSchema(): Record<string, any> {
    switch (this.props.type.getValue()) {
      case TriggerTypeValue.TIME:
        return {
          type: 'object',
          properties: {
            triggerId: { type: 'string', description: '触发器ID' },
            delay: { type: 'number', description: '延迟毫秒数' },
            interval: { type: 'number', description: '间隔毫秒数' },
            cron: { type: 'string', description: 'Cron表达式' }
          },
          required: ['triggerId']
        };

      case TriggerTypeValue.EVENT:
        return {
          type: 'object',
          properties: {
            triggerId: { type: 'string', description: '触发器ID' },
            eventType: { type: 'string', description: '事件类型' },
            eventDataPattern: { type: 'object', description: '事件数据模式' }
          },
          required: ['triggerId', 'eventType']
        };

      case TriggerTypeValue.STATE:
        return {
          type: 'object',
          properties: {
            triggerId: { type: 'string', description: '触发器ID' },
            statePath: { type: 'string', description: '状态路径' },
            expectedValue: { type: 'any', description: '期望值' }
          },
          required: ['triggerId', 'statePath', 'expectedValue']
        };

      default:
        return {
          type: 'object',
          properties: {},
          required: []
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
        metadata: { type: 'object', description: '元数据' }
      },
      required: ['shouldTrigger', 'reason']
    };
  }

  /**
   * 检查是否可以触发
   */
  public canTrigger(): boolean {
    return this.props.status.canTrigger() && this.props.status.getValue() !== TriggerStatusValue.TRIGGERED;
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
   * 验证值对象的有效性
   */
  public override validate(): void {
    if (!this.props.id) {
      throw new Error('触发器ID不能为空');
    }
    if (!this.props.type) {
      throw new Error('触发器类型不能为空');
    }
    if (!this.props.name) {
      throw new Error('触发器名称不能为空');
    }
    if (!this.props.action) {
      throw new Error('触发器动作不能为空');
    }
    if (!this.props.status) {
      throw new Error('触发器状态不能为空');
    }

    this.props.type.validate();
    this.props.action.validate();
    this.props.status.validate();

    // 验证配置
    if (this.props.type.isTime()) {
      const hasTimeConfig = this.props.config.delay !== undefined ||
                           this.props.config.interval !== undefined ||
                           this.props.config.cron !== undefined;
      if (!hasTimeConfig) {
        throw new Error('时间触发器必须配置 delay、interval 或 cron');
      }
    }

    if (this.props.type.isEvent()) {
      if (!this.props.config.eventType) {
        throw new Error('事件触发器必须配置 eventType');
      }
    }

    if (this.props.type.isState()) {
      if (!this.props.config.statePath) {
        throw new Error('状态触发器必须配置 statePath');
      }
      if (this.props.config.expectedValue === undefined) {
        throw new Error('状态触发器必须配置 expectedValue');
      }
    }

    // 验证动作和目标节点
    if (this.props.action.isSkipNode() && !this.props.targetNodeId) {
      throw new Error('SKIP_NODE 动作必须指定目标节点');
    }
  }

  /**
   * 获取字符串表示
   */
  public override toString(): string {
    return `TriggerValueObject(id=${this.props.id.toString()}, type=${this.props.type.toString()}, name=${this.props.name}, action=${this.props.action.toString()}, status=${this.props.status.toString()})`;
  }
}