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
 * Trigger 实体（简化版）
 *
 * 根据DDD原则，Trigger是领域实体，负责：
 * 1. 触发器配置管理
 * 2. 触发器状态管理
 * 3. 触发器验证
 *
 * 不负责：
 * - 触发器执行（由 TriggerExecutionHandler 负责）
 * - 触发器状态转换（由 TriggerExecutionHandler 负责）
 */
export class Trigger extends Entity {
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
    return new Trigger(props);
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
   * 更新触发器配置
   * @param config 新配置
   */
  public updateConfig(config: TriggerConfig): Trigger {
    const newProps: TriggerProps = {
      ...this.props,
      config: { ...config },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return Trigger.fromProps(newProps);
  }

  /**
   * 更新触发器名称
   * @param name 新名称
   */
  public updateName(name: string): Trigger {
    const newProps: TriggerProps = {
      ...this.props,
      name,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return Trigger.fromProps(newProps);
  }

  /**
   * 更新触发器描述
   * @param description 新描述
   */
  public updateDescription(description: string): Trigger {
    const newProps: TriggerProps = {
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return Trigger.fromProps(newProps);
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
   * 获取业务标识
   */
  public getBusinessIdentifier(): string {
    return `trigger:${this.props.id.toString()}`;
  }

  /**
   * 获取触发器属性（用于持久化）
   */
  public toProps(): TriggerProps {
    return this.props;
  }

  /**
   * 获取字符串表示
   */
  public override toString(): string {
    return `Trigger(id=${this.props.id.toString()}, type=${this.props.type.toString()}, name=${this.props.name}, action=${this.props.action.toString()}, status=${this.props.status.toString()})`;
  }
}
