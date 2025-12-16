import { ID } from '@domain/common/value-objects/id';
import { TriggerType } from './trigger-type';
import { TriggerState } from './trigger-state';

/**
 * 触发器上下文接口
 * 提供触发器执行时所需的上下文信息
 */
export interface TriggerContext {
  /** 触发器ID */
  readonly triggerId: string;

  /** 触发器类型 */
  readonly triggerType: TriggerType;

  /** 触发器状态 */
  readonly triggerState: TriggerState;

  /** 关联的图ID */
  readonly workflowId: ID;

  /** 触发时间 */
  readonly triggeredAt: Date;

  /** 触发数据 */
  readonly triggerData: Record<string, any>;

  /** 触发源 */
  readonly triggerSource: string;

  /** 触发元数据 */
  readonly metadata: Record<string, any>;

  /** 执行参数 */
  readonly executionParams: Record<string, any>;
}

/**
 * 触发器上下文构建器
 */
export class TriggerContextBuilder {
  private triggerId: string;
  private triggerType: TriggerType;
  private triggerState: TriggerState;
  private workflowId: ID;
  private triggeredAt: Date;
  private triggerData: Record<string, any>;
  private triggerSource: string;
  private metadata: Record<string, any>;
  private executionParams: Record<string, any>;

  constructor(triggerId: string, triggerType: TriggerType, workflowId: ID) {
    this.triggerId = triggerId;
    this.triggerType = triggerType;
    this.triggerState = TriggerState.ACTIVE;
    this.workflowId = workflowId;
    this.triggeredAt = new Date();
    this.triggerData = {};
    this.triggerSource = '';
    this.metadata = {};
    this.executionParams = {};
  }

  withState(state: TriggerState): TriggerContextBuilder {
    this.triggerState = state;
    return this;
  }

  withTriggeredAt(triggeredAt: Date): TriggerContextBuilder {
    this.triggeredAt = triggeredAt;
    return this;
  }

  withTriggerData(data: Record<string, any>): TriggerContextBuilder {
    this.triggerData = { ...this.triggerData, ...data };
    return this;
  }

  withTriggerSource(source: string): TriggerContextBuilder {
    this.triggerSource = source;
    return this;
  }

  withMetadata(metadata: Record<string, any>): TriggerContextBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  withExecutionParams(params: Record<string, any>): TriggerContextBuilder {
    this.executionParams = { ...this.executionParams, ...params };
    return this;
  }

  build(): TriggerContext {
    return {
      triggerId: this.triggerId,
      triggerType: this.triggerType,
      triggerState: this.triggerState,
      workflowId: this.workflowId,
      triggeredAt: this.triggeredAt,
      triggerData: this.triggerData,
      triggerSource: this.triggerSource,
      metadata: this.metadata,
      executionParams: this.executionParams
    };
  }
}

/**
 * 触发器上下文工具类
 */
export class TriggerContextUtils {
  /**
   * 创建触发器上下文
   */
  static create(
    triggerId: string,
    triggerType: TriggerType,
    workflowId: ID
  ): TriggerContextBuilder {
    return new TriggerContextBuilder(triggerId, triggerType, workflowId);
  }

  /**
   * 克隆触发器上下文
   */
  static clone(context: TriggerContext): TriggerContext {
    return {
      ...context,
      triggerData: { ...context.triggerData },
      metadata: { ...context.metadata },
      executionParams: { ...context.executionParams }
    };
  }

  /**
   * 更新触发器上下文状态
   */
  static withState(context: TriggerContext, state: TriggerState): TriggerContext {
    return {
      ...context,
      triggerState: state
    };
  }

  /**
   * 添加触发数据
   */
  static withTriggerData(context: TriggerContext, data: Record<string, any>): TriggerContext {
    return {
      ...context,
      triggerData: { ...context.triggerData, ...data }
    };
  }

  /**
   * 添加元数据
   */
  static withMetadata(context: TriggerContext, metadata: Record<string, any>): TriggerContext {
    return {
      ...context,
      metadata: { ...context.metadata, ...metadata }
    };
  }

  /**
   * 添加执行参数
   */
  static withExecutionParams(context: TriggerContext, params: Record<string, any>): TriggerContext {
    return {
      ...context,
      executionParams: { ...context.executionParams, ...params }
    };
  }

  /**
   * 检查上下文是否有效
   */
  static isValid(context: TriggerContext): boolean {
    return !!(
      context.triggerId &&
      context.triggerType &&
      context.workflowId &&
      context.triggeredAt
    );
  }

  /**
   * 获取上下文摘要
   */
  static getSummary(context: TriggerContext): string {
    return `Trigger[${context.triggerId}] of type ${context.triggerType} for workflow ${context.workflowId} at ${context.triggeredAt.toISOString()}`;
  }
}