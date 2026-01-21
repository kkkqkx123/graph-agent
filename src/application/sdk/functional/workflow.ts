/**
 * workflow 函数
 *
 * 提供函数式 API 用于创建工作流配置
 */

import type {
  WorkflowConfigData,
  NodeConfig,
  EdgeConfig,
} from '../types';

/**
 * workflow 函数
 * 创建工作流配置对象
 *
 * @param id 工作流 ID
 * @param config 工作流配置
 * @returns WorkflowConfigData 对象
 *
 * @example
 * ```typescript
 * const workflow = workflow('my-workflow', {
 *   name: '我的工作流',
 *   description: '这是一个示例工作流',
 *   nodes: [node.start('start').build()],
 *   edges: []
 * });
 * ```
 */
export function workflow(
  id: string,
  config: {
    name?: string;
    description?: string;
    type?: string;
    status?: string;
    nodes: NodeConfig[];
    edges: EdgeConfig[];
    tags?: string[];
    metadata?: Record<string, unknown>;
    config?: Record<string, unknown>;
    errorHandlingStrategy?: string;
    executionStrategy?: string;
  }
): WorkflowConfigData {
  // 验证必需参数
  if (!id || id.trim() === '') {
    throw new Error('工作流 ID 不能为空');
  }

  if (!config.nodes || config.nodes.length === 0) {
    throw new Error('工作流必须包含至少一个节点');
  }

  // 验证节点 ID 唯一性
  const nodeIds = new Set<string>();
  for (const node of config.nodes) {
    if (!node.id) {
      throw new Error('节点必须包含 ID');
    }
    if (nodeIds.has(node.id)) {
      throw new Error(`节点 ID 重复: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // 验证边的引用
  if (config.edges) {
    for (const edge of config.edges) {
      if (!nodeIds.has(edge.from)) {
        throw new Error(`边引用了不存在的源节点: ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        throw new Error(`边引用了不存在的目标节点: ${edge.to}`);
      }
    }
  }

  return {
    workflow: {
      id,
      name: config.name || '未命名工作流',
      description: config.description,
      type: config.type,
      status: config.status,
      nodes: config.nodes,
      edges: config.edges || [],
      tags: config.tags,
      metadata: config.metadata,
      config: config.config,
      errorHandlingStrategy: config.errorHandlingStrategy,
      executionStrategy: config.executionStrategy,
    },
  };
}