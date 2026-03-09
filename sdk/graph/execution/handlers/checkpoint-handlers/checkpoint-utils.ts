/**
 * 检查点工具函数
 * 提供函数式的检查点创建接口
 */

import type { ID } from '@modular-agent/types';
import type { CheckpointMetadata } from '@modular-agent/types';
import type { ThreadRegistry } from '../../../services/thread-registry.js';
import type { WorkflowRegistry } from '../../../services/workflow-registry.js';
import type { GraphRegistry } from '../../../services/graph-registry.js';
import { CheckpointStateManager } from '../../managers/checkpoint-state-manager.js';
import { CheckpointCoordinator } from '../../coordinators/checkpoint-coordinator.js';
import { mergeMetadata } from '../../../../utils/metadata-utils.js';

/**
 * 检查点创建选项
 */
export interface CreateCheckpointOptions {
  /** 线程ID */
  threadId: ID;
  /** 节点ID（可选） */
  nodeId?: ID;
  /** 工具ID（可选） */
  toolId?: ID;
  /** 检查点描述 */
  description?: string;
  /** 自定义元数据 */
  metadata?: CheckpointMetadata;
}

/**
 * 检查点依赖项
 */
export interface CheckpointDependencies {
  /** 线程注册表 */
  threadRegistry: ThreadRegistry;
  /** 检查点状态管理器 */
  checkpointStateManager: CheckpointStateManager;
  /** 工作流注册表 */
  workflowRegistry: WorkflowRegistry;
  /** 图注册表 */
  graphRegistry: GraphRegistry;
}

/**
 * 创建检查点（函数式接口）
 * @param options 检查点创建选项
 * @param dependencies 检查点依赖项
 * @returns 检查点ID
 */
export async function createCheckpoint(
  options: CreateCheckpointOptions,
  dependencies: CheckpointDependencies
): Promise<string> {
  const { threadId, nodeId, toolId, description, metadata } = options;

  // 构建检查点元数据
  const checkpointMetadata: CheckpointMetadata = mergeMetadata(
    metadata || {},
    {
      description: description || `Checkpoint${nodeId ? ` for node ${nodeId}` : toolId ? ` for tool ${toolId}` : ''}`,
      customFields: mergeMetadata(metadata?.customFields || {}, { nodeId, toolId })
    }
  );

  // 调用静态方法创建检查点
  return await CheckpointCoordinator.createCheckpoint(threadId, dependencies, checkpointMetadata);
}

/**
 * 批量创建检查点
 * @param optionsList 检查点创建选项列表
 * @param dependencies 检查点依赖项
 * @returns 检查点ID数组
 */
export async function createCheckpoints(
  optionsList: CreateCheckpointOptions[],
  dependencies: CheckpointDependencies
): Promise<string[]> {
  const results: string[] = [];

  // 并行创建检查点
  const promises = optionsList.map(options => 
    createCheckpoint(options, dependencies)
  );

  // 等待所有检查点创建完成
  const checkpointIds = await Promise.all(promises);
  results.push(...checkpointIds);

  return results;
}

/**
 * 创建节点级别检查点（便捷函数）
 * @param threadId 线程ID
 * @param nodeId 节点ID
 * @param description 检查点描述
 * @param dependencies 检查点依赖项
 * @returns 检查点ID
 */
export async function createNodeCheckpoint(
  threadId: ID,
  nodeId: ID,
  dependencies: CheckpointDependencies,
  description?: string
): Promise<string> {
  return createCheckpoint(
    {
      threadId,
      nodeId,
      description: description || `Node checkpoint for node ${nodeId}`
    },
    dependencies
  );
}

/**
 * 创建工具级别检查点（便捷函数）
 * @param threadId 线程ID
 * @param toolName 工具名称
 * @param description 检查点描述
 * @param dependencies 检查点依赖项
 * @returns 检查点ID
 */
export async function createToolCheckpoint(
  threadId: ID,
  toolId: ID,
  dependencies: CheckpointDependencies,
  description?: string
): Promise<string> {
  return createCheckpoint(
    {
      threadId,
      toolId,
      description: description || `Tool checkpoint for tool ${toolId}`
    },
    dependencies
  );
}
