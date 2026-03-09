/**
 * LLM 上下文工厂
 * 负责为 LLM 执行协调器创建各种上下文
 *
 * 设计原则：
 * - 集中管理 LLM 执行相关的依赖
 * - 根据场景创建合适的上下文
 * - 简化 LLMExecutionCoordinator 的职责
 * - 验证必需依赖是否存在
 */

import type { ThreadRegistry } from '../../services/thread-registry.js';
import type { WorkflowRegistry } from '../../services/workflow-registry.js';
import type { GraphRegistry } from '../../services/graph-registry.js';
import type { EventManager } from '../../../core/services/event-manager.js';
import type { ToolService } from '../../../core/services/tool-service.js';
import type { LLMExecutor } from '../executors/llm-executor.js';
import type { ToolCallExecutor } from '../executors/tool-call-executor.js';
import type { InterruptionDetector } from '../managers/interruption-detector.js';
import type { CheckpointStateManager } from '../managers/checkpoint-state-manager.js';
import { ExecutionError } from '@modular-agent/types';

/**
 * 工具审批上下文
 */
export interface ToolApprovalContext {
  threadRegistry: ThreadRegistry;
  checkpointStateManager: CheckpointStateManager;
  workflowRegistry?: WorkflowRegistry;
  graphRegistry?: GraphRegistry;
}

/**
 * 中断检测上下文
 */
export interface InterruptionContext {
  threadRegistry?: ThreadRegistry;
  interruptionDetector?: InterruptionDetector;
}

/**
 * 工具执行上下文
 */
export interface ToolExecutionContext {
  toolService: ToolService;
  toolCallExecutor: ToolCallExecutor;
  eventManager: EventManager;
}

/**
 * LLM 调用上下文
 */
export interface LLMCallContext {
  llmExecutor: LLMExecutor;
  eventManager: EventManager;
  toolService: ToolService;
}

/**
 * 工具可见性上下文
 */
export interface ToolVisibilityContext {
  toolContextManager?: any;
  toolVisibilityCoordinator?: any;
  toolService: ToolService;
}

/**
 * LLM 上下文工厂配置
 */
export interface LLMContextFactoryConfig {
  // 核心依赖（必需）
  /** LLM 执行器 */
  llmExecutor: LLMExecutor;
  /** 工具服务 */
  toolService: ToolService;
  /** 事件管理器 */
  eventManager: EventManager;
  /** 工具调用执行器 */
  toolCallExecutor: ToolCallExecutor;

  // 上下文相关（可选）
  /** 线程注册表 */
  threadRegistry?: ThreadRegistry;
  /** 中断检测器 */
  interruptionDetector?: InterruptionDetector;
  /** 检查点状态管理器 */
  checkpointStateManager?: CheckpointStateManager;
  /** 工作流注册表 */
  workflowRegistry?: WorkflowRegistry;
  /** 图注册表 */
  graphRegistry?: GraphRegistry;
  /** 工具上下文管理器 */
  toolContextManager?: any;
  /** 工具可见性协调器 */
  toolVisibilityCoordinator?: any;
}

/**
 * LLM 上下文工厂
 *
 * 职责：
 * - 根据场景创建对应的上下文
 * - 集中管理 LLM 执行相关依赖
 * - 验证必需依赖是否存在
 */
export class LLMContextFactory {
  constructor(private config: LLMContextFactoryConfig) {}

  /**
   * 创建工具审批上下文
   *
   * @param threadId 线程 ID
   * @param nodeId 节点 ID
   * @returns 工具审批上下文
   * @throws ExecutionError 当必需依赖缺失时
   */
  createToolApprovalContext(threadId: string, nodeId: string): ToolApprovalContext {
    if (!this.config.threadRegistry) {
      throw new ExecutionError(
        'ThreadRegistry is required for tool approval context',
        nodeId,
        undefined,
        { threadId }
      );
    }

    if (!this.config.checkpointStateManager) {
      throw new ExecutionError(
        'CheckpointStateManager is required for tool approval context',
        nodeId,
        undefined,
        { threadId }
      );
    }

    return {
      threadRegistry: this.config.threadRegistry,
      checkpointStateManager: this.config.checkpointStateManager,
      workflowRegistry: this.config.workflowRegistry,
      graphRegistry: this.config.graphRegistry
    };
  }

  /**
   * 创建中断检测上下文
   *
   * @returns 中断检测上下文
   */
  createInterruptionContext(): InterruptionContext {
    return {
      threadRegistry: this.config.threadRegistry,
      interruptionDetector: this.config.interruptionDetector
    };
  }

  /**
   * 创建工具执行上下文
   *
   * @returns 工具执行上下文
   */
  createToolExecutionContext(): ToolExecutionContext {
    return {
      toolService: this.config.toolService,
      toolCallExecutor: this.config.toolCallExecutor,
      eventManager: this.config.eventManager
    };
  }

  /**
   * 创建 LLM 调用上下文
   *
   * @returns LLM 调用上下文
   */
  createLLMCallContext(): LLMCallContext {
    return {
      llmExecutor: this.config.llmExecutor,
      eventManager: this.config.eventManager,
      toolService: this.config.toolService
    };
  }

  /**
   * 创建工具可见性上下文
   *
   * @returns 工具可见性上下文
   */
  createToolVisibilityContext(): ToolVisibilityContext {
    return {
      toolContextManager: this.config.toolContextManager,
      toolVisibilityCoordinator: this.config.toolVisibilityCoordinator,
      toolService: this.config.toolService
    };
  }

  /**
   * 检查是否支持工具审批功能
   *
   * @returns 是否支持
   */
  hasToolApprovalSupport(): boolean {
    return !!(this.config.threadRegistry && this.config.checkpointStateManager);
  }

  /**
   * 检查是否支持中断检测功能
   *
   * @returns 是否支持
   */
  hasInterruptionSupport(): boolean {
    return !!(this.config.interruptionDetector || this.config.threadRegistry);
  }

  /**
   * 获取线程注册表
   */
  getThreadRegistry(): ThreadRegistry | undefined {
    return this.config.threadRegistry;
  }

  /**
   * 获取事件管理器
   */
  getEventManager(): EventManager {
    return this.config.eventManager;
  }

  /**
   * 获取工具服务
   */
  getToolService(): ToolService {
    return this.config.toolService;
  }

  /**
   * 获取 LLM 执行器
   */
  getLLMExecutor(): LLMExecutor {
    return this.config.llmExecutor;
  }

  /**
   * 获取工具调用执行器
   */
  getToolCallExecutor(): ToolCallExecutor {
    return this.config.toolCallExecutor;
  }

  /**
   * 获取检查点状态管理器
   */
  getCheckpointStateManager(): CheckpointStateManager | undefined {
    return this.config.checkpointStateManager;
  }

  /**
   * 获取工作流注册表
   */
  getWorkflowRegistry(): WorkflowRegistry | undefined {
    return this.config.workflowRegistry;
  }

  /**
   * 获取图注册表
   */
  getGraphRegistry(): GraphRegistry | undefined {
    return this.config.graphRegistry;
  }

  /**
   * 获取工具上下文管理器
   */
  getToolContextManager(): any {
    return this.config.toolContextManager;
  }

  /**
   * 获取工具可见性协调器
   */
  getToolVisibilityCoordinator(): any {
    return this.config.toolVisibilityCoordinator;
  }
}
