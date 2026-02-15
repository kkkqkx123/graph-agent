/**
 * WorkflowBuilder - 声明式工作流构建器
 * 提供流畅的链式API来构建工作流定义，支持从模板添加节点和触发器
 */

import type { WorkflowDefinition, WorkflowVariable, WorkflowConfig, WorkflowMetadata } from '@modular-agent/types';
import type { Node, NodeConfig } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import type { Edge } from '@modular-agent/types';
import { EdgeType } from '@modular-agent/types';
import type { Condition } from '@modular-agent/types';
import type { WorkflowTrigger } from '@modular-agent/types';
import type { TriggerReference } from '@modular-agent/types';
import { generateId } from '@modular-agent/common-utils';
import { now } from '@modular-agent/common-utils';
import { SingletonRegistry } from '../../core/execution/context/singleton-registry';
import { ConfigParser, ConfigFormat } from '../config';

/**
 * WorkflowBuilder - 声明式工作流构建器
 */
export class WorkflowBuilder {
  private workflow: Partial<WorkflowDefinition>;
  private nodes: Map<string, Node> = new Map();
  private edges: Edge[] = [];
  private variables: WorkflowVariable[] = [];
  private triggers: (WorkflowTrigger | TriggerReference)[] = [];

  private constructor(id: string) {
    this.workflow = {
      id,
      name: id,
      version: '1.0.0',
      createdAt: now(),
      updatedAt: now(),
      nodes: [],
      edges: []
    };
  }

  /**
   * 创建新的WorkflowBuilder实例
   * @param id 工作流ID
   * @returns WorkflowBuilder实例
   */
  static create(id: string): WorkflowBuilder {
    return new WorkflowBuilder(id);
  }

  /**
   * 设置工作流名称
   * @param name 工作流名称
   * @returns this
   */
  name(name: string): this {
    this.workflow.name = name;
    return this;
  }

  /**
   * 设置工作流描述
   * @param description 工作流描述
   * @returns this
   */
  description(description: string): this {
    this.workflow.description = description;
    return this;
  }

  /**
   * 设置工作流版本
   * @param version 版本号
   * @returns this
   */
  version(version: string): this {
    this.workflow.version = version;
    return this;
  }

  /**
   * 设置工作流配置
   * @param config 工作流配置
   * @returns this
   */
  config(config: WorkflowConfig): this {
    this.workflow.config = config;
    return this;
  }

  /**
   * 设置工作流元数据
   * @param metadata 工作流元数据
   * @returns this
   */
  metadata(metadata: WorkflowMetadata): this {
    this.workflow.metadata = metadata;
    return this;
  }

  /**
   * 添加节点
   * @param id 节点ID
   * @param type 节点类型
   * @param config 节点配置
   * @param name 节点名称（可选，默认使用ID）
   * @returns this
   */
  addNode(id: string, type: NodeType, config: NodeConfig, name?: string): this {
    const node: Node = {
      id,
      type,
      name: name || id,
      config,
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    };
    this.nodes.set(id, node);
    return this;
  }

  /**
   * 从节点模板添加节点
   * @param nodeId 节点ID（工作流中唯一）
   * @param templateName 节点模板名称
   * @param configOverride 配置覆盖（可选）
   * @param nodeName 节点名称（可选）
   * @returns this
   */
  addNodeFromTemplate(
    nodeId: string,
    templateName: string,
    configOverride?: Partial<NodeConfig>,
    nodeName?: string
  ): this {
    const nodeTemplateRegistry = SingletonRegistry.getNodeTemplateRegistry();
    const template = nodeTemplateRegistry.get(templateName);
    if (!template) {
      throw new Error(`节点模板 '${templateName}' 不存在`);
    }

    // 合并配置
    const mergedConfig = configOverride
      ? { ...template.config, ...configOverride }
      : template.config;

    return this.addNode(
      nodeId,
      template.type,
      mergedConfig,
      nodeName || template.name
    );
  }

  /**
   * 添加START节点
   * @param id 节点ID（可选，默认为'start'）
   * @returns this
   */
  addStartNode(id: string = 'start'): this {
    return this.addNode(id, NodeType.START, {});
  }

  /**
   * 添加END节点
   * @param id 节点ID（可选，默认为'end'）
   * @returns this
   */
  addEndNode(id: string = 'end'): this {
    return this.addNode(id, NodeType.END, {});
  }

