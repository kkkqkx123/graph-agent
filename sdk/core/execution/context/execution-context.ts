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
 * - CheckpointManager: 检查点管理器
 * - ThreadLifecycleManager: 生命周期管理器（原子操作）
 * - ThreadLifecycleCoordinator: 生命周期协调器（流程编排）
 *
 * 职责：
 * - 管理执行组件的创建和访问
 * - 确保组件的正确初始化顺序
 *
 * 设计原则：
 * - 支持多实例创建
 * - 提供工厂方法
 * - 清晰的依赖注入
 */

import { SingletonRegistry } from './singleton-registry';
import type { WorkflowRegistry } from '../../services/workflow-registry';
import type { ThreadRegistry } from '../../services/thread-registry';
import type { EventManager } from '../../services/event-manager';
import { CheckpointManager } from '../managers/checkpoint-manager';
import { ThreadLifecycleManager } from '../managers/thread-lifecycle-manager';
import { ThreadLifecycleCoordinator } from '../coordinators/thread-lifecycle-coordinator';
import type { LifecycleCapable } from '../managers/lifecycle-capable';

/**
 * 执行上下文 - 轻量级依赖注入容器
 */
export class ExecutionContext {
  private components: Map<string, any> = new Map();
  private initialized = false;
  private currentThreadId: string | null = null;

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

    // 注册全局单例服务到ExecutionContext
    this.register('eventManager', eventManager);
    this.register('workflowRegistry', workflowRegistry);
    this.register('threadRegistry', threadRegistry);
    this.register('toolService', toolService);
    this.register('llmExecutor', llmExecutor);
    this.register('graphRegistry', graphRegistry);

    // 2. CheckpointManager 依赖 ThreadRegistry 和 WorkflowRegistry
    const checkpointManager = new CheckpointManager(
      undefined, // storage，默认使用 MemoryStorage
      threadRegistry,
      workflowRegistry
    );
    this.register('checkpointManager', checkpointManager);

    // 3. ThreadLifecycleManager 依赖 EventManager
    const lifecycleManager = new ThreadLifecycleManager(eventManager);
    this.register('lifecycleManager', lifecycleManager);

    // 4. ThreadLifecycleCoordinator 依赖 ExecutionContext
    const lifecycleCoordinator = new ThreadLifecycleCoordinator(this);
    this.register('lifecycleCoordinator', lifecycleCoordinator);

    this.initialized = true;
  }

  /**
   * 注册组件
   * @param key 组件键名
   * @param instance 组件实例
   */
  register<T>(key: string, instance: T): void {
    this.components.set(key, instance);
  }

  /**
   * 获取 WorkflowRegistry
   * @returns WorkflowRegistry 实例
   */
  getWorkflowRegistry(): WorkflowRegistry {
    this.ensureInitialized();
    return this.components.get('workflowRegistry') as WorkflowRegistry;
  }

  /**
   * 获取 ThreadRegistry
   * @returns ThreadRegistry 实例
   */
  getThreadRegistry(): ThreadRegistry {
    this.ensureInitialized();
    return this.components.get('threadRegistry') as ThreadRegistry;
  }

  /**
   * 获取 EventManager
   * @returns EventManager 实例
   */
  getEventManager(): EventManager {
    this.ensureInitialized();
    return this.components.get('eventManager') as EventManager;
  }

  /**
   * 获取 CheckpointManager
   * @returns CheckpointManager 实例
   */
  getCheckpointManager(): CheckpointManager {
    this.ensureInitialized();
    return this.components.get('checkpointManager') as CheckpointManager;
  }

  /**
   * 获取 ThreadLifecycleManager
   * @returns ThreadLifecycleManager 实例
   * @deprecated 应该使用 getLifecycleCoordinator() 进行外部调用，Manager仅供内部使用
   */
  getThreadLifecycleManager(): ThreadLifecycleManager {
    this.ensureInitialized();
    return this.components.get('lifecycleManager') as ThreadLifecycleManager;
  }

  /**
   * 获取 ToolService
   * @returns ToolService 实例
   */
  getToolService(): any {
    this.ensureInitialized();
    return this.components.get('toolService');
  }

  /**
   * 获取 LLMExecutor
   * @returns LLMExecutor 实例
   */
  getLlmExecutor(): any {
    this.ensureInitialized();
    return this.components.get('llmExecutor');
  }

  /**
   * 获取 ThreadLifecycleCoordinator
   * @returns ThreadLifecycleCoordinator 实例
   */
  getLifecycleCoordinator(): ThreadLifecycleCoordinator {
    this.ensureInitialized();
    return this.components.get('lifecycleCoordinator') as ThreadLifecycleCoordinator;
  }

  /**
   * 获取 GraphRegistry
   * @returns GraphRegistry 实例
   */
  getGraphRegistry(): any {
    this.ensureInitialized();
    return this.components.get('graphRegistry');
  }

  /**
   * 通用获取方法
   * @param key 组件键名
   * @returns 组件实例
   */
  get<T>(key: string): T {
    this.ensureInitialized();
    return this.components.get(key) as T;
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

    // 定义需要清理的组件及其清理顺序（按依赖关系的逆序）
    // 注意：不包含全局单例（eventManager、workflowRegistry、threadRegistry、toolService、llmExecutor）
    const cleanupOrder: string[] = [
      'lifecycleCoordinator',  // 依赖其他所有组件
      'lifecycleManager',      // 依赖eventManager
      'checkpointManager'      // 依赖threadRegistry和workflowRegistry
    ];

    // 按顺序清理组件
    for (const key of cleanupOrder) {
      const component = this.components.get(key);
      if (!component) {
        continue;
      }

      // 检查组件是否实现了LifecycleCapable接口
      if (this.isLifecycleManager(component)) {
        try {
          const cleanupResult = component.cleanup();
          // 支持同步和异步的cleanup方法
          if (cleanupResult instanceof Promise) {
            await cleanupResult;
          }
        } catch (error) {
          console.error(`Error cleaning up component ${key}:`, error);
          // 继续清理其他组件，不中断整个销毁流程
        }
      }
    }

    // 清空组件注册表（包括全局单例的引用）
    this.components.clear();

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
  private isLifecycleManager(component: any): component is LifecycleCapable {
    return (
      component &&
      typeof component.cleanup === 'function' &&
      typeof component.createSnapshot === 'function' &&
      typeof component.restoreFromSnapshot === 'function'
    );
  }

  /**
   * 获取所有实现了LifecycleCapable接口的组件
   *
   * @returns 生命周期管理器数组
   */
  getLifecycleManagers(): Array<{ name: string; manager: LifecycleCapable }> {
    const managers: Array<{ name: string; manager: LifecycleCapable }> = [];
    
    // 只返回由ExecutionContext创建的组件，不包括全局单例
    const managedComponents = ['checkpointManager', 'lifecycleManager', 'lifecycleCoordinator'];
    
    for (const key of managedComponents) {
      const component = this.components.get(key);
      if (component && this.isLifecycleManager(component)) {
        managers.push({ name: key, manager: component });
      }
    }
    
    return managers;
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