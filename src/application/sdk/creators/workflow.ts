/**
 * createWorkflow 函数
 *
 * 提供简化的对象创建 API 用于创建工作流配置
 */

import type {
  WorkflowConfigData,
} from '../types';

/**
 * createWorkflow 函数
 * 创建工作流配置对象的深拷贝
 *
 * @param config 工作流配置对象
 * @returns 工作流配置对象的深拷贝
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow({
 *   workflow: {
 *     id: 'my-workflow',
 *     name: '我的工作流',
 *     nodes: [...],
 *     edges: [...]
 *   }
 * });
 * ```
 */
export function createWorkflow(config: WorkflowConfigData): WorkflowConfigData {
  // 验证配置
  if (!config || !config.workflow) {
    throw new Error('工作流配置无效');
  }

  const workflow = config.workflow;

  // 验证必需字段
  if (!workflow.id || workflow.id.trim() === '') {
    throw new Error('工作流 ID 不能为空');
  }

  if (!workflow.name || workflow.name.trim() === '') {
    throw new Error('工作流名称不能为空');
  }

  if (!workflow.nodes || workflow.nodes.length === 0) {
    throw new Error('工作流必须包含至少一个节点');
  }

  // 验证节点 ID 唯一性
  const nodeIds = new Set<string>();
  for (const node of workflow.nodes) {
    if (!node.id) {
      throw new Error('节点必须包含 ID');
    }
    if (nodeIds.has(node.id)) {
      throw new Error(`节点 ID 重复: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // 验证边的引用
  if (workflow.edges) {
    for (const edge of workflow.edges) {
      if (!nodeIds.has(edge.from)) {
        throw new Error(`边引用了不存在的源节点: ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        throw new Error(`边引用了不存在的目标节点: ${edge.to}`);
      }
    }
  }

  // 返回深拷贝
  return JSON.parse(JSON.stringify(config));
}

/**
 * createWorkflowFromConfig 函数
 * 从配置对象创建工作流配置
 *
 * @param config 配置对象
 * @returns WorkflowConfigData 对象
 *
 * @example
 * ```typescript
 * const workflow = createWorkflowFromConfig({
 *   id: 'my-workflow',
 *   name: '我的工作流',
 *   nodes: [...],
 *   edges: [...]
 * });
 * ```
 */
export function createWorkflowFromConfig(config: {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status?: string;
  nodes: any[];
  edges: any[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  config?: Record<string, unknown>;
  errorHandlingStrategy?: string;
  executionStrategy?: string;
}): WorkflowConfigData {
  return createWorkflow({
    workflow: {
      id: config.id,
      name: config.name,
      description: config.description,
      type: config.type,
      status: config.status,
      nodes: config.nodes,
      edges: config.edges,
      tags: config.tags,
      metadata: config.metadata,
      config: config.config,
      errorHandlingStrategy: config.errorHandlingStrategy,
      executionStrategy: config.executionStrategy,
    },
  });
}