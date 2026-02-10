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
 * - WorkflowRegistry: 工作流注册器
 * - ThreadRegistry: 线程注册表
 * - EventManager: 事件管理器
 * - CheckpointStateManager: 检查点状态管理器（有状态服务）
 * - ThreadLifecycleManager: 生命周期管理器（原子操作）
 * - ThreadLifecycleCoordinator: 生命周期协调器（流程编排）
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

import { SingletonRegistry } from './singleton-registry';
import { ComponentRegistry } from './component-registry';
import { LifecycleManager } from './lifecycle-manager';
import type { WorkflowRegistry } from '../../services/workflow-registry';
import type { ThreadRegistry } from '../../services/thread-registry';
import type { EventManager } from '../../services/event-manager';
import { CheckpointStateManager } from '../managers/checkpoint-state-manager';
import { CheckpointCoordinator } from '../coordinators/checkpoint-coordinator';
import { ThreadLifecycleManager } from '../managers/thread-lifecycle-manager';
import { ThreadLifecycleCoordinator } from '../coordinators/thread-lifecycle-coordinator';
import type { LifecycleCapable } from '../managers/lifecycle-capable';
import { MemoryCheckpointStorage } from '../../storage/memory-checkpoint-storage';
import { globalMessageStorage } from '../../services/global-message-storage';

/**
 * 执行上下文 - 轻量级依赖注入容器
 */
export class ExecutionContext {
  private componentRegistry: ComponentRegistry;
  private lifecycleManager: LifecycleManager;
  private initialized = false;
  private currentThreadId: string | null = null;

  constructor() {
    this.componentRegistry = new ComponentRegistry();
    this.lifecycleManager = new LifecycleManager();
  }

  /**
   * 初始化上下文
   * 按依赖顺序创建所有组件
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // 确保SingletonRegistry已初始化
    SingletonRegistry.initialize();

    // 按依赖顺序初始化
    // 1. 从SingletonRegistry获取全局单例服务
    const eventManager = SingletonRegistry.get<EventManager>('eventManager');
    const workflowRegistry = SingletonRegistry.get<WorkflowRegistry>('workflowRegistry');
    const threadRegistry = SingletonRegistry.get<ThreadRegistry>('threadRegistry');
    const toolService = SingletonRegistry.get<any>('toolService');
    const llmExecutor = SingletonRegistry.get<any>('llmExecutor');
    const graphRegistry = SingletonRegistry.get<any>('graphRegistry');

    // 设置 ThreadRegistry 和 WorkflowRegistry 之间的依赖关系
    threadRegistry.setWorkflowRegistry(workflowRegistry);

    // 注册全局单例服务到ComponentRegistry
    this.componentRegistry.register('eventManager', eventManager);
    this.componentRegistry.register('workflowRegistry', workflowRegistry);
    this.componentRegistry.register('threadRegistry', threadRegistry);
    this.componentRegistry.register('toolService', toolService);
    this.componentRegistry.register('llmExecutor', llmExecutor);
    this.componentRegistry.register('graphRegistry', graphRegistry);

    // 2. CheckpointStateManager 依赖 CheckpointStorage
    const checkpointStorage = new MemoryCheckpointStorage();
    const checkpointStateManager = new CheckpointStateManager(checkpointStorage);
    this.componentRegistry.register('checkpointStateManager', checkpointStateManager);

    // 3. CheckpointCoordinator 是完全无状态的静态类，不需要实例化
    // 使用 CheckpointCoordinator.createCheckpoint() 和 CheckpointCoordinator.restoreFromCheckpoint() 静态方法

    // 4. ThreadLifecycleManager 依赖 EventManager
    const lifecycleManager = new ThreadLifecycleManager(eventManager);
    this.componentRegistry.register('lifecycleManager', lifecycleManager);

    // 5. ThreadLifecycleCoordinator 依赖 ExecutionContext
    const lifecycleCoordinator = new ThreadLifecycleCoordinator(this);
    this.componentRegistry.register('lifecycleCoordinator', lifecycleCoordinator);

    this.componentRegistry.markAsInitialized();
    this.initialized = true;
  }

  /**
   * 注册组件
   * @param key 组件键名
   * @param instance 组件实例
   */
  register<T>(key: string, instance: T): void {
    this.componentRegistry.register(key, instance);
  }

  /**
   * 获取 WorkflowRegistry
   * @returns WorkflowRegistry 实例
   */
  getWorkflowRegistry(): WorkflowRegistry {
    this.ensureInitialized();
    return this.componentRegistry.get('workflowRegistry');
  }

  /**
   * 获取 ThreadRegistry
   * @returns ThreadRegistry 实例
   */
  getThreadRegistry(): ThreadRegistry {
    this.ensureInitialized();
    return this.componentRegistry.get('threadRegistry');
  }

