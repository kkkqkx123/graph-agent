/**
 * NodeBuilder - 节点构建器
 * 提供流畅的链式API来构建节点定义，支持从模板创建和配置覆盖
 */

import type { Node, NodeConfig, NodeType } from '@modular-agent/types';
import { generateId } from '@modular-agent/common-utils';
import { SingletonRegistry } from '../../core/execution/context/singleton-registry';
import { BaseBuilder } from './base-builder';

/**
 * NodeBuilder - 节点构建器
 */
export class NodeBuilder extends BaseBuilder<Node> {
  private _id: string;
  private _type?: NodeType;
  private _name?: string;
  private _config: NodeConfig = {};
  private _outgoingEdgeIds: string[] = [];
  private _incomingEdgeIds: string[] = [];

  private constructor(id?: string) {
    super();
    this._id = id || generateId();
  }

  /**
   * 创建新的NodeBuilder实例
   * @param id 节点ID（可选，自动生成）
   * @returns NodeBuilder实例
   */
  static create(id?: string): NodeBuilder {
    return new NodeBuilder(id);
  }

  /**
   * 设置节点类型
   * @param type 节点类型
   * @returns this
   */
  type(type: NodeType): this {
    this._type = type;
    this.updateTimestamp();
    return this;
  }

  /**
   * 设置节点名称
   * @param name 节点名称
   * @returns this
   */
  name(name: string): this {
    this._name = name;
    this.updateTimestamp();
    return this;
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
    this._config = { ...this._config, ...partialConfig };
    this.updateTimestamp();
    return this;
  }

  /**
   * 从节点模板加载配置
   * @param templateName 节点模板名称
   * @param configOverride 配置覆盖（可选）
   * @returns this
   */
  fromTemplate(templateName: string, configOverride?: Partial<NodeConfig>): this {
    const nodeTemplateRegistry = SingletonRegistry.getNodeTemplateRegistry();
    const template = nodeTemplateRegistry.get(templateName);
    if (!template) {
      throw new Error(`节点模板 '${templateName}' 不存在`);
    }

    this._type = template.type;
    this._name = template.name;
    this._config = configOverride ? { ...template.config, ...configOverride } : template.config;
    this.updateTimestamp();
    return this;
  }

  /**
   * 构建节点
   * @returns 节点定义
   */
  build(): Node {
    // 验证必需字段
    if (!this._id) {
      throw new Error('节点ID不能为空');
    }
    if (!this._type) {
      throw new Error('节点类型不能为空');
    }
    if (!this._name) {
      this._name = this._id;
    }

    return {
      id: this._id,
      type: this._type,
      name: this._name,
      config: this._config,
      outgoingEdgeIds: this._outgoingEdgeIds,
      incomingEdgeIds: this._incomingEdgeIds
    };
  }

  // 以下为快捷方法，用于快速创建特定类型节点

  /**
   * 创建START节点
   * @param id 节点ID（可选，默认为'start'）
   * @returns this
   */
  start(id: string = 'start'): this {
    this._id = id;
    return this.type('start' as NodeType).name('Start');
  }

  /**
   * 创建END节点
   * @param id 节点ID（可选，默认为'end'）
   * @returns this
   */
  end(id: string = 'end'): this {
    this._id = id;
    return this.type('end' as NodeType).name('End');
  }

  /**
   * 创建LLM节点
   * @param profileId LLM Profile ID
   * @param prompt 提示词（可选）
   * @returns this
   */
  llm(profileId: string, prompt?: string): this {
    return this.type('llm' as NodeType).mergeConfig({
      profileId,
      ...(prompt && { prompt })
    });
  }

  /**
   * 创建CODE节点
   * @param scriptName 脚本名称
   * @param scriptType 脚本类型
   * @param risk 风险等级
   * @returns this
   */
  code(scriptName: string, scriptType: 'shell' | 'cmd' | 'powershell' | 'python' | 'javascript', risk: 'none' | 'low' | 'medium' | 'high'): this {
    return this.type('code' as NodeType).mergeConfig({
      scriptName,
      scriptType,
      risk
    });
  }

  /**
   * 创建VARIABLE节点
   * @param variableName 变量名称
   * @param variableType 变量类型
   * @param expression 表达式
   * @returns this
   */
  variable(variableName: string, variableType: 'number' | 'string' | 'boolean' | 'array' | 'object', expression: string): this {
    return this.type('variable' as NodeType).mergeConfig({
      variableName,
      variableType,
      expression
    });
  }

  /**
   * 创建ROUTE节点
   * @param routes 路由规则
   * @param defaultTargetNodeId 默认目标节点ID（可选）
   * @returns this
   */
  route(
    routes: Array<{ condition: string; targetNodeId: string; priority?: number }>,
    defaultTargetNodeId?: string
  ): this {
    return this.type('route' as NodeType).mergeConfig({
      routes: routes.map(route => ({
        ...route,
        condition: { expression: route.condition }
      })),
      defaultTargetNodeId
    });
  }
}