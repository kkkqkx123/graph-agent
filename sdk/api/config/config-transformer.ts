/**
 * 配置转换器
 * 负责将配置文件格式转换为WorkflowDefinition
 */

import type { WorkflowConfigFile, IConfigTransformer } from './types';
import type { WorkflowDefinition } from '../../types/workflow';
import type { Node } from '../../types/node';
import type { Edge as EdgeType } from '../../types/edge';
import { NodeType } from '../../types/node';
import { EdgeType as EdgeTypeEnum } from '../../types/edge';
import { generateId } from '../../utils/id-utils';
import { now } from '../../utils/timestamp-utils';

/**
 * 配置转换器类
 */
export class ConfigTransformer implements IConfigTransformer {
  /**
   * 将配置文件格式转换为WorkflowDefinition
   * @param configFile 解析后的配置文件
   * @param parameters 运行时参数（用于模板替换）
   * @returns WorkflowDefinition
   */
  transformToWorkflow(
    configFile: WorkflowConfigFile,
    parameters?: Record<string, any>
  ): WorkflowDefinition {
    // 1. 处理参数替换（{{parameters.xxx}} → 实际值）
    const processedConfig = this.processParameters(configFile, parameters);

    // 2. 转换节点配置
    const nodes = processedConfig.workflow.nodes.map(node =>
      this.transformNode(node)
    );

    // 3. 转换边配置
    const edges = processedConfig.workflow.edges.map(edge =>
      this.transformEdge(edge)
    );

    // 4. 更新节点的边引用
    this.updateNodeEdgeReferences(nodes, edges);

    // 5. 构建完整的WorkflowDefinition
    const workflowDef: WorkflowDefinition = {
      id: processedConfig.workflow.id,
      name: processedConfig.workflow.name,
      description: processedConfig.workflow.description,
      version: processedConfig.workflow.version,
      nodes,
      edges,
      variables: processedConfig.workflow.variables,
      triggers: processedConfig.workflow.triggers,
      config: processedConfig.workflow.config,
      metadata: processedConfig.workflow.metadata,
      createdAt: now(),
      updatedAt: now()
    };

    return workflowDef;
  }

  /**
   * 处理参数替换
   * @param configFile 配置文件
   * @param parameters 运行时参数
   * @returns 处理后的配置文件
   */
  private processParameters(
    configFile: WorkflowConfigFile,
    parameters?: Record<string, any>
  ): WorkflowConfigFile {
    if (!parameters || Object.keys(parameters).length === 0) {
      return configFile;
    }

    // 深度克隆配置文件，避免修改原始对象
    const processed = JSON.parse(JSON.stringify(configFile));

    // 递归替换所有 {{parameters.xxx}} 占位符
    this.replaceParametersInObject(processed, parameters);

    return processed;
  }

  /**
   * 递归替换对象中的参数占位符
   * @param obj 要处理的对象
   * @param parameters 参数对象
   */
  private replaceParametersInObject(obj: any, parameters: Record<string, any>): void {
    if (typeof obj === 'string') {
      // 替换字符串中的参数占位符
      const regex = /\{\{parameters\.(\w+)\}\}/g;
      obj = obj.replace(regex, (match, paramName) => {
        if (parameters[paramName] !== undefined) {
          return parameters[paramName];
        }
        // 如果参数不存在，保留原始占位符
        return match;
      });
    } else if (Array.isArray(obj)) {
      // 处理数组
      for (let i = 0; i < obj.length; i++) {
        this.replaceParametersInObject(obj[i], parameters);
      }
    } else if (obj && typeof obj === 'object') {
      // 处理对象
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          this.replaceParametersInObject(obj[key], parameters);
        }
      }
    }
  }

  /**
   * 转换单个节点配置
   * @param nodeConfig 节点配置
   * @returns Node对象
   */
  private transformNode(nodeConfig: WorkflowConfigFile['workflow']['nodes'][0]): Node {
    const node: Node = {
      id: nodeConfig.id,
      type: nodeConfig.type,
      name: nodeConfig.name,
      config: nodeConfig.config,
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    };

    return node;
  }

  /**
   * 转换单个边配置
   * @param edgeConfig 边配置
   * @returns Edge对象
   */
  private transformEdge(edgeConfig: WorkflowConfigFile['workflow']['edges'][0]): EdgeType {
    const edge: EdgeType = {
      id: generateId(),
      sourceNodeId: edgeConfig.from,
      targetNodeId: edgeConfig.to,
      type: edgeConfig.condition ? EdgeTypeEnum.CONDITIONAL : EdgeTypeEnum.DEFAULT
    };

    // 如果有条件，添加条件配置
    if (edgeConfig.condition) {
      edge.condition = {
        expression: edgeConfig.condition
      };
    }

    return edge;
  }

  /**
   * 更新节点的边引用
   * @param nodes 节点数组
   * @param edges 边数组
   */
  private updateNodeEdgeReferences(nodes: Node[], edges: EdgeType[]): void {
    // 创建节点ID到节点的映射
    const nodeMap = new Map<string, Node>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    // 更新每个节点的边引用
    for (const edge of edges) {
      const fromNode = nodeMap.get(edge.sourceNodeId);
      const toNode = nodeMap.get(edge.targetNodeId);

      if (fromNode) {
        fromNode.outgoingEdgeIds.push(edge.id);
      }

      if (toNode) {
        toNode.incomingEdgeIds.push(edge.id);
      }
    }
  }

  /**
   * 将WorkflowDefinition转换为配置文件格式
   * @param workflowDef 工作流定义
   * @returns 配置文件格式
   */
  transformFromWorkflow(workflowDef: WorkflowDefinition): WorkflowConfigFile {
    const configFile: WorkflowConfigFile = {
      workflow: {
        id: workflowDef.id,
        name: workflowDef.name,
        description: workflowDef.description,
        version: workflowDef.version,
        nodes: workflowDef.nodes.map(node => ({
          id: node.id,
          type: node.type,
          name: node.name,
          config: node.config
        })),
        edges: workflowDef.edges.map(edge => ({
          from: edge.sourceNodeId,
          to: edge.targetNodeId,
          condition: edge.condition?.expression
        })),
        variables: workflowDef.variables,
        triggers: workflowDef.triggers,
        config: workflowDef.config,
        metadata: workflowDef.metadata
      }
    };

    return configFile;
  }
}