  /**
   * 添加LLM节点
   * @param id 节点ID
   * @param profileId LLM Profile ID
   * @param prompt 提示词（可选）
   * @param name 节点名称（可选）
   * @returns this
   */
  addLLMNode(id: string, profileId: string, prompt?: string, name?: string): this {
    const config = {
      profileId,
      prompt
    };
    return this.addNode(id, NodeType.LLM, config, name);
  }

  /**
   * 添加CODE节点
   * @param id 节点ID
   * @param scriptName 脚本名称
   * @param scriptType 脚本类型
   * @param risk 风险等级
   * @param name 节点名称（可选）
   * @returns this
   */
  addCodeNode(
    id: string,
    scriptName: string,
    scriptType: 'shell' | 'cmd' | 'powershell' | 'python' | 'javascript',
    risk: 'none' | 'low' | 'medium' | 'high',
    name?: string
  ): this {
    const config = {
      scriptName,
      scriptType,
      risk
    };
    return this.addNode(id, NodeType.CODE, config, name);
  }

  /**
   * 添加VARIABLE节点
   * @param id 节点ID
   * @param variableName 变量名称
   * @param variableType 变量类型
   * @param expression 表达式
   * @param name 节点名称（可选）
   * @returns this
   */
  addVariableNode(
    id: string,
    variableName: string,
    variableType: 'number' | 'string' | 'boolean' | 'array' | 'object',
    expression: string,
    name?: string
  ): this {
    const config = {
      variableName,
      variableType,
      expression
    };
    return this.addNode(id, NodeType.VARIABLE, config, name);
  }

  /**
   * 添加ROUTE节点
   * @param id 节点ID
   * @param routes 路由规则
   * @param defaultTargetNodeId 默认目标节点ID（可选）
   * @param name 节点名称（可选）
   * @returns this
   */
  addRouteNode(
    id: string,
    routes: Array<{ condition: string | Condition; targetNodeId: string; priority?: number }>,
    defaultTargetNodeId?: string,
    name?: string
  ): this {
    const config = {
      routes: routes.map(route => ({
        ...route,
        condition: typeof route.condition === 'string'
          ? { expression: route.condition }
          : route.condition
      })),
      defaultTargetNodeId
    };
    return this.addNode(id, NodeType.ROUTE, config, name);
  }

  /**
   * 添加边
   * @param from 源节点ID
   * @param to 目标节点ID
   * @param condition 条件表达式（可选）
   * @returns this
   */
  addEdge(from: string, to: string, condition?: string | Condition): this {
    const edgeCondition: Condition | undefined = condition
      ? typeof condition === 'string'
        ? { expression: condition }
        : condition
      : undefined;

    const edge: Edge = {
      id: generateId(),
      sourceNodeId: from,
      targetNodeId: to,
      type: edgeCondition ? EdgeType.CONDITIONAL : EdgeType.DEFAULT,
      condition: edgeCondition
    };
    this.edges.push(edge);
    return this;
  }

  /**
   * 添加变量
   * @param name 变量名称
   * @param type 变量类型
   * @param options 变量选项
   * @returns this
   */
  addVariable(
    name: string,
    type: 'number' | 'string' | 'boolean' | 'array' | 'object',
    options?: {
      defaultValue?: any;
      description?: string;
      required?: boolean;
      readonly?: boolean;
      scope?: 'global' | 'thread' | 'local' | 'loop';
    }
  ): this {
    const variable: WorkflowVariable = {
      name,
      type,
      ...options
    };
    this.variables.push(variable);
    return this;
  }

  /**
   * 添加触发器
   * @param trigger 触发器定义
   * @returns this
   */
  addTrigger(trigger: WorkflowTrigger): this {
    this.triggers.push(trigger);
    return this;
  }

  /**
   * 从触发器模板添加触发器
   * @param triggerId 触发器ID（工作流中唯一）
   * @param templateName 触发器模板名称
   * @param configOverride 配置覆盖（可选）
   * @param triggerName 触发器名称（可选）
   * @returns this
   */
  addTriggerFromTemplate(
    triggerId: string,
    templateName: string,
    configOverride?: {
      condition?: any;
      action?: any;
      enabled?: boolean;
      maxTriggers?: number;
    },
    triggerName?: string
  ): this {
    const reference: TriggerReference = {
      templateName,
      triggerId,
      triggerName,
      configOverride
    };
    this.triggers.push(reference);
    return this;
  }

  /**
   * 构建工作流定义
   * @returns 工作流定义
   */
  build(): WorkflowDefinition {
    // 更新节点的边引用
    this.updateNodeEdgeReferences();

    // 验证工作流
    this.validate();

    // 构建完整的工作流定义
    const workflow: WorkflowDefinition = {
      ...this.workflow,
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      variables: this.variables.length > 0 ? this.variables : undefined,
      triggers: this.triggers.length > 0 ? this.triggers : undefined,
      updatedAt: now()
    } as WorkflowDefinition;

    return workflow;
  }

