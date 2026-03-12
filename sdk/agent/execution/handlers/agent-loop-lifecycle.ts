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
import { createContextualLogger } from '../../../utils/contextual-logger.js';

const logger = createContextualLogger({ component: 'AgentLoopLifecycle' });

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
  logger.info('Creating Agent Loop checkpoint', {
    agentLoopId: entity.id,
    iteration: entity.state.currentIteration,
    status: entity.getStatus()
  });

  try {
    const { AgentLoopCheckpointCoordinator } = await import('../../checkpoint/index.js');
    const checkpointId = await AgentLoopCheckpointCoordinator.createCheckpoint(
      entity,
      dependencies,
      options
    );

    logger.info('Agent Loop checkpoint created successfully', {
      agentLoopId: entity.id,
      checkpointId,
      iteration: entity.state.currentIteration
    });

    return checkpointId;
  } catch (error) {
    logger.error('Failed to create Agent Loop checkpoint', {
      agentLoopId: entity.id,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * 清理 Agent Loop 资源
 * @param entity Agent Loop 实例
 */
export function cleanupAgentLoop(entity: AgentLoopEntity): void {
  logger.debug('Cleaning up Agent Loop resources', {
    agentLoopId: entity.id,
    iteration: entity.state.currentIteration,
    status: entity.getStatus()
  });

  entity.state.cleanup();
  entity.messageHistoryManager.cleanup();
  entity.variableStateManager.cleanup();
  entity.abortController = undefined;

  logger.info('Agent Loop resources cleaned up', {
    agentLoopId: entity.id,
    iteration: entity.state.currentIteration
  });
}

/**
 * 克隆 Agent Loop 实体
 * @param entity Agent Loop 实体
 * @returns 克隆的实体
 */
export function cloneAgentLoop(entity: AgentLoopEntity): AgentLoopEntity {
  logger.debug('Cloning Agent Loop entity', {
    agentLoopId: entity.id,
    iteration: entity.state.currentIteration,
    status: entity.getStatus()
  });

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

  logger.info('Agent Loop entity cloned successfully', {
    agentLoopId: entity.id,
    clonedAgentLoopId: cloned.id,
    iteration: entity.state.currentIteration
  });

  return cloned;
}
