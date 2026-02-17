/**
 * ExecutionContext - 执行上下文
 * 轻量级依赖注入容器，管理执行组件的生命周期
 *
 * 核心职责：
 * 1. 管理执行组件的创建和访问
 * 2. 确保组件的正确初始化顺序
 * 3. 提供测试时的隔离功能
 * 4. 支持多实例执行环境
 *
 * 管理的组件：
 * - WorkflowRegistry: 工作流注册器（全局单例）
 * - ThreadRegistry: 线程注册表（全局单例）
 * - EventManager: 事件管理器（全局单例）
 * - CheckpointStateManager: 检查点状态管理器（有状态服务）
 * - ThreadLifecycleManager: 生命周期管理器（原子操作）
 * - ThreadCascadeManager: 级联管理器（管理父子线程关系）
 * - ThreadLifecycleCoordinator: 生命周期协调器（有状态，流程编排）
 *
 * Coordinator 管理策略：
 * - 有状态 Coordinator（如 ThreadLifecycleCoordinator）：由 ExecutionContext 管理实例
 * - 无状态 Coordinator（如 CheckpointCoordinator）：使用静态方法，不注册到 ComponentRegistry
 *
 * 职责：
 * - 管理执行组件的创建和访问
 * - 确保组件的正确初始化顺序
 * - 提供清晰的依赖注入
 *
 * 设计原则：
 * - 支持多实例创建
 * - 提供工厂方法
 * - 清晰的依赖注入
 */

import type { WorkflowRegistry } from '../../services/workflow-registry.js';
import type { ThreadRegistry } from '../../services/thread-registry.js';
import type { EventManager } from '../../services/event-manager.js';
import type { ToolService } from '../../services/tool-service.js';
import type { CodeService } from '../../services/code-service.js';
import type { LLMExecutor } from '../executors/llm-executor.js';
import type { ErrorService } from '../../services/error-service.js';
import type { TaskRegistry } from '../../services/task-registry.js';
import type { GlobalMessageStorage } from '../../services/global-message-storage.js';
import type { GraphRegistry } from '../../services/graph-registry.js';
import type { NodeTemplateRegistry } from '../../services/node-template-registry.js';
import type { TriggerTemplateRegistry } from '../../services/trigger-template-registry.js';
import { CheckpointStateManager } from '../managers/checkpoint-state-manager.js';
import { ThreadLifecycleManager } from '../managers/thread-lifecycle-manager.js';
import { ThreadCascadeManager } from '../managers/thread-cascade-manager.js';
import { ToolContextManager } from '../managers/tool-context-manager.js';
import { ThreadLifecycleCoordinator } from '../coordinators/thread-lifecycle-coordinator.js';
import type { LifecycleCapable } from '../managers/lifecycle-capable.js';
import { getContainer } from '../../di/container-config.js';
import * as ServiceIdentifiers from '../../di/service-identifiers.js';

/**
 * 执行上下文 - 轻量级依赖注入容器
 */
export class ExecutionContext {
  private workflowRegistry: WorkflowRegistry;
  private threadRegistry: ThreadRegistry;
  private eventManager: EventManager;
  private toolService: ToolService;
  private codeService: CodeService;
  private llmExecutor: LLMExecutor;
  private errorService: ErrorService;
  private taskRegistry: TaskRegistry;
  private globalMessageStorage: GlobalMessageStorage;
  private graphRegistry: GraphRegistry;
  private nodeTemplateRegistry: NodeTemplateRegistry;
  private triggerTemplateRegistry: TriggerTemplateRegistry;
  private checkpointStateManager: CheckpointStateManager;
  private threadLifecycleManager: ThreadLifecycleManager;
  private threadCascadeManager: ThreadCascadeManager;
  private toolContextManager: ToolContextManager;
  private threadLifecycleCoordinator: ThreadLifecycleCoordinator;
  private initialized = false;
  private currentThreadId: string | null = null;

  constructor(
    workflowRegistry: WorkflowRegistry,
    threadRegistry: ThreadRegistry,
    eventManager: EventManager,
    toolService: ToolService,
    codeService: CodeService,
    llmExecutor: LLMExecutor,
    errorService: ErrorService,
    taskRegistry: TaskRegistry,
    globalMessageStorage: GlobalMessageStorage,
    graphRegistry: GraphRegistry,
    nodeTemplateRegistry: NodeTemplateRegistry,
    triggerTemplateRegistry: TriggerTemplateRegistry,
    checkpointStateManager: CheckpointStateManager,
    threadLifecycleManager: ThreadLifecycleManager,
    threadCascadeManager: ThreadCascadeManager,
    toolContextManager: ToolContextManager,
    threadLifecycleCoordinator: ThreadLifecycleCoordinator
  ) {
    // 所有依赖通过构造函数注入，由 DI 容器管理
    this.workflowRegistry = workflowRegistry;
    this.threadRegistry = threadRegistry;
    this.eventManager = eventManager;
    this.toolService = toolService;
    this.codeService = codeService;
    this.llmExecutor = llmExecutor;
    this.errorService = errorService;
    this.taskRegistry = taskRegistry;
    this.globalMessageStorage = globalMessageStorage;
    this.graphRegistry = graphRegistry;
    this.nodeTemplateRegistry = nodeTemplateRegistry;
    this.triggerTemplateRegistry = triggerTemplateRegistry;
    this.checkpointStateManager = checkpointStateManager;
    this.threadLifecycleManager = threadLifecycleManager;
    this.threadCascadeManager = threadCascadeManager;
    this.toolContextManager = toolContextManager;
    this.threadLifecycleCoordinator = threadLifecycleCoordinator;
  }

