/**
 * TriggerTemplateBuilder - 触发器模板构建器
 * 提供流畅的链式API来创建和注册触发器模板
 */

import type { TriggerTemplate } from '@modular-agent/types/trigger-template';
import type { TriggerCondition, TriggerAction } from '@modular-agent/types/trigger';
import type { Metadata } from '@modular-agent/types/common';
import { now } from '@modular-agent/common-utils/timestamp-utils';
import { triggerTemplateRegistry } from '@modular-agent/sdk/core/services/trigger-template-registry';

/**
 * TriggerTemplateBuilder - 触发器模板构建器
 */
export class TriggerTemplateBuilder {
  private template: Partial<TriggerTemplate> = {};

  private constructor(name: string) {
    this.template = {
      name,
      createdAt: now(),
      updatedAt: now()
    };
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
   * 设置模板描述
   * @param description 描述
   * @returns this
   */
  description(description: string): this {
    this.template.description = description;
    return this;
  }

  /**
   * 设置触发条件
   * @param condition 触发条件
   * @returns this
   */
  condition(condition: TriggerCondition): this {
    this.template.condition = condition;
    return this;
  }

  /**
   * 设置触发动作
   * @param action 触发动作
   * @returns this
   */
  action(action: TriggerAction): this {
    this.template.action = action;
    return this;
  }

  /**
   * 设置是否启用
   * @param enabled 是否启用
   * @returns this
   */
  enabled(enabled: boolean): this {
    this.template.enabled = enabled;
    return this;
  }

  /**
   * 设置最大触发次数
   * @param max 最大触发次数（0表示无限制）
   * @returns this
   */
  maxTriggers(max: number): this {
    this.template.maxTriggers = max;
    return this;
  }

  /**
   * 设置元数据
   * @param metadata 元数据
   * @returns this
   */
  metadata(metadata: Metadata): this {
    this.template.metadata = metadata;
    return this;
  }

  /**
   * 设置分类
   * @param category 分类
   * @returns this
   */
  category(category: string): this {
    if (!this.template.metadata) {
      this.template.metadata = {};
    }
    this.template.metadata['category'] = category;
    return this;
  }

  /**
   * 添加标签
   * @param tags 标签数组
   * @returns this
   */
  tags(...tags: string[]): this {
    if (!this.template.metadata) {
      this.template.metadata = {};
    }
    if (!this.template.metadata['tags']) {
      this.template.metadata['tags'] = [];
    }
    this.template.metadata['tags'].push(...tags);
    return this;
  }

  /**
   * 构建触发器模板
   * @returns 触发器模板
   */
  build(): TriggerTemplate {
    // 验证必需字段
    if (!this.template.name) {
      throw new Error('模板名称不能为空');
    }
    if (!this.template.condition) {
      throw new Error('触发条件不能为空');
    }
    if (!this.template.action) {
      throw new Error('触发动作不能为空');
    }

    return {
      name: this.template.name,
      description: this.template.description,
      condition: this.template.condition,
      action: this.template.action,
      enabled: this.template.enabled !== undefined ? this.template.enabled : true,
      maxTriggers: this.template.maxTriggers,
      metadata: this.template.metadata,
      createdAt: this.template.createdAt || now(),
      updatedAt: now()
    };
  }

  /**
   * 注册模板到全局注册表
   * @returns this
   */
  register(): this {
    const template = this.build();
    triggerTemplateRegistry.register(template);
    return this;
  }

  /**
   * 构建并注册模板
   * @returns 触发器模板
   */
  buildAndRegister(): TriggerTemplate {
    const template = this.build();
    triggerTemplateRegistry.register(template);
    return template;
  }
}