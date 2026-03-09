/**
 * APIDependencyManager - API依赖管理类
 * 统一管理API层所需的所有Core层依赖
 *
 * 设计原则：
 * - 严格约束实例获取方式
 * - 保证API层不会以错误的方式获取各类实例
 * - 规范化依赖管理
 * - 所有方法返回具体类型，确保类型安全
 * - 统一通过DI容器获取依赖
 */

import { getContainer } from '../../core/di/index.js';
import * as Identifiers from '../../core/di/service-identifiers.js';
import type { WorkflowRegistry } from '../../core/services/workflow-registry.js';
import type { ThreadRegistry } from '../../core/services/thread-registry.js';
import type { EventManager } from '../../core/services/event-manager.js';
import type { CheckpointStateManager } from '../../graph/execution/managers/checkpoint-state-manager.js';
import type { ToolService } from '../../core/services/tool-service.js';
import type { LLMExecutor } from '../../graph/execution/executors/llm-executor.js';
import type { ScriptService } from '../../core/services/script-service.js';
import type { NodeTemplateRegistry } from '../../core/services/node-template-registry.js';
import type { TriggerTemplateRegistry } from '../../core/services/trigger-template-registry.js';
import type { GraphRegistry } from '../../core/services/graph-registry.js';

/**
 * API依赖管理类
 * 通过DI容器管理所有依赖实例
 */
export class APIDependencyManager {
  private container = getContainer();

  /**
   * 构造函数
   */
  constructor() {
    // 容器已在外部初始化
  }

  /**
   * 获取工作流注册表
   */
  getWorkflowRegistry(): WorkflowRegistry {
    return this.container.get(Identifiers.WorkflowRegistry);
  }

  /**
   * 获取线程注册表
   */
  getThreadRegistry(): ThreadRegistry {
    return this.container.get(Identifiers.ThreadRegistry);
  }

  /**
   * 获取事件管理器
   */
  getEventManager(): EventManager {
    return this.container.get(Identifiers.EventManager);
  }

  /**
   * 获取检查点状态管理器
   */
  getCheckpointStateManager(): CheckpointStateManager {
    return this.container.get(Identifiers.CheckpointStateManager);
  }

  /**
   * 获取工具服务
   */
  getToolService(): ToolService {
    return this.container.get(Identifiers.ToolService);
  }

  /**
   * 获取LLM执行器
   */
  getLlmExecutor(): LLMExecutor {
    return this.container.get(Identifiers.LLMExecutor);
  }

  /**
   * 获取代码服务
   */
  getScriptService(): ScriptService {
    return this.container.get(Identifiers.ScriptService);
  }

  /**
   * 获取节点模板注册表
   */
  getNodeTemplateRegistry(): NodeTemplateRegistry {
    return this.container.get(Identifiers.NodeTemplateRegistry);
  }

  /**
   * 获取触发器模板注册表
   */
  getTriggerTemplateRegistry(): TriggerTemplateRegistry {
    return this.container.get(Identifiers.TriggerTemplateRegistry);
  }

  /**
   * 获取图注册表
   */
  getGraphRegistry(): GraphRegistry {
    return this.container.get(Identifiers.GraphRegistry);
  }

  /**
   * 获取线程生命周期协调器
   */
  getThreadLifecycleCoordinator(): import('../../graph/execution/coordinators/thread-lifecycle-coordinator.js').ThreadLifecycleCoordinator {
    return this.container.get(Identifiers.ThreadLifecycleCoordinator);
  }

  /**
   * 获取 LLM 包装器
   */
  getLLMWrapper(): import('../../core/llm/wrapper.js').LLMWrapper {
    return this.container.get(Identifiers.LLMWrapper);
  }
}
