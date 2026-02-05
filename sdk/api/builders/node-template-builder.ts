/**
 * NodeTemplateBuilder - 节点模板构建器
 * 提供流畅的链式API来创建和注册节点模板
 */

import type { NodeTemplate } from '../../types/node-template';
import type { NodeType, NodeConfig } from '../../types/node';
import type { Metadata } from '../../types/common';
import { now } from '../../utils/timestamp-utils';
import { nodeTemplateRegistry } from '../../core/services/node-template-registry';

/**
 * NodeTemplateBuilder - 节点模板构建器
 */
export class NodeTemplateBuilder {
  private template: Partial<NodeTemplate> = {};

  private constructor(name: string, type: NodeType) {
    this.template = {
      name,
      type,
      config: {} as NodeConfig,
      createdAt: now(),
      updatedAt: now()
    };
  }

  /**
   * 创建新的NodeTemplateBuilder实例
   * @param name 模板名称
   * @param type 节点类型
   * @returns NodeTemplateBuilder实例
   */
  static create(name: string, type: NodeType): NodeTemplateBuilder {
    return new NodeTemplateBuilder(name, type);
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
   * 设置节点配置
   * @param config 节点配置
   * @returns this
   */
  config(config: NodeConfig): this {
    this.template.config = config;
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
   * 构建节点模板
   * @returns 节点模板
   */
  build(): NodeTemplate {
    // 验证必需字段
    if (!this.template.name) {
      throw new Error('模板名称不能为空');
    }
    if (!this.template.type) {
      throw new Error('节点类型不能为空');
    }
    if (!this.template.config) {
      throw new Error('节点配置不能为空');
    }

    return {
      name: this.template.name,
      type: this.template.type,
      config: this.template.config,
      description: this.template.description,
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
    nodeTemplateRegistry.register(template);
    return this;
  }

  /**
   * 构建并注册模板
   * @returns 节点模板
   */
  buildAndRegister(): NodeTemplate {
    const template = this.build();
    nodeTemplateRegistry.register(template);
    return template;
  }
}