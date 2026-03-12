/**
 * 触发器处理器上下文工厂
 * 负责为不同类型的触发器动作创建相应的处理器上下文
 *
 * 设计原则：
 * - 集中管理触发器处理器的依赖
 * - 根据触发器动作类型创建合适的上下文
 * - 简化 TriggerCoordinator 的职责
 * - 验证必需依赖是否存在
 */

import type { Trigger, TriggerAction } from '@modular-agent/types';
import type { ThreadRegistry } from '../../services/thread-registry.js';
import type { WorkflowRegistry } from '../../services/workflow-registry.js';
import type { GraphRegistry } from '../../services/graph-registry.js';
import type { EventManager } from '../../../core/managers/event-manager.js';
import type { TriggerStateManager } from '../managers/trigger-state-manager.js';
import type { CheckpointStateManager } from '../managers/checkpoint-state-manager.js';
import type { ThreadBuilder } from '../thread-builder.js';
import type { TaskQueueManager } from '../managers/task-queue-manager.js';
import type { ThreadLifecycleCoordinator } from '../coordinators/thread-lifecycle-coordinator.js';
import { DependencyInjectionError } from '@modular-agent/types';

/**
 * 生命周期触发器上下文
 * 用于 stop_thread、pause_thread、resume_thread 动作
 */
export interface LifecycleTriggerContext {
  threadLifecycleCoordinator: ThreadLifecycleCoordinator;
}

/**
 * 跳过节点触发器上下文
 * 用于 skip_node 动作
 */
export interface SkipNodeTriggerContext {
  threadRegistry: ThreadRegistry;
  eventManager: EventManager;
}

/**
 * 设置变量触发器上下文
 * 用于 set_variable 动作
 */
export interface SetVariableTriggerContext {
  threadRegistry: ThreadRegistry;
}

/**
 * 执行子图触发器上下文
 * 用于 execute_triggered_subgraph 动作
 */
export interface ExecuteSubgraphTriggerContext {
  threadRegistry: ThreadRegistry;
  eventManager: EventManager;
  threadBuilder: ThreadBuilder;
  taskQueueManager: TaskQueueManager;
  parentThreadId: string;
}

/**
 * 触发器处理器上下文工厂配置
 */
export interface TriggerHandlerContextFactoryConfig {
  // 核心依赖（必需）
  /** 线程注册表 */
  threadRegistry: ThreadRegistry;
  /** 工作流注册表 */
  workflowRegistry: WorkflowRegistry;
  /** 触发器状态管理器 */
  stateManager: TriggerStateManager;

  // 可选依赖
  /** 检查点状态管理器 */
  checkpointStateManager?: CheckpointStateManager;
  /** 图注册表 */
  graphRegistry?: GraphRegistry;
  /** 事件管理器 */
  eventManager?: EventManager;
  /** 线程构建器 */
  threadBuilder?: ThreadBuilder;
  /** 任务队列管理器 */
  taskQueueManager?: TaskQueueManager;
  /** 线程生命周期协调器 */
  threadLifecycleCoordinator?: ThreadLifecycleCoordinator;
}

/**
 * 触发器处理器上下文工厂
 *
 * 职责：
 * - 根据触发器动作类型创建对应的处理器上下文
 * - 集中管理触发器处理器依赖
 * - 验证必需依赖是否存在
 */
export class TriggerHandlerContextFactory {
  constructor(private config: TriggerHandlerContextFactoryConfig) {}

  /**
   * 创建触发器处理器上下文
   *
   * @param trigger 触发器
   * @returns 处理器上下文
   * @throws DependencyInjectionError 当必需依赖缺失时
   */
  createHandlerContext(trigger: Trigger): TriggerHandlerContext {
    const actionType = trigger.action.type;

    switch (actionType) {
      case 'stop_thread':
      case 'pause_thread':
      case 'resume_thread':
        return this.createLifecycleContext(trigger);

      case 'skip_node':
        return this.createSkipNodeContext(trigger);

      case 'set_variable':
        return this.createSetVariableContext(trigger);

      case 'execute_triggered_subgraph':
        return this.createSubgraphContext(trigger);

      default:
        // 对于其他动作类型，返回空上下文
        return {};
    }
  }

  /**
   * 创建生命周期触发器上下文
   *
   * @param trigger 触发器
   * @returns 生命周期触发器上下文
   * @throws DependencyInjectionError 当 ThreadLifecycleCoordinator 缺失时
   */
  private createLifecycleContext(trigger: Trigger): LifecycleTriggerContext {
    if (!this.config.threadLifecycleCoordinator) {
      throw new DependencyInjectionError(
        'ThreadLifecycleCoordinator is required for lifecycle trigger actions',
        'ThreadLifecycleCoordinator',
        'TriggerHandlerContextFactory.createLifecycleContext',
        undefined,
        undefined,
        { triggerId: trigger.id, actionType: trigger.action.type }
      );
    }

    return {
      threadLifecycleCoordinator: this.config.threadLifecycleCoordinator
    };
  }

