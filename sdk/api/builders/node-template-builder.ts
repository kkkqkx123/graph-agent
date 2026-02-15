/**
 * NodeTemplateBuilder - 节点模板构建器
 * 提供流畅的链式API来创建和注册节点模板
 */

import type { NodeTemplate } from '@modular-agent/types';
import type { NodeType, NodeConfig } from '@modular-agent/types';
import { TemplateBuilder } from './template-builder';
import { SingletonRegistry } from '../../core/execution/context/singleton-registry';

/**
 * NodeTemplateBuilder - 节点模板构建器
 */
export class NodeTemplateBuilder extends TemplateBuilder<NodeTemplate> {
  private _name: string;
  private _type: NodeType;
  private _config: NodeConfig = {} as NodeConfig;

  private constructor(name: string, type: NodeType) {
    super();
    this._name = name;
    this._type = type;
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
   * 设置节点配置
   * @param config 节点配置
   * @returns this
   */
  config(config: NodeConfig): this {
    this._config = config;
    this.updateTimestamp();
    return this;
  }

  /**
   * 合并配置（部分更新）
   * @param partialConfig 部分配置对象，将浅合并到现有配置
   * @returns this
   */
  mergeConfig(partialConfig: Partial<NodeConfig>): this {
    if (!this._config) {
      this._config = {} as NodeConfig;
    }
    this._config = { ...this._config, ...partialConfig };
    this.updateTimestamp();
    return this;
  }

  /**
   * 注册模板到节点模板注册表
   * @param template 节点模板
   */
  protected registerTemplate(template: NodeTemplate): void {
    const nodeTemplateRegistry = SingletonRegistry.getNodeTemplateRegistry();
    nodeTemplateRegistry.register(template);
  }

  /**
   * 构建节点模板
   * @returns 节点模板
   */
  build(): NodeTemplate {
    // 验证必需字段
    if (!this._name) {
      throw new Error('模板名称不能为空');
    }
    if (!this._type) {
      throw new Error('节点类型不能为空');
    }
    if (!this._config) {
      throw new Error('节点配置不能为空');
    }

    return {
      name: this._name,
      type: this._type,
      config: this._config,
      description: this._description,
      metadata: this._metadata,
      createdAt: this.getCreatedAt(),
      updatedAt: this.getUpdatedAt()
    };
  }
}