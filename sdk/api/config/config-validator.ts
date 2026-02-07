/**
 * 配置验证器
 * 负责验证配置文件的有效性
 */

import type { WorkflowConfigFile, ParsedConfig, ValidationResult } from './types';
import { NodeType } from '../../types/node';

/**
 * 配置验证器类
 */
export class ConfigValidator {
  /**
   * 验证配置对象
   * @param config 解析后的配置对象
   * @returns 验证结果
   */
  validate(config: ParsedConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证工作流配置
    this.validateWorkflowConfig(config.workflowConfig, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证工作流配置
   * @param workflowConfig 工作流配置
   * @param errors 错误列表
   * @param warnings 警告列表
   */
  private validateWorkflowConfig(
    workflowConfig: WorkflowConfigFile,
    errors: string[],
    warnings: string[]
  ): void {
    const workflow = workflowConfig.workflow;

    // 验证必需字段
    if (!workflow.id) {
      errors.push('工作流ID不能为空');
    }

    if (!workflow.name) {
      errors.push('工作流名称不能为空');
    }

    if (!workflow.version) {
      errors.push('工作流版本不能为空');
    }

    // 验证节点
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('工作流必须至少包含一个节点');
    } else {
      this.validateNodes(workflow.nodes, errors, warnings);
    }

    // 验证边
    if (!workflow.edges || workflow.edges.length === 0) {
      warnings.push('工作流没有定义任何边，节点之间没有连接');
    } else {
      this.validateEdges(workflow.edges, workflow.nodes, errors, warnings);
    }

    // 验证参数定义
    if (workflow.parameters) {
      this.validateParameters(workflow.parameters, errors, warnings);
    }

    // 验证变量
    if (workflow.variables) {
      this.validateVariables(workflow.variables, errors, warnings);
    }

    // 验证触发器
    if (workflow.triggers) {
      this.validateTriggers(workflow.triggers, errors, warnings);
    }
  }

  /**
   * 验证节点配置
   * @param nodes 节点数组
   * @param errors 错误列表
   * @param warnings 警告列表
   */
  private validateNodes(
    nodes: WorkflowConfigFile['workflow']['nodes'],
    errors: string[],
    warnings: string[]
  ): void {
    const nodeIds = new Set<string>();
    const startNodes: string[] = [];
    const endNodes: string[] = [];

    for (const node of nodes) {
      // 验证节点ID
      if (!node.id) {
        errors.push('节点ID不能为空');
        continue;
      }

      // 检查节点ID是否重复
      if (nodeIds.has(node.id)) {
        errors.push(`节点ID重复: ${node.id}`);
      }
      nodeIds.add(node.id);

      // 验证节点类型
      if (!node.type) {
        errors.push(`节点 ${node.id} 的类型不能为空`);
      } else if (!Object.values(NodeType).includes(node.type)) {
        errors.push(`节点 ${node.id} 的类型无效: ${node.type}`);
      }

      // 验证节点名称
      if (!node.name) {
        warnings.push(`节点 ${node.id} 没有设置名称`);
      }

      // 统计START和END节点
      if (node.type === NodeType.START) {
        startNodes.push(node.id);
      } else if (node.type === NodeType.END) {
        endNodes.push(node.id);
      }

      // 验证节点配置
      if (!node.config) {
        warnings.push(`节点 ${node.id} 没有配置信息`);
      }
    }

    // 验证START节点
    if (startNodes.length === 0) {
      errors.push('工作流必须包含一个START节点');
    } else if (startNodes.length > 1) {
      errors.push('工作流只能包含一个START节点');
    }

    // 验证END节点
    if (endNodes.length === 0) {
      errors.push('工作流必须包含一个END节点');
    } else if (endNodes.length > 1) {
      errors.push('工作流只能包含一个END节点');
    }
  }

  /**
   * 验证边配置
   * @param edges 边数组
   * @param nodes 节点数组
   * @param errors 错误列表
   * @param warnings 警告列表
   */
  private validateEdges(
    edges: WorkflowConfigFile['workflow']['edges'],
    nodes: WorkflowConfigFile['workflow']['nodes'],
    errors: string[],
    warnings: string[]
  ): void {
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const edge of edges) {
      // 验证源节点
      if (!edge.from) {
        errors.push('边的源节点ID不能为空');
      } else if (!nodeIds.has(edge.from)) {
        errors.push(`边的源节点不存在: ${edge.from}`);
      }

      // 验证目标节点
      if (!edge.to) {
        errors.push('边的目标节点ID不能为空');
      } else if (!nodeIds.has(edge.to)) {
        errors.push(`边的目标节点不存在: ${edge.to}`);
      }

      // 验证自环边
      if (edge.from === edge.to) {
        warnings.push(`边 ${edge.from} -> ${edge.to} 是自环边`);
      }
    }
  }

  /**
   * 验证参数定义
   * @param parameters 参数定义对象
   * @param errors 错误列表
   * @param warnings 警告列表
   */
  private validateParameters(
    parameters: Record<string, any>,
    errors: string[],
    warnings: string[]
  ): void {
    const validTypes = ['string', 'number', 'boolean', 'array', 'object'];

    for (const [key, param] of Object.entries(parameters)) {
      if (!param.type) {
        errors.push(`参数 ${key} 缺少类型定义`);
      } else if (!validTypes.includes(param.type)) {
        errors.push(`参数 ${key} 的类型无效: ${param.type}`);
      }

      if (param.required && param.default === undefined) {
        warnings.push(`参数 ${key} 标记为必需但没有提供默认值`);
      }
    }
  }

  /**
   * 验证变量定义
   * @param variables 变量数组
   * @param errors 错误列表
   * @param warnings 警告列表
   */
  private validateVariables(
    variables: any[],
    errors: string[],
    warnings: string[]
  ): void {
    const validTypes = ['number', 'string', 'boolean', 'array', 'object'];
    const variableNames = new Set<string>();

    for (const variable of variables) {
      if (!variable.name) {
        errors.push('变量名称不能为空');
        continue;
      }

      // 检查变量名是否重复
      if (variableNames.has(variable.name)) {
        errors.push(`变量名称重复: ${variable.name}`);
      }
      variableNames.add(variable.name);

      if (!variable.type) {
        errors.push(`变量 ${variable.name} 缺少类型定义`);
      } else if (!validTypes.includes(variable.type)) {
        errors.push(`变量 ${variable.name} 的类型无效: ${variable.type}`);
      }
    }
  }

  /**
   * 验证触发器定义
   * @param triggers 触发器数组
   * @param errors 错误列表
   * @param warnings 警告列表
   */
  private validateTriggers(
    triggers: any[],
    errors: string[],
    warnings: string[]
  ): void {
    for (const trigger of triggers) {
      if (!trigger.id) {
        errors.push('触发器ID不能为空');
      }

      if (!trigger.name) {
        warnings.push('触发器没有设置名称');
      }

      if (!trigger.condition) {
        errors.push(`触发器 ${trigger.id || '未命名'} 缺少条件定义`);
      }

      if (!trigger.action) {
        errors.push(`触发器 ${trigger.id || '未命名'} 缺少动作定义`);
      }
    }
  }
}