/**
 * Agent Loop 生命周期处理函数
 *
 * 负责 AgentLoopEntity 的生命周期管理，包括：
 * - 检查点创建
 * - 资源清理
 * - 实例克隆
 *
 * 设计原则：
 * - 函数式导出：采用纯函数而非静态类方法
 * - 与实体类解耦：生命周期逻辑与实体类分离
 * - 支持状态持久化：支持检查点
 */

import { AgentLoopEntity } from '../../entities/agent-loop-entity.js';

/**
 * 检查点依赖项
 */
export interface AgentLoopCheckpointDependencies {
  saveCheckpoint: (checkpoint: any) => Promise<string>;
  getCheckpoint: (id: string) => Promise<any>;
  listCheckpoints: (agentLoopId: string) => Promise<string[]>;
  deltaConfig?: any;
}

/**
 * 检查点创建选项
 */
export interface AgentLoopCheckpointOptions {
  metadata?: any;
}

/**
 * 创建 Agent Loop 检查点
 * @param entity Agent Loop 实体
 * @param dependencies 检查点依赖项
 * @param options 检查点创建选项
 * @returns 检查点ID
 */
export async function createAgentLoopCheckpoint(
  entity: AgentLoopEntity,
  dependencies: AgentLoopCheckpointDependencies,
  options?: AgentLoopCheckpointOptions
): Promise<string> {
  const { AgentLoopCheckpointCoordinator } = await import('../../checkpoint/index.js');
  return await AgentLoopCheckpointCoordinator.createCheckpoint(
    entity,
    dependencies,
    options
  );
}

/**
 * 清理 Agent Loop 资源
 * @param entity Agent Loop 实体
 */
export function cleanupAgentLoop(entity: AgentLoopEntity): void {
  entity.state.cleanup();
  entity.messageHistoryManager.cleanup();
  entity.variableStateManager.cleanup();
  entity.abortController = undefined;
}

/**
 * 克隆 Agent Loop 实体
 * @param entity Agent Loop 实体
 * @returns 克隆的实体
 */
export function cloneAgentLoop(entity: AgentLoopEntity): AgentLoopEntity {
  const cloned = new AgentLoopEntity(
    entity.id,
    { ...entity.config },
    entity.state.clone()
  );

  // 克隆消息历史
  const messageSnapshot = entity.messageHistoryManager.createSnapshot();
  cloned.messageHistoryManager.restoreFromSnapshot(messageSnapshot);

  // 克隆变量状态
  const variableSnapshot = entity.variableStateManager.createSnapshot();
  cloned.variableStateManager.restoreFromSnapshot(variableSnapshot);

  cloned.parentThreadId = entity.parentThreadId;
  cloned.nodeId = entity.nodeId;
  cloned.conversationManager = entity.conversationManager;
  return cloned;
}