  /**
   * 创建跳过节点触发器上下文
   *
   * @param trigger 触发器
   * @returns 跳过节点触发器上下文
   * @throws DependencyInjectionError 当必需依赖缺失时
   */
  private createSkipNodeContext(trigger: Trigger): SkipNodeTriggerContext {
    if (!this.config.eventManager) {
      throw new DependencyInjectionError(
        'EventManager is required for skip_node trigger action',
        'EventManager',
        'TriggerHandlerContextFactory.createSkipNodeContext',
        undefined,
        undefined,
        { triggerId: trigger.id, actionType: trigger.action.type }
      );
    }

    return {
      threadRegistry: this.config.threadRegistry,
      eventManager: this.config.eventManager
    };
  }

  /**
   * 创建设置变量触发器上下文
   *
   * @param trigger 触发器
   * @returns 设置变量触发器上下文
   */
  private createSetVariableContext(trigger: Trigger): SetVariableTriggerContext {
    return {
      threadRegistry: this.config.threadRegistry
    };
  }

  /**
   * 创建执行子图触发器上下文
   *
   * @param trigger 触发器
   * @returns 执行子图触发器上下文
   * @throws DependencyInjectionError 当必需依赖缺失时
   */
  private createSubgraphContext(trigger: Trigger): ExecuteSubgraphTriggerContext {
    if (!this.config.eventManager) {
      throw new DependencyInjectionError(
        'EventManager is required for execute_triggered_subgraph trigger action',
        'EventManager',
        'TriggerHandlerContextFactory.createSubgraphContext',
        undefined,
        undefined,
        { triggerId: trigger.id, actionType: trigger.action.type }
      );
    }

    if (!this.config.threadBuilder) {
      throw new DependencyInjectionError(
        'ThreadBuilder is required for execute_triggered_subgraph trigger action',
        'ThreadBuilder',
        'TriggerHandlerContextFactory.createSubgraphContext',
        undefined,
        undefined,
        { triggerId: trigger.id, actionType: trigger.action.type }
      );
    }

    if (!this.config.taskQueueManager) {
      throw new DependencyInjectionError(
        'TaskQueueManager is required for execute_triggered_subgraph trigger action',
        'TaskQueueManager',
        'TriggerHandlerContextFactory.createSubgraphContext',
        undefined,
        undefined,
        { triggerId: trigger.id, actionType: trigger.action.type }
      );
    }

    return {
      threadRegistry: this.config.threadRegistry,
      eventManager: this.config.eventManager,
      threadBuilder: this.config.threadBuilder,
      taskQueueManager: this.config.taskQueueManager,
      parentThreadId: trigger.threadId || ''
    };
  }

  /**
   * 检查是否支持检查点功能
   *
   * @returns 是否支持
   */
  hasCheckpointSupport(): boolean {
    return !!(this.config.checkpointStateManager && this.config.graphRegistry);
  }

  /**
   * 获取线程注册表
   */
  getThreadRegistry(): ThreadRegistry {
    return this.config.threadRegistry;
  }

  /**
   * 获取工作流注册表
   */
  getWorkflowRegistry(): WorkflowRegistry {
    return this.config.workflowRegistry;
  }

  /**
   * 获取触发器状态管理器
   */
  getStateManager(): TriggerStateManager {
    return this.config.stateManager;
  }

  /**
   * 获取检查点状态管理器
   */
  getCheckpointStateManager(): CheckpointStateManager | undefined {
    return this.config.checkpointStateManager;
  }

  /**
   * 获取图注册表
   */
  getGraphRegistry(): GraphRegistry | undefined {
    return this.config.graphRegistry;
  }

  /**
   * 获取事件管理器
   */
  getEventManager(): EventManager | undefined {
    return this.config.eventManager;
  }

  /**
   * 获取线程生命周期协调器
   */
  getThreadLifecycleCoordinator(): ThreadLifecycleCoordinator | undefined {
    return this.config.threadLifecycleCoordinator;
  }

  /**
   * 获取所有依赖
   */
  getDependencies(): {
    checkpointStateManager: CheckpointStateManager | undefined;
    graphRegistry: GraphRegistry | undefined;
    threadRegistry: ThreadRegistry;
    workflowRegistry: WorkflowRegistry | undefined;
    threadLifecycleCoordinator: ThreadLifecycleCoordinator | undefined;
    eventManager: EventManager | undefined;
    threadBuilder: ThreadBuilder | undefined;
    taskQueueManager: TaskQueueManager | undefined;
  } {
    return {
      checkpointStateManager: this.config.checkpointStateManager,
      graphRegistry: this.config.graphRegistry,
      threadRegistry: this.config.threadRegistry,
      workflowRegistry: this.config.workflowRegistry,
      threadLifecycleCoordinator: this.config.threadLifecycleCoordinator,
      eventManager: this.config.eventManager,
      threadBuilder: this.config.threadBuilder,
      taskQueueManager: this.config.taskQueueManager
    };
  }
}

/**
 * 触发器处理器上下文联合类型
 */
export type TriggerHandlerContext =
  | LifecycleTriggerContext
  | SkipNodeTriggerContext
  | SetVariableTriggerContext
  | ExecuteSubgraphTriggerContext
  | {};
