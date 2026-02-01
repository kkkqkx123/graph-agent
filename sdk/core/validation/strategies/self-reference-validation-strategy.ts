/**
 * 自引用验证策略
 * 提供工作流级别的自引用检测逻辑
 * 用于验证 SUBGRAPH 和 START_FROM_TRIGGER 节点不能引用自身工作流
 */

import type { Node } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

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
    return node.type === 'SUBGRAPH' || node.type === 'START_FROM_TRIGGER';
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
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // 只验证子工作流节点
    if (!this.isSubgraphNode(node)) {
      return errors;
    }

    const config = node.config as SubgraphConfig;

    // 检查是否引用自身工作流
    if (config && config.subgraphId === workflowId) {
      errors.push(new ValidationError(
        '子工作流节点不能引用自身工作流',
        `${path}.config.subgraphId`,
        undefined,
        { code: 'SELF_REFERENCE', nodeId: node.id, subgraphId: config.subgraphId }
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
  ): ValidationError[] {
    const errors: ValidationError[] = [];

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