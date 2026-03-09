/**
 * Agent Loop 检查点工具函数
 *
 * 提供函数式的检查点创建接口
 */

import type { ID } from '@modular-agent/types';
import type { CheckpointMetadata } from '@modular-agent/types';
import type { AgentLoopEntity } from '../types.js';
import { AgentLoopCheckpointCoordinator, type CheckpointDependencies, type CheckpointOptions } from './checkpoint-coordinator.js';
import { mergeMetadata } from '../../utils/metadata-utils.js';

/**
 * 检查点创建选项
 */
export interface CreateCheckpointOptions {
  /** Agent Loop ID */
  agentLoopId?: ID;
  /** 检查点描述 */
  description?: string;
  /** 自定义元数据 */
  metadata?: CheckpointMetadata;
}

/**
 * 创建检查点（函数式接口）
 * @param entity Agent Loop 实体
 * @param dependencies 检查点依赖项
 * @param options 检查点创建选项
 * @returns 检查点ID
 */
export async function createCheckpoint(
  entity: AgentLoopEntity,
  dependencies: CheckpointDependencies,
  options: CreateCheckpointOptions = {}
): Promise<string> {
  const { description, metadata } = options;

  // 构建检查点元数据
  const checkpointMetadata: CheckpointMetadata = mergeMetadata(
    metadata || {},
    {
      description: description || `Checkpoint for agent loop ${entity.id}`
    }
  );

  // 调用静态方法创建检查点
  return await AgentLoopCheckpointCoordinator.createCheckpoint(
    entity,
    dependencies,
    { metadata: checkpointMetadata }
  );
}

/**
 * 从检查点恢复 Agent Loop 实体（函数式接口）
 * @param checkpointId 检查点ID
 * @param dependencies 检查点依赖项
 * @returns Agent Loop 实例
 */
export async function restoreFromCheckpoint(
  checkpointId: string,
  dependencies: CheckpointDependencies
): Promise<AgentLoopEntity> {
  return await AgentLoopCheckpointCoordinator.restoreFromCheckpoint(
    checkpointId,
    dependencies
  );
}