  /**
   * 更新节点的边引用
   */
  private updateNodeEdgeReferences(): void {
    // 清空所有节点的边引用
    for (const node of this.nodes.values()) {
      node.outgoingEdgeIds = [];
      node.incomingEdgeIds = [];
    }

    // 重新填充边引用
    for (const edge of this.edges) {
      const fromNode = this.nodes.get(edge.sourceNodeId);
      const toNode = this.nodes.get(edge.targetNodeId);

      if (fromNode) {
        fromNode.outgoingEdgeIds.push(edge.id);
      }
      if (toNode) {
        toNode.incomingEdgeIds.push(edge.id);
      }
    }
  }

  /**
   * 验证工作流
   */
  private validate(): void {
    const errors: string[] = [];

    // 检查是否有节点
    if (this.nodes.size === 0) {
      errors.push('工作流必须至少有一个节点');
    }

    // 检查是否有START节点
    const startNodes = Array.from(this.nodes.values()).filter(n => n.type === NodeType.START);
    if (startNodes.length === 0) {
      errors.push('工作流必须有一个START节点');
    } else if (startNodes.length > 1) {
      errors.push('工作流只能有一个START节点');
    }

    // 检查是否有END节点
    const endNodes = Array.from(this.nodes.values()).filter(n => n.type === NodeType.END);
    if (endNodes.length === 0) {
      errors.push('工作流必须有一个END节点');
    } else if (endNodes.length > 1) {
      errors.push('工作流只能有一个END节点');
    }

    // 检查边的有效性
    for (const edge of this.edges) {
      if (!this.nodes.has(edge.sourceNodeId)) {
        errors.push(`边的源节点不存在: ${edge.sourceNodeId}`);
      }
      if (!this.nodes.has(edge.targetNodeId)) {
        errors.push(`边的目标节点不存在: ${edge.targetNodeId}`);
      }
    }

    // 验证触发器引用
    const triggerTemplateRegistry = SingletonRegistry.getTriggerTemplateRegistry();
    for (const trigger of this.triggers) {
      if ('templateName' in trigger) {
        const reference = trigger as TriggerReference;
        if (!triggerTemplateRegistry.has(reference.templateName)) {
          errors.push(`触发器模板 '${reference.templateName}' 不存在`);
        }
      }
    }

    // 如果有错误，抛出异常
    if (errors.length > 0) {
      throw new Error(`工作流验证失败:\n${errors.join('\n')}`);
    }
  }

  /**
   * 从配置文件内容创建工作流
   * @param configFile 配置文件内容
   * @param format 配置格式 ('toml' | 'json')
   * @param parameters 运行时参数
   * @returns WorkflowBuilder实例
   */
  static fromConfig(
    configFile: string,
    format: ConfigFormat = ConfigFormat.TOML,
    parameters?: Record<string, any>
  ): WorkflowBuilder {
    const parser = new ConfigParser();
    const workflowDef = parser.parseAndTransform(configFile, format, parameters);

    const builder = new WorkflowBuilder(workflowDef.id);
    // 填充builder的内部状态
    Object.assign(builder.workflow, workflowDef);

    // 重建节点和边的映射
    for (const node of workflowDef.nodes) {
      builder.nodes.set(node.id, node);
    }
    builder.edges = workflowDef.edges;
    builder.variables = workflowDef.variables || [];
    builder.triggers = workflowDef.triggers || [];

    return builder;
  }

  /**
   * 从配置文件路径创建工作流
   * @param filePath 配置文件路径
   * @param parameters 运行时参数
   * @returns WorkflowBuilder实例
   */
  static async fromConfigFile(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<WorkflowBuilder> {
    const parser = new ConfigParser();
    const { loadConfigContent } = await import('../config/config-utils');

    // 应用层负责文件读取
    const { content, format } = await loadConfigContent(filePath);
    const workflowDef = parser.parseAndTransform(content, format, parameters);

    const builder = new WorkflowBuilder(workflowDef.id);
    // 填充builder的内部状态
    Object.assign(builder.workflow, workflowDef);

    // 重建节点和边的映射
    for (const node of workflowDef.nodes) {
      builder.nodes.set(node.id, node);
    }
    builder.edges = workflowDef.edges;
    builder.variables = workflowDef.variables || [];
    builder.triggers = workflowDef.triggers || [];

    return builder;
  }
}