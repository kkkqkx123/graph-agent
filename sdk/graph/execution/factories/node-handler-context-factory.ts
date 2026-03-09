/**
 * 节点处理器上下文工厂
 * 负责为不同类型的节点创建相应的处理器上下文
 *
 * 设计原则：
 * - 集中管理节点处理器的依赖
 * - 根据节点类型创建合适的上下文
 * - 简化 NodeExecutionCoordinator 的职责
 */

import type { Node } from '@modular-agent/types';
import type { ThreadEntity } from '../../entities/thread-entity.js';
import type { UserInteractionHandler } from '@modular-agent/types';
import type { HumanRelayHandler } from '@modular-agent/types';
import type { ConversationManager } from '../../../core/execution/managers/conversation-manager.js';
import type { EventManager } from '../../../core/services/event-manager.js';
import { LLMExecutionCoordinator } from '../coordinators/llm-execution-coordinator.js';
import { ExecutionError } from '@modular-agent/types';

/**
 * 节点处理器上下文工厂配置
 */
export interface NodeHandlerContextFactoryConfig {
  /** 事件管理器 */
  eventManager: EventManager;
  /** LLM 执行协调器 */
  llmCoordinator: LLMExecutionCoordinator;
  /** 对话管理器 */
  conversationManager: ConversationManager;
  /** 用户交互处理器（可选） */
  userInteractionHandler?: UserInteractionHandler;
  /** 人工中继处理器（可选） */
  humanRelayHandler?: HumanRelayHandler;
  /** 工具上下文管理器（可选） */
  toolContextManager?: any;
  /** 工具服务（可选） */
  toolService?: any;
  /** Agent 循环执行器工厂（可选） */
  agentLoopExecutorFactory?: any;
}

/**
 * 节点处理器上下文工厂
 *
 * 职责：
 * - 根据节点类型创建对应的处理器上下文
 * - 集中管理处理器依赖
 * - 验证必需依赖是否存在
 */
export class NodeHandlerContextFactory {
  constructor(private config: NodeHandlerContextFactoryConfig) { }

  /**
   * 创建节点处理器上下文
   *
   * @param node 节点定义
   * @param threadEntity 线程实体
   * @returns 处理器上下文
   * @throws ExecutionError 当必需依赖缺失时
   */
  createHandlerContext(node: Node, threadEntity: ThreadEntity): any {
    switch (node.type) {
      case 'USER_INTERACTION':
        return this.createUserInteractionContext(node, threadEntity);

      case 'CONTEXT_PROCESSOR':
        return this.createContextProcessorContext();

      case 'LLM':
        return this.createLLMContext();

      case 'AGENT_LOOP':
        return this.createAgentLoopContext(node, threadEntity);

      case 'ADD_TOOL':
        return this.createAddToolContext(node, threadEntity);

      default:
        // 其他节点类型不需要特殊上下文
        return {};
    }
  }

  /**
   * 创建用户交互节点上下文
   */
  private createUserInteractionContext(node: Node, threadEntity: ThreadEntity): any {
    if (!this.config.userInteractionHandler) {
      throw new ExecutionError(
        'UserInteractionHandler is not provided',
        node.id,
        threadEntity.getWorkflowId()
      );
    }

    return {
      userInteractionHandler: this.config.userInteractionHandler,
      conversationManager: this.config.conversationManager
    };
  }

  /**
   * 创建上下文处理器节点上下文
   */
  private createContextProcessorContext(): any {
    return {
      conversationManager: this.config.conversationManager
    };
  }

  /**
   * 创建 LLM 节点上下文
   */
  private createLLMContext(): any {
    return {
      llmCoordinator: this.config.llmCoordinator,
      eventManager: this.config.eventManager,
      conversationManager: this.config.conversationManager,
      humanRelayHandler: this.config.humanRelayHandler
    };
  }

  /**
   * 创建工具添加节点上下文
   */
  private createAddToolContext(node: Node, threadEntity: ThreadEntity): any {
    if (!this.config.toolContextManager || !this.config.toolService) {
      throw new ExecutionError(
        'ToolContextManager or ToolService is not provided',
        node.id,
        threadEntity.getWorkflowId()
      );
    }

    return {
      toolContextManager: this.config.toolContextManager,
      toolService: this.config.toolService,
      eventManager: this.config.eventManager,
      threadEntity
    };
  }

  /**
   * 创建 Agent Loop 节点上下文
   */
  private createAgentLoopContext(node: Node, threadEntity: ThreadEntity): any {
    if (!this.config.agentLoopExecutorFactory) {
      throw new ExecutionError(
        'AgentLoopExecutorFactory is not provided',
        node.id,
        threadEntity.getWorkflowId()
      );
    }

    return {
      agentLoopExecutor: this.config.agentLoopExecutorFactory.create(),
      llmCoordinator: this.config.llmCoordinator,
      conversationManager: this.config.conversationManager,
      eventManager: this.config.eventManager,
      // 这里的 toolCallExecutor 通常在 NodeExecutionCoordinator 中可以通过 Identifier 获取
      // 但在 handler 中，我们需要确保它被传入。
      // 注意：agent-loop-handler 使用 agentLoopExecutor 执行循环
    };
  }
}
