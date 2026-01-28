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
 * - ThreadLifecycleManager: 生命周期管理器
 */

import { WorkflowRegistry } from '../../registry/workflow-registry';
import { ThreadRegistry } from '../../registry/thread-registry';
import { EventManager } from '../managers/event-manager';
import { CheckpointManager } from '../managers/checkpoint-manager';
import { ThreadLifecycleManager } from '../thread-lifecycle-manager';

/**
 * 执行上下文 - 轻量级依赖注入容器
 */
export class ExecutionContext {
  private components: Map<string, any> = new Map();
  private initialized = false;

  /**
   * 初始化上下文
   * 按依赖顺序创建所有组件
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // 按依赖顺序初始化
    // 1. EventManager 无依赖，最先初始化
    const eventManager = new EventManager();
    this.register('eventManager', eventManager);

    // 2. WorkflowRegistry 无依赖，启用预处理功能
    const workflowRegistry = new WorkflowRegistry({
      enablePreprocessing: true,
      maxRecursionDepth: 10,
    });
    this.register('workflowRegistry', workflowRegistry);

    // 3. ThreadRegistry 无依赖
    const threadRegistry = new ThreadRegistry();
    this.register('threadRegistry', threadRegistry);

    // 4. CheckpointManager 依赖 ThreadRegistry 和 WorkflowRegistry
    const checkpointManager = new CheckpointManager(
      undefined, // storage，默认使用 MemoryStorage
      threadRegistry,
      workflowRegistry
    );
    this.register('checkpointManager', checkpointManager);

    // 5. ThreadLifecycleManager 依赖 EventManager
    const lifecycleManager = new ThreadLifecycleManager(eventManager);
    this.register('lifecycleManager', lifecycleManager);

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
   */
  getThreadLifecycleManager(): ThreadLifecycleManager {
    this.ensureInitialized();
    return this.components.get('lifecycleManager') as ThreadLifecycleManager;
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
   * 清理所有组件，主要用于测试环境
   */
  destroy(): void {
    this.components.clear();
    this.initialized = false;
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
}

/**
 * 模块级单例实例
 */
const defaultContext = new ExecutionContext();
defaultContext.initialize();

/**
 * 获取 WorkflowRegistry 单例
 * @returns WorkflowRegistry 实例
 */
export function getWorkflowRegistry(): WorkflowRegistry {
  return defaultContext.getWorkflowRegistry();
}

/**
 * 获取 ThreadRegistry 单例
 * @returns ThreadRegistry 实例
 */
export function getThreadRegistry(): ThreadRegistry {
  return defaultContext.getThreadRegistry();
}

/**
 * 获取 EventManager 单例
 * @returns EventManager 实例
 */
export function getEventManager(): EventManager {
  return defaultContext.getEventManager();
}

/**
 * 获取 CheckpointManager 单例
 * @returns CheckpointManager 实例
 */
export function getCheckpointManager(): CheckpointManager {
  return defaultContext.getCheckpointManager();
}

/**
 * 获取 ThreadLifecycleManager 单例
 * @returns ThreadLifecycleManager 实例
 */
export function getThreadLifecycleManager(): ThreadLifecycleManager {
  return defaultContext.getThreadLifecycleManager();
}

/**
 * 重置默认执行上下文
 * 主要用于测试环境
 */
export function resetDefaultContext(): void {
  defaultContext.destroy();
  defaultContext.initialize();
}