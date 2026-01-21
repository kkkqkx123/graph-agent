/**
 * 配置解析器
 *
 * 负责解析 TOML/JSON 配置文件，将其转换为标准化的配置数据格式
 * 遵循单一职责原则，专注于配置解析逻辑
 */

import { parse as tomlParse } from 'toml';
import { NodeConfig } from './nodes/node-factory';

/**
 * 工作流配置数据接口
 */
export interface WorkflowConfigData {
  workflow: {
    id?: string;
    name: string;
    description?: string;
    type?: string;
    status?: string;
    config?: Record<string, any>;
    errorHandlingStrategy?: string;
    executionStrategy?: string;
    nodes: NodeConfig[];
    edges: EdgeConfig[];
    subWorkflowReferences?: SubWorkflowReferenceConfig[];
    tags?: string[];
    metadata?: Record<string, unknown>;
  };
}

/**
 * 边配置接口
 */
export interface EdgeConfig {
  from: string;
  to: string;
  type?: string;
  condition?: EdgeConditionConfig;
  weight?: number;
  properties?: Record<string, unknown>;
}

/**
 * 边条件配置接口
 */
export interface EdgeConditionConfig {
  type: 'function' | 'expression' | 'script';
  value: string;
  parameters?: Record<string, any>;
  language?: string;
}

/**
 * 子工作流引用配置接口
 */
export interface SubWorkflowReferenceConfig {
  referenceId: string;
  workflowId: string;
  version?: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  description?: string;
}

/**
 * 配置解析器
 */
export class ConfigParser {
  /**
   * 解析TOML配置文件
   * @param tomlContent TOML配置内容
   * @param parameters 参数值（可选，用于替换配置中的占位符）
   * @returns 标准化的配置数据
   */
  static parseTOML(tomlContent: string, parameters?: Record<string, any>): WorkflowConfigData {
    const parsed = tomlParse(tomlContent);
    return this.normalizeConfig(parsed, parameters);
  }

  /**
   * 解析JSON配置文件
   * @param jsonContent JSON配置内容
   * @param parameters 参数值（可选，用于替换配置中的占位符）
   * @returns 标准化的配置数据
   */
  static parseJSON(jsonContent: string, parameters?: Record<string, any>): WorkflowConfigData {
    const parsed = JSON.parse(jsonContent);
    return this.normalizeConfig(parsed, parameters);
  }

  /**
   * 标准化配置格式
   * @param config 原始配置对象
   * @param parameters 参数值（可选）
   * @returns 标准化的配置数据
   */
  private static normalizeConfig(config: any, parameters?: Record<string, any>): WorkflowConfigData {
    // 替换参数占位符
    const processedConfig = this.replaceParameters(config, parameters);

    // 将配置转换为WorkflowConfigData格式
    return {
      workflow: {
        id: processedConfig.workflow?.id,
        name: processedConfig.workflow?.name || '未命名工作流',
        description: processedConfig.workflow?.description,
        type: processedConfig.workflow?.type,
        status: processedConfig.workflow?.status,
        config: processedConfig.workflow?.config,
        errorHandlingStrategy: processedConfig.workflow?.errorHandlingStrategy,
        executionStrategy: processedConfig.workflow?.executionStrategy,
        nodes: this.normalizeNodes(processedConfig.workflow?.nodes || []),
        edges: this.normalizeEdges(processedConfig.workflow?.edges || []),
        subWorkflowReferences: this.normalizeSubWorkflowReferences(
          processedConfig.workflow?.subWorkflowReferences
        ),
        tags: processedConfig.workflow?.tags,
        metadata: processedConfig.workflow?.metadata,
      },
    };
  }

  /**
   * 替换参数占位符
   * @param config 配置对象
   * @param parameters 参数值
   * @returns 替换后的配置对象
   */
  private static replaceParameters(config: any, parameters?: Record<string, any>): any {
    if (!parameters || Object.keys(parameters).length === 0) {
      return config;
    }

    const jsonString = JSON.stringify(config);
    const replaced = jsonString.replace(/\{\{parameters\.(\w+)\}\}/g, (match, key) => {
      return parameters[key] !== undefined ? JSON.stringify(parameters[key]) : match;
    });

    return JSON.parse(replaced);
  }

  /**
   * 标准化节点配置
   * @param nodes 原始节点配置数组
   * @returns 标准化的节点配置数组
   */
  private static normalizeNodes(nodes: any[]): NodeConfig[] {
    return nodes.map(node => {
      // 将config字段提升到节点配置的顶层
      const nodeConfig: any = {
        id: node.id,
        type: node.type,
        name: node.name,
        description: node.description,
        position: node.position,
      };

      // 如果有config字段，将其展开到顶层
      if (node.config) {
        Object.assign(nodeConfig, node.config);
      }

      return nodeConfig as NodeConfig;
    });
  }

  /**
   * 标准化边配置
   * @param edges 原始边配置数组
   * @returns 标准化的边配置数组
   */
  private static normalizeEdges(edges: any[]): EdgeConfig[] {
    return edges.map(edge => ({
      from: edge.from,
      to: edge.to,
      type: edge.type,
      condition: edge.condition,
      weight: edge.weight,
      properties: edge.properties,
    }));
  }

  /**
   * 标准化子工作流引用配置
   * @param references 原始子工作流引用配置数组
   * @returns 标准化的子工作流引用配置数组
   */
  private static normalizeSubWorkflowReferences(
    references?: any[]
  ): SubWorkflowReferenceConfig[] | undefined {
    if (!references || references.length === 0) {
      return undefined;
    }

    return references.map(ref => ({
      referenceId: ref.referenceId,
      workflowId: ref.workflowId,
      version: ref.version,
      inputMapping: ref.inputMapping,
      outputMapping: ref.outputMapping,
      description: ref.description,
    }));
  }
}