/**
 * TriggerTemplateBuilder - 触发器模板构建器
 * 提供流畅的链式API来创建和注册触发器模板
 */

import type { TriggerTemplate, TriggerCondition, TriggerAction } from '@modular-agent/types';
import { EventType, TriggerActionType } from '@modular-agent/types';
import { TemplateBuilder } from './template-builder';
import { SingletonRegistry } from '../../core/execution/context/singleton-registry';

/**
 * TriggerTemplateBuilder - 触发器模板构建器
 */
export class TriggerTemplateBuilder extends TemplateBuilder<TriggerTemplate> {
  private _name: string;
  private _condition?: TriggerCondition;
  private _action?: TriggerAction;
  private _enabled?: boolean;
  private _maxTriggers?: number;

  private constructor(name: string) {
    super();
    this._name = name;
  }

  /**
   * 创建新的TriggerTemplateBuilder实例
   * @param name 模板名称
   * @returns TriggerTemplateBuilder实例
   */
  static create(name: string): TriggerTemplateBuilder {
    return new TriggerTemplateBuilder(name);
  }

  /**
   * 设置触发条件
   * @param condition 触发条件
   * @returns this
   */
  condition(condition: TriggerCondition): this {
    this._condition = condition;
    this.updateTimestamp();
    return this;
  }

  /**
   * 设置触发动作
   * @param action 触发动作
   * @returns this
   */
  action(action: TriggerAction): this {
    this._action = action;
    this.updateTimestamp();
    return this;
  }

  /**
   * 设置是否启用
   * @param enabled 是否启用
   * @returns this
   */
  enabled(enabled: boolean): this {
    this._enabled = enabled;
    this.updateTimestamp();
    return this;
  }

  /**
   * 设置最大触发次数
   * @param max 最大触发次数（0表示无限制）
   * @returns this
   */
  maxTriggers(max: number): this {
    this._maxTriggers = max;
    this.updateTimestamp();
    return this;
  }

  /**
   * 基于事件类型设置触发条件（类型安全）
   * @param eventType 事件类型
   * @param eventName 自定义事件名称（仅用于 NODE_CUSTOM_EVENT 事件）
   * @param metadata 条件元数据
   * @returns this
   */
  withEventCondition(eventType: EventType, eventName?: string, metadata?: any): this {
    this._condition = {
      eventType,
      ...(eventName && { eventName }),
      ...(metadata && { metadata })
    };
    this.updateTimestamp();
    return this;
  }

  /**
   * 设置触发动作（类型安全）
   * @param type 动作类型
   * @param parameters 动作参数
   * @param metadata 动作元数据
   * @returns this
   */
  withAction(type: TriggerActionType, parameters: Record<string, any> = {}, metadata?: any): this {
    this._action = {
      type,
      parameters,
      ...(metadata && { metadata })
    };
    this.updateTimestamp();
    return this;
  }

  /**
   * 设置启动工作流动动作
   * @param workflowId 要启动的工作流ID
   * @param parameters 额外参数
   * @returns this
   */
  startWorkflow(workflowId: string, parameters: Record<string, any> = {}): this {
    return this.withAction(TriggerActionType.START_WORKFLOW, {
      workflowId,
      ...parameters
    });
  }

  /**
   * 设置停止线程动作
   * @param reason 停止原因
   * @param parameters 额外参数
   * @returns this
   */
  stopThread(reason?: string, parameters: Record<string, any> = {}): this {
    return this.withAction(TriggerActionType.STOP_THREAD, {
      ...(reason && { reason }),
      ...parameters
    });
  }

  /**
   * 设置执行触发子工作流动动作
   * @param triggeredWorkflowId 触发子工作流ID
   * @param waitForCompletion 是否等待完成
   * @param parameters 额外参数
   * @returns this
   */
  executeTriggeredSubgraph(triggeredWorkflowId: string, waitForCompletion: boolean = true, parameters: Record<string, any> = {}): this {
    return this.withAction(TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH, {
      triggeredWorkflowId,
      waitForCompletion,
      ...parameters
    });
  }

  /**
   * 注册模板到触发器模板注册表
   * @param template 触发器模板
   */
  protected registerTemplate(template: TriggerTemplate): void {
    const triggerTemplateRegistry = SingletonRegistry.getTriggerTemplateRegistry();
    triggerTemplateRegistry.register(template);
  }

  /**
   * 构建触发器模板
   * @returns 触发器模板
   */
  build(): TriggerTemplate {
    // 验证必需字段
    if (!this._name) {
      throw new Error('模板名称不能为空');
    }
    if (!this._condition) {
      throw new Error('触发条件不能为空');
    }
    if (!this._action) {
      throw new Error('触发动作不能为空');
    }

    return {
      name: this._name,
      description: this._description,
      condition: this._condition,
      action: this._action,
      enabled: this._enabled !== undefined ? this._enabled : true,
      maxTriggers: this._maxTriggers,
      metadata: this._metadata,
      createdAt: this.getCreatedAt(),
      updatedAt: this.getUpdatedAt()
    };
  }
}