  /**
   * 初始化上下文
   * 按依赖顺序创建所有组件
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }
    
    // 所有服务已在构造函数中初始化
    this.initialized = true;
  }

  /**
   * 注册组件
   * @param key 组件键名
   * @param instance 组件实例
   */
  register<T>(key: string, instance: T): void {
    // 不再需要注册功能，所有服务通过 DI 容器管理
    // 保留此方法以保持向后兼容
  }

  /**
   * 获取 WorkflowRegistry
   * @returns WorkflowRegistry 实例
   */
  getWorkflowRegistry(): WorkflowRegistry {
    this.ensureInitialized();
    return this.workflowRegistry;
  }

  /**
   * 获取 ThreadRegistry
   * @returns ThreadRegistry 实例
   */
  getThreadRegistry(): ThreadRegistry {
    this.ensureInitialized();
    return this.threadRegistry;
  }

  /**
   * 获取 EventManager
   * @returns EventManager 实例
   */
  getEventManager(): EventManager {
    this.ensureInitialized();
    return this.eventManager;
  }

  /**
   * 获取 CheckpointStateManager
   * @returns CheckpointStateManager 实例
   */
  getCheckpointStateManager(): CheckpointStateManager {
    this.ensureInitialized();
    return this.checkpointStateManager;
  }

  /**
   * 获取 ThreadLifecycleManager
   * @returns ThreadLifecycleManager 实例
   * @deprecated 应该使用 getLifecycleCoordinator() 进行外部调用，Manager仅供内部使用
   */
  getThreadLifecycleManager(): ThreadLifecycleManager {
    this.ensureInitialized();
    return this.threadLifecycleManager;
  }

  /**
   * 获取 ToolService
   * @returns ToolService 实例
   */
  getToolService(): ToolService {
    this.ensureInitialized();
    return this.toolService;
  }

  /**
   * 获取 LLMExecutor
   * @returns LLMExecutor 实例
   */
  getLlmExecutor(): LLMExecutor {
    this.ensureInitialized();
    return this.llmExecutor;
  }

  /**
   * 获取 ErrorService
   * @returns ErrorService 实例
   */
  getErrorService(): ErrorService {
    this.ensureInitialized();
    return this.errorService;
  }

  /**
   * 获取 ToolContextManager
   * @returns ToolContextManager 实例
   */
  getToolContextManager(): ToolContextManager {
    this.ensureInitialized();
    return this.toolContextManager;
  }

  /**
   * 获取 ThreadLifecycleCoordinator
   * @returns ThreadLifecycleCoordinator 实例
   */
  getLifecycleCoordinator(): ThreadLifecycleCoordinator {
    this.ensureInitialized();
    return this.threadLifecycleCoordinator;
  }

  /**
   * 获取 ThreadCascadeManager
   * @returns ThreadCascadeManager 实例
   */
  getCascadeManager(): ThreadCascadeManager {
    this.ensureInitialized();
    return this.threadCascadeManager;
  }

  /**
   * 获取 GlobalMessageStorage
   * @returns GlobalMessageStorage 实例
   */
  getGlobalMessageStorage(): GlobalMessageStorage {
    this.ensureInitialized();
    return this.globalMessageStorage;
  }

  /**
   * 获取 TaskRegistry
   * @returns TaskRegistry 实例
   */
  getTaskRegistry(): TaskRegistry {
    this.ensureInitialized();
    return this.taskRegistry;
  }

  /**
   * 获取 GraphRegistry
   * @returns GraphRegistry 实例
   */
  getGraphRegistry(): GraphRegistry {
    this.ensureInitialized();
    return this.graphRegistry;
  }

  /**
   * 获取 CodeService
   * @returns CodeService 实例
   */
  getCodeService(): CodeService {
    this.ensureInitialized();
    return this.codeService;
  }

  /**
   * 获取 NodeTemplateRegistry
   * @returns NodeTemplateRegistry 实例
   */
  getNodeTemplateRegistry(): NodeTemplateRegistry {
    this.ensureInitialized();
    return this.nodeTemplateRegistry;
  }

