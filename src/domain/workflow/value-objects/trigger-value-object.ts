import { ValueObject } from '../../common/value-objects';
import { ValidationError } from '../../common/exceptions';

/**
 * 触发器类型枚举
 */
export enum TriggerTypeValue {
  TIME = 'time',
  EVENT = 'event',
  STATE = 'state',
}

/**
 * 触发器动作枚举
 */
export enum TriggerActionValue {
  START = 'start',
  STOP = 'stop',
  PAUSE = 'pause',
  RESUME = 'resume',
  SKIP_NODE = 'skip_node',
}

/**
 * 触发器状态枚举
 */
export enum TriggerStatusValue {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  TRIGGERED = 'triggered',
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
      throw new ValidationError(`无效的触发器类型: ${type}`);
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
      throw new ValidationError('触发器类型不能为空');
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
      throw new ValidationError(`无效的触发器动作: ${action}`);
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
      throw new ValidationError('触发器动作不能为空');
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
      throw new ValidationError(`无效的触发器状态: ${status}`);
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
      throw new ValidationError('触发器状态不能为空');
    }
  }

  public override toString(): string {
    return this.props.value;
  }
}
