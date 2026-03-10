/**
 * AgentLoopLifecycle - Agent Loop 生命周期管理器
 *
 * 负责 AgentLoopEntity 的生命周期管理，包括：
 * - 检查点创建
 * - 资源清理
 * - 实例克隆
 *
 * 设计原则：
 * - 集中管理生命周期操作
 * - 与实体类解耦
 * - 支持状态持久化
 */

import { AgentLoopEntity } from '../../entities/agent-loop-entity.js';

/**
 * AgentLoopLifecycle - Agent Loop 生命周期管理器
 *
 * 职责：
 * - 创建检查点
 * - 清理资源
 * - 克隆实例
 *
 * 设计原则：
 * - 生命周期管理：集中管理实例的生命周期操作
 * - 解耦：生命周期逻辑与实体类分离
 * - 状态持久化：支持检查点
 */
export class AgentLoopLifecycle {
  /**
   * 创建检查点
   * @param entity Agent Loop 实体
   * @param dependencies 检查点依赖项
   * @param options 检查点创建选项
   * @returns 检查点ID
   */
  static async createCheckpoint(
    entity: AgentLoopEntity,
    dependencies: {
      saveCheckpoint: (checkpoint: any) => Promise<string>;
      getCheckpoint: (id: string) => Promise<any>;
      listCheckpoints: (agentLoopId: string) => Promise<string[]>;
      deltaConfig?: any;
    },
    options?: {
      metadata?: any;
    }
  ): Promise<string> {
    const { AgentLoopCheckpointCoordinator } = await import('../../checkpoint/index.js');
    return await AgentLoopCheckpointCoordinator.createCheckpoint(
      entity,
      dependencies,
      options
    );
  }

  /**
   * 清理资源
   * @param entity Agent Loop 实体
   */
  static cleanup(entity: AgentLoopEntity): void {
    entity.state.cleanup();
    entity.messageHistoryManager.cleanup();
    entity.variableStateManager.cleanup();
    entity.abortController = undefined;
  }

  /**
   * 克隆实体
   * @param entity Agent Loop 实体
   * @returns 克隆的实体
   */
  static clone(entity: AgentLoopEntity): AgentLoopEntity {
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
}