  /**
   * 获取 TriggerTemplateRegistry
   * @returns TriggerTemplateRegistry 实例
   */
  getTriggerTemplateRegistry(): TriggerTemplateRegistry {
    this.ensureInitialized();
    return this.triggerTemplateRegistry;
  }

  /**
   * 设置 HumanRelayHandler
   * @param handler HumanRelayHandler 实例
   */
  setHumanRelayHandler(handler: any): void {
    this.register('humanRelayHandler', handler);
  }

  /**
   * 获取 HumanRelayHandler
   * @returns HumanRelayHandler 实例，如果未设置则返回 undefined
   */
  getHumanRelayHandler(): any {
    this.ensureInitialized();
    // 不再支持动态注册，返回 undefined
    return undefined;
  }

  /**
   * 设置 UserInteractionHandler
   * @param handler UserInteractionHandler 实例
   */
  setUserInteractionHandler(handler: any): void {
    this.register('userInteractionHandler', handler);
  }

  /**
   * 获取 UserInteractionHandler
   * @returns UserInteractionHandler 实例，如果未设置则返回 undefined
   */
  getUserInteractionHandler(): any {
    this.ensureInitialized();
    // 不再支持动态注册，返回 undefined
    return undefined;
  }

  /**
   * 通用获取方法
   * @param key 组件键名
   * @returns 组件实例
   */
  get<T>(key: string): T {
    this.ensureInitialized();
    // 不再支持通用获取，所有服务通过 DI 容器管理
    throw new Error('Generic get() is no longer supported. Use specific getter methods instead.');
  }

  /**
   * 检查是否已初始化
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 销毁上下文
   * 清理所有由ExecutionContext创建的组件，主要用于测试环境
   *
   * 此方法会：
   * 1. 按照依赖关系的逆序清理组件
   * 2. 只清理由ExecutionContext创建的组件，不清理全局单例
   * 3. 清空组件注册表
   * 4. 重置初始化状态
   *
   * 注意：全局单例（eventManager、workflowRegistry、threadRegistry）不会被清理
   */
  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // 清理检查点状态管理器
    await this.checkpointStateManager.cleanup();

    // 清理工具上下文管理器
    this.toolContextManager.clearAll();

    // 重置初始化状态
    this.initialized = false;
    this.currentThreadId = null;
  }

  /**
   * 检查组件是否实现了LifecycleCapable接口
   *
   * @param component 组件实例
   * @returns 是否实现了LifecycleCapable接口
   */

  /**
   * 获取所有实现了LifecycleCapable接口的组件
   *
   * @returns 生命周期管理器数组
   */
  getLifecycleManagers(): Array<{ name: string; manager: LifecycleCapable }> {
    // 返回所有实现了 LifecycleCapable 接口的组件
    return [
      { name: 'checkpointStateManager', manager: this.checkpointStateManager },
      { name: 'threadLifecycleManager', manager: this.threadLifecycleManager },
      { name: 'threadCascadeManager', manager: this.threadCascadeManager },
      { name: 'threadLifecycleCoordinator', manager: this.threadLifecycleCoordinator }
    ];
  }

  /**
   * 确保上下文已初始化
   * 如果未初始化，自动调用 initialize()
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  /**
    * 设置当前线程ID
    * @param threadId 线程ID
    */
  setCurrentThreadId(threadId: string): void {
    this.currentThreadId = threadId;
  }

  /**
    * 获取当前线程ID
    * @returns 当前线程ID，如果未设置则返回null
    */
  getCurrentThreadId(): string | null {
    return this.currentThreadId;
  }

  /**
   * 创建默认执行上下文
   * 从 DI 容器获取实例
   * @returns ExecutionContext 实例
   */
  static createDefault(): ExecutionContext {
    const container = getContainer();
    const context = container.get(ServiceIdentifiers.ExecutionContext);
    return context;
  }

  /**
   * 创建测试专用执行上下文
   * 重置 DI 容器以确保干净状态
   * @param customSingletons 自定义单例服务映射（暂不支持）
   * @returns ExecutionContext 实例
   */
  static createForTesting(customSingletons?: Map<string, any>): ExecutionContext {
    // 重置 DI 容器以确保干净状态
    const { resetContainer, initializeContainer } = require('../../di/container-config.js');
    resetContainer();
    initializeContainer();

    // 从重新初始化的容器获取实例
    const container = getContainer();
    const context = container.get(ServiceIdentifiers.ExecutionContext);
    return context;
  }

  /**
   * 重置测试环境
   * 清理 DI 容器
   */
  static resetTestingEnvironment(): void {
    const { resetContainer } = require('../../di/container-config.js');
    resetContainer();
  }
}