  /**
   * 获取 EventManager
   * @returns EventManager 实例
   */
  getEventManager(): EventManager {
    this.ensureInitialized();
    return this.componentRegistry.get('eventManager');
  }

  /**
   * 获取 CheckpointStateManager
   * @returns CheckpointStateManager 实例
   */
  getCheckpointStateManager(): CheckpointStateManager {
    this.ensureInitialized();
    return this.componentRegistry.get('checkpointStateManager');
  }

  /**
   * 获取 ThreadLifecycleManager
   * @returns ThreadLifecycleManager 实例
   * @deprecated 应该使用 getLifecycleCoordinator() 进行外部调用，Manager仅供内部使用
   */
  getThreadLifecycleManager(): ThreadLifecycleManager {
    this.ensureInitialized();
    return this.componentRegistry.get('lifecycleManager');
  }

  /**
   * 获取 ToolService
   * @returns ToolService 实例
   */
  getToolService(): any {
    this.ensureInitialized();
    return this.componentRegistry.getAny('toolService');
  }

  /**
   * 获取 LLMExecutor
   * @returns LLMExecutor 实例
   */
  getLlmExecutor(): any {
    this.ensureInitialized();
    return this.componentRegistry.getAny('llmExecutor');
  }

  /**
   * 获取 ThreadLifecycleCoordinator
   * @returns ThreadLifecycleCoordinator 实例
   */
  getLifecycleCoordinator(): ThreadLifecycleCoordinator {
    this.ensureInitialized();
    return this.componentRegistry.get('lifecycleCoordinator');
  }

  /**
   * 获取 GraphRegistry
   * @returns GraphRegistry 实例
   */
  getGraphRegistry(): any {
    this.ensureInitialized();
    return this.componentRegistry.getAny('graphRegistry');
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
    return this.componentRegistry.has('humanRelayHandler')
      ? this.componentRegistry.getAny('humanRelayHandler')
      : undefined;
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
    return this.componentRegistry.has('userInteractionHandler')
      ? this.componentRegistry.getAny('userInteractionHandler')
      : undefined;
  }

  /**
   * 通用获取方法
   * @param key 组件键名
   * @returns 组件实例
   */
  get<T>(key: string): T {
    this.ensureInitialized();
    return this.componentRegistry.getAny(key);
  }

  /**
   * 检查是否已初始化
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized && this.componentRegistry.isInitialized();
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

    // 定义需要清理的组件及其清理顺序（按依赖关系的逆序）
    // 注意：不包含全局单例（eventManager、workflowRegistry、threadRegistry、toolService、llmExecutor）
    // 注意：不包含checkpointCoordinator，因为它是完全无状态的静态类
    const cleanupOrder: string[] = [
      'lifecycleCoordinator',     // 依赖其他所有组件
      'lifecycleManager',         // 依赖eventManager
      'checkpointStateManager'    // 依赖checkpointStorage
    ];

    // 获取组件映射用于清理
    const componentsForCleanup = this.componentRegistry.getAllComponents();

    // 按顺序清理组件
    await this.lifecycleManager.cleanupComponents(componentsForCleanup, cleanupOrder);

    // 清空组件注册表（包括全局单例的引用）
    this.componentRegistry.clear();

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
    // 只返回由ExecutionContext创建的组件，不包括全局单例
    // 注意：不包含checkpointCoordinator，因为它是完全无状态的静态类
    const managedComponents = ['checkpointStateManager', 'lifecycleManager', 'lifecycleCoordinator'];

    const componentsMap = this.componentRegistry.getAllComponents();

    return this.lifecycleManager.getLifecycleCapableComponents(componentsMap, managedComponents);
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
   * @returns ExecutionContext 实例
   */
  static createDefault(): ExecutionContext {
    const context = new ExecutionContext();
    context.initialize();
    return context;
  }

  /**
   * 创建测试专用执行上下文
   * 允许替换全局单例服务以进行测试隔离
   * @param customSingletons 自定义单例服务映射
   * @returns ExecutionContext 实例
   */
  static createForTesting(customSingletons?: Map<string, any>): ExecutionContext {
    // 重置 SingletonRegistry 以确保干净状态
    SingletonRegistry.reset();

    // 如果提供了自定义单例，临时注册到SingletonRegistry
    if (customSingletons && customSingletons.size > 0) {
      for (const [key, instance] of customSingletons.entries()) {
        SingletonRegistry.register(key, instance);
      }
    }

    const context = new ExecutionContext();
    context.initialize();
    return context;
  }

  /**
   * 重置测试环境
   * 清理SingletonRegistry中的自定义单例
   */
  static resetTestingEnvironment(): void {
    SingletonRegistry.reset();
  }
}