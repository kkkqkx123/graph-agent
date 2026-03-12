/**
 * AgentLoopFactory - Agent Loop 工厂类
 *
 * 负责 AgentLoopEntity 实例的创建，包括：
 * - 创建新实例
 * - 从检查点恢复
 *
 * 设计原则：
 * - 集中管理实例创建逻辑
 * - 与实体类解耦
 * - 支持多种创建方式
 */

import { randomUUID } from 'crypto';
import type { ID, LLMMessage, AgentLoopConfig } from '@modular-agent/types';
import { AgentLoopEntity } from '../../entities/agent-loop-entity.js';
import { AgentLoopState } from '../../entities/agent-loop-state.js';
import type { ConversationManager } from '../../../core/managers/conversation-manager.js';
import { createContextualLogger } from '../../../utils/contextual-logger.js';

const logger = createContextualLogger({ component: 'AgentLoopFactory' });

/**
 * AgentLoopEntity 创建选项
 */
export interface AgentLoopEntityOptions {
  /** 初始消息 */
  initialMessages?: LLMMessage[];
  /** 初始变量 */
  initialVariables?: Record<string, any>;
  /** 对话管理器 */
  conversationManager?: ConversationManager;
  /** 父 Thread ID */
  parentThreadId?: ID;
  /** 节点 ID */
  nodeId?: ID;
}

/**
 * AgentLoopFactory - Agent Loop 工厂类
 *
 * 职责：
 * - 创建新的 AgentLoopEntity 实例
 * - 从检查点恢复 AgentLoopEntity
 *
 * 设计原则：
 * - 工厂模式：集中管理实例创建
 * - 解耦：创建逻辑与实体类分离
 * - 扩展性：支持多种创建方式
 */
export class AgentLoopFactory {
  /**
   * 创建新的 AgentLoopEntity 实例
   * @param config 循环配置
   * @param options 创建选项
   * @returns AgentLoopEntity 实例
   */
  static create(config: AgentLoopConfig, options: AgentLoopEntityOptions = {}): AgentLoopEntity {
    const id = `agent-loop-${randomUUID()}`;
    const entity = new AgentLoopEntity(id, config);

    logger.info('Creating new Agent Loop entity', {
      agentLoopId: id,
      maxIterations: config.maxIterations,
      toolsCount: config.tools?.length || 0,
      profileId: config.profileId || 'DEFAULT'
    });

    // 初始化消息历史
    if (options.initialMessages && options.initialMessages.length > 0) {
      entity.messageHistoryManager.setMessages(options.initialMessages);
      logger.debug('Agent Loop initialized with initial messages', {
        agentLoopId: id,
        messageCount: options.initialMessages.length
      });
    } else if (config.initialMessages && config.initialMessages.length > 0) {
      entity.messageHistoryManager.setMessages(config.initialMessages as LLMMessage[]);
      logger.debug('Agent Loop initialized with config messages', {
        agentLoopId: id,
        messageCount: config.initialMessages.length
      });
    }

    // 初始化变量
    if (options.initialVariables) {
      const variableCount = Object.keys(options.initialVariables).length;
      for (const [key, value] of Object.entries(options.initialVariables)) {
        entity.variableStateManager.setVariable(key, value);
      }
      logger.debug('Agent Loop initialized with variables', {
        agentLoopId: id,
        variableCount
      });
    }

    // 设置对话管理器
    if (options.conversationManager) {
      entity.setConversationManager(options.conversationManager);
      logger.debug('Agent Loop set with conversation manager', { agentLoopId: id });
    }

    // 设置父 Thread ID 和节点 ID
    entity.parentThreadId = options.parentThreadId;
    entity.nodeId = options.nodeId;

    if (options.parentThreadId || options.nodeId) {
      logger.debug('Agent Loop set with parent context', {
        agentLoopId: id,
        parentThreadId: options.parentThreadId,
        nodeId: options.nodeId
      });
    }

    logger.info('Agent Loop entity created successfully', { agentLoopId: id });
    return entity;
  }

  /**
   * 从检查点恢复 AgentLoopEntity 实例
   * @param checkpointId 检查点ID
   * @param dependencies 检查点依赖项
   * @returns AgentLoopEntity 实例
   */
  static async fromCheckpoint(
    checkpointId: string,
    dependencies: {
      saveCheckpoint: (checkpoint: any) => Promise<string>;
      getCheckpoint: (id: string) => Promise<any>;
      listCheckpoints: (agentLoopId: string) => Promise<string[]>;
      deltaConfig?: any;
    }
  ): Promise<AgentLoopEntity> {
    logger.info('Restoring Agent Loop from checkpoint', { checkpointId });

    try {
      const { AgentLoopCheckpointCoordinator } = await import('../../checkpoint/index.js');
      const entity = await AgentLoopCheckpointCoordinator.restoreFromCheckpoint(
        checkpointId,
        dependencies
      );

      logger.info('Agent Loop restored from checkpoint successfully', {
        agentLoopId: entity.id,
        checkpointId,
        iteration: entity.state.currentIteration
      });

      return entity;
    } catch (error) {
      throw error;
    }
  }
}
