/**
 * ExecutionSingletons - 执行模块单例管理器
 * 负责管理全局共享的执行组件实例
 * 
 * 核心职责：
 * 1. 管理全局单例组件的创建和访问
 * 2. 确保单例的正确初始化顺序
 * 3. 提供测试时的重置功能
 * 
 * 单例组件：
 * - WorkflowRegistry: 工作流注册器，全局共享工作流定义
 * - ThreadRegistry: 线程注册表，全局跟踪所有线程
 * - EventManager: 事件管理器，全局事件总线
 * - CheckpointManager: 检查点管理器，默认单例
 */

import { WorkflowRegistry } from './workflow-registry';
import { ThreadRegistry } from './thread-registry';
import { EventManager } from './event-manager';
import { CheckpointManager } from './checkpoint/checkpoint-manager';
import { MemoryStorage } from './checkpoint/storage';

/**
 * 执行模块单例管理器
 */
export class ExecutionSingletons {
  private static workflowRegistry: WorkflowRegistry | null = null;
  private static threadRegistry: ThreadRegistry | null = null;
  private static eventManager: EventManager | null = null;
  private static checkpointManager: CheckpointManager | null = null;
  private static initialized = false;

  /**
   * 初始化所有单例组件
   * 建议在应用启动时调用，确保正确的初始化顺序
   */
  static initialize(): void {
    if (this.initialized) {
      return;
    }

    // 按依赖顺序初始化
    // 1. EventManager 无依赖，最先初始化
    this.eventManager = new EventManager();

    // 2. WorkflowRegistry 无依赖
    this.workflowRegistry = new WorkflowRegistry();

    // 3. ThreadRegistry 无依赖
    this.threadRegistry = new ThreadRegistry();

    // 4. CheckpointManager 依赖 ThreadRegistry 和 WorkflowRegistry
    this.checkpointManager = new CheckpointManager(
      undefined, // storage，默认使用 MemoryStorage
      this.threadRegistry,
      this.workflowRegistry
    );

    this.initialized = true;
  }

  /**
   * 获取 WorkflowRegistry 单例
   * 如果未初始化，会自动初始化所有单例
   */
  static getWorkflowRegistry(): WorkflowRegistry {
    this.ensureInitialized();
    return this.workflowRegistry!;
  }

  /**
   * 获取 ThreadRegistry 单例
   * 如果未初始化，会自动初始化所有单例
   */
  static getThreadRegistry(): ThreadRegistry {
    this.ensureInitialized();
    return this.threadRegistry!;
  }

  /**
   * 获取 EventManager 单例
   * 如果未初始化，会自动初始化所有单例
   */
  static getEventManager(): EventManager {
    this.ensureInitialized();
    return this.eventManager!;
  }

  /**
   * 获取 CheckpointManager 单例
   * 如果未初始化，会自动初始化所有单例
   */
  static getCheckpointManager(): CheckpointManager {
    this.ensureInitialized();
    return this.checkpointManager!;
  }

  /**
   * 检查是否已初始化
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 重置所有单例
   * 主要用于测试环境
   * 注意：生产环境不应调用此方法
   */
  static reset(): void {
    this.workflowRegistry = null;
    this.threadRegistry = null;
    this.eventManager = null;
    this.checkpointManager = null;
    this.initialized = false;
  }

  /**
   * 确保单例已初始化
   * 如果未初始化，自动调用 initialize()
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }
}