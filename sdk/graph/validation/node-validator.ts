/**
 * 节点验证器
 * 负责节点配置的业务规则验证
 *
 * 设计说明：
 * - TypeScript 可辨识联合类型已提供编译时类型检查
 * - 此验证器专注于运行时业务规则验证（外部输入、业务约束）
 * - 不再重复验证类型系统能保证的内容
 */

import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import { validateNodeByType } from './node-validation/index.js';

/**
 * 节点验证器类
 *
 * 验证范围：
 * 1. 外部输入数据的基本结构（来自 JSON/YAML/API）
 * 2. 业务规则约束（如：FORK 节点的 forkPaths 不能为空）
 * 3. 跨字段关联验证
 *
 * 不验证：
 * - type 和 config 的类型匹配（TypeScript 编译时保证）
 * - 字段类型正确性（TypeScript 编译时保证）
 */
export class NodeValidator {
  /**
   * 验证节点
   * @param node 节点
   * @returns 验证结果
   */
  validateNode(node: Node): Result<Node, ConfigurationValidationError[]> {
    // 验证业务规则
    return this.validateBusinessRules(node);
  }

  /**
   * 验证业务规则
   * @param node 节点
   * @returns 验证结果
   */
  private validateBusinessRules(node: Node): Result<Node, ConfigurationValidationError[]> {
    // 调用各节点类型的业务规则验证
    return validateNodeByType(node);
  }

  /**
   * 批量验证节点
   * @param nodes 节点数组
   * @returns 验证结果数组
   */
  validateNodes(nodes: Node[]): Result<Node, ConfigurationValidationError[]>[] {
    return nodes.map((node) => this.validateNode(node));
  }

  /**
   * 验证外部输入的节点数据（JSON/API 来源）
   * 用于验证从外部输入的原始数据，确保基本结构正确
   *
   * @param rawNode 原始节点数据
   * @returns 验证结果
   */
  validateRawNode(rawNode: unknown): Result<Node, ConfigurationValidationError[]> {
    // 基本结构检查
    if (!rawNode || typeof rawNode !== 'object') {
      return err([new ConfigurationValidationError('Node must be an object', {
        configType: 'node'
      })]);
    }

    const node = rawNode as Record<string, unknown>;

    // 必需字段检查 - 使用括号访问避免索引签名问题
    const nodeId = node['id'];
    const nodeName = node['name'];
    const nodeType = node['type'];
    const nodeConfig = node['config'];
    const nodeOutgoingEdgeIds = node['outgoingEdgeIds'];
    const nodeIncomingEdgeIds = node['incomingEdgeIds'];

    if (typeof nodeId !== 'string' || nodeId.length === 0) {
      return err([new ConfigurationValidationError('Node id is required and must be a non-empty string', {
        configType: 'node',
        configPath: 'id'
      })]);
    }

    if (typeof nodeName !== 'string' || nodeName.length === 0) {
      return err([new ConfigurationValidationError('Node name is required and must be a non-empty string', {
        configType: 'node',
        configPath: 'name'
      })]);
    }

    // type 字段检查
    const validTypes = [
      'START', 'END', 'VARIABLE', 'FORK', 'JOIN', 'SUBGRAPH', 'SCRIPT',
      'LLM', 'ADD_TOOL', 'USER_INTERACTION', 'ROUTE',
      'CONTEXT_PROCESSOR', 'LOOP_START', 'LOOP_END', 'AGENT_LOOP',
      'START_FROM_TRIGGER', 'CONTINUE_FROM_TRIGGER'
    ];

    if (typeof nodeType !== 'string' || !validTypes.includes(nodeType)) {
      return err([new ConfigurationValidationError(`Invalid node type: ${nodeType}`, {
        configType: 'node',
        configPath: 'type'
      })]);
    }

    // config 字段检查
    if (nodeConfig === undefined || nodeConfig === null) {
      return err([new ConfigurationValidationError('Node config is required', {
        configType: 'node',
        configPath: 'config'
      })]);
    }

    // 数组字段检查
    if (nodeOutgoingEdgeIds !== undefined && !Array.isArray(nodeOutgoingEdgeIds)) {
      return err([new ConfigurationValidationError('outgoingEdgeIds must be an array', {
        configType: 'node',
        configPath: 'outgoingEdgeIds'
      })]);
    }

    if (nodeIncomingEdgeIds !== undefined && !Array.isArray(nodeIncomingEdgeIds)) {
      return err([new ConfigurationValidationError('incomingEdgeIds must be an array', {
        configType: 'node',
        configPath: 'incomingEdgeIds'
      })]);
    }

    // 通过基本检查后，进行业务规则验证
    return this.validateNode((node as unknown) as Node);
  }
}
