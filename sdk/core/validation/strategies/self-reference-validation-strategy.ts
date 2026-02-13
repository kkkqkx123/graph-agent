/**
 * 自引用验证策略
 * 提供工作流级别的自引用检测逻辑
 * 用于验证 SUBGRAPH 节点不能引用自身工作流
 *
 * 注意：START_FROM_TRIGGER 节点现在是空配置，不再包含 subgraphId
 * 触发子工作流是通过触发器的 ExecuteTriggeredSubgraphActionConfig 中的 triggeredWorkflowId 指定的
 */

import type { Node } from '@modular-agent/types/node';
import { ConfigurationValidationError } from '@modular-agent/types/errors';

/**
 * 子工作流配置接口
 */
export interface SubgraphConfig {
  /** 子工作流ID */
  subgraphId: string;
}

/**
 * 自引用验证策略
 * 检测节点是否引用了自身所在的工作流
 */
export class SelfReferenceValidationStrategy {
  /**
   * 检查节点是否为子工作流节点类型
   * @param node 节点定义
   * @returns 是否为子工作流节点
   */
  static isSubgraphNode(node: Node): boolean {
    // START_FROM_TRIGGER 节点现在是空配置，不再引用其他工作流
    return node.type === 'SUBGRAPH';
  }

  /**
   * 验证节点是否存在自引用
   * @param node 节点定义
   * @param workflowId 当前工作流ID
   * @param path 错误路径前缀
   * @returns 验证错误列表
   */
  static validate(
    node: Node,
    workflowId: string,
    path: string
  ): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];

    // 只验证 SUBGRAPH 节点
    if (node.type !== 'SUBGRAPH') {
      return errors;
    }

    const config = node.config as SubgraphConfig;

    // 检查是否引用自身工作流
    if (config && config.subgraphId === workflowId) {
      errors.push(new ConfigurationValidationError(
        '子工作流节点不能引用自身工作流',
        {
          configType: 'node',
          configPath: `${path}.config.subgraphId`,
          value: config.subgraphId,
          context: { code: 'SELF_REFERENCE', nodeId: node.id, subgraphId: config.subgraphId }
        }
      ));
    }

    return errors;
  }

  /**
   * 批量验证多个节点的自引用
   * @param nodes 节点数组
   * @param workflowId 当前工作流ID
   * @param pathPrefix 路径前缀
   * @returns 验证错误列表
   */
  static validateNodes(
    nodes: Node[],
    workflowId: string,
    pathPrefix: string = 'workflow.nodes'
  ): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;

      const path = `${pathPrefix}[${i}]`;
      const nodeErrors = this.validate(node, workflowId, path);
      errors.push(...nodeErrors);
    }

    return errors;
  }
}