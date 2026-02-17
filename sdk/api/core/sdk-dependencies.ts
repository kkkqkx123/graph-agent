/**
 * APIDependencyManager - API依赖管理类
 * 统一管理API层所需的所有Core层依赖
 *
 * 设计原则：
 * - 严格约束实例获取方式
 * - 保证API层不会以错误的方式获取各类实例
 * - 规范化依赖管理
 * - 所有方法返回具体类型，确保类型安全
 * - 统一通过ExecutionContext获取依赖
 */

import { ExecutionContext } from '../../core/execution/context/execution-context.js';
import type { WorkflowRegistry } from '../../core/services/workflow-registry.js';
import type { ThreadRegistry } from '../../core/services/thread-registry.js';
import type { EventManager } from '../../core/services/event-manager.js';
import type { CheckpointStateManager } from '../../core/execution/managers/checkpoint-state-manager.js';
import type { ToolService } from '../../core/services/tool-service.js';
import type { LLMExecutor } from '../../core/execution/executors/llm-executor.js';
import type { CodeService } from '../../core/services/code-service.js';
import type { NodeTemplateRegistry } from '../../core/services/node-template-registry.js';
import type { TriggerTemplateRegistry } from '../../core/services/trigger-template-registry.js';
import type { GraphRegistry } from '../../core/services/graph-registry.js';
import { getContainer } from '../../core/di/container-config.js';
import * as Identifiers from '../../core/di/service-identifiers.js';

/**
 * API依赖管理类
 * 通过DI容器管理所有依赖实例
 */
export class APIDependencyManager {
  private executionContext: ExecutionContext;
  
  /**
   * 构造函数
   * 创建默认的ExecutionContext
   */
  constructor() {
    this.executionContext = ExecutionContext.createDefault();
  }
  
  /**
   * 获取工作流注册表
   */
  getWorkflowRegistry(): WorkflowRegistry {
    return this.executionContext.getWorkflowRegistry();
  }
  
  /**
   * 获取线程注册表
   */
  getThreadRegistry(): ThreadRegistry {
    return this.executionContext.getThreadRegistry();
  }
  
  /**
   * 获取事件管理器
   */
  getEventManager(): EventManager {
    return this.executionContext.getEventManager();
  }
  
  /**
   * 获取检查点状态管理器
   */
  getCheckpointStateManager(): CheckpointStateManager {
    return this.executionContext.getCheckpointStateManager();
  }
  
  /**
   * 获取工具服务
   */
  getToolService(): ToolService {
    return this.executionContext.getToolService();
  }
  
  /**
   * 获取LLM执行器
   */
  getLlmExecutor(): LLMExecutor {
    return this.executionContext.getLlmExecutor();
  }
  
  /**
   * 获取代码服务
   */
  getCodeService(): CodeService {
    const container = getContainer();
    return container.get(Identifiers.CodeService);
  }
  
  /**
   * 获取节点模板注册表
   */
  getNodeTemplateRegistry(): NodeTemplateRegistry {
    const container = getContainer();
    return container.get(Identifiers.NodeTemplateRegistry);
  }
  
  /**
   * 获取触发器模板注册表
   */
  getTriggerTemplateRegistry(): TriggerTemplateRegistry {
    const container = getContainer();
    return container.get(Identifiers.TriggerTemplateRegistry);
  }
  
  /**
   * 获取图注册表
   */
  getGraphRegistry(): GraphRegistry {
    const container = getContainer();
    return container.get(Identifiers.GraphRegistry);
  }
  
  /**
   * 获取底层ExecutionContext实例（用于高级用例）
   */
  getExecutionContext(): ExecutionContext {
    return this.executionContext;
  }
  
  /**
   * 获取线程生命周期协调器
   */
  async getThreadLifecycleCoordinator(): Promise<import('../../core/execution/coordinators/thread-lifecycle-coordinator.js').ThreadLifecycleCoordinator> {
    const { ThreadLifecycleCoordinator } = await import('../../core/execution/coordinators/thread-lifecycle-coordinator.js');
    return new ThreadLifecycleCoordinator(this.executionContext);
  }
  
  /**
   * 获取 LLM 包装器
   */
  async getLLMWrapper(): Promise<import('../../core/llm/wrapper.js').LLMWrapper> {
    const { LLMWrapper } = await import('../../core/llm/wrapper.js');
    const eventManager = this.getEventManager();
    return new LLMWrapper(eventManager);
  }
}