/**
 * ComponentRegistry - 组件注册表
 * 负责组件的注册和获取，提供类型安全的访问接口
 */

import type { WorkflowRegistry } from '../../services/workflow-registry';
import type { ThreadRegistry } from '../../services/thread-registry';
import type { EventManager } from '../../services/event-manager';
import { CheckpointStateManager } from '../managers/checkpoint-state-manager';
import { ThreadLifecycleManager } from '../managers/thread-lifecycle-manager';
import { ThreadLifecycleCoordinator } from '../coordinators/thread-lifecycle-coordinator';

/**
 * 组件映射类型，确保类型安全
 */
export interface ComponentMap {
  workflowRegistry: WorkflowRegistry;
  threadRegistry: ThreadRegistry;
  eventManager: EventManager;
  checkpointStateManager: CheckpointStateManager;
  lifecycleManager: ThreadLifecycleManager;
  lifecycleCoordinator: ThreadLifecycleCoordinator;
  toolService: any;
  llmExecutor: any;
  humanRelayHandler: any;
  userInteractionHandler: any;
}

/**
 * 组件注册表
 */
export class ComponentRegistry {
  private components: Map<string, any> = new Map();
  private initialized = false;

  /**
   * 注册组件
   * @param key 组件键名
   * @param instance 组件实例
   */
  register<T>(key: string, instance: T): void {
    this.components.set(key, instance);
  }

  /**
   * 获取组件（类型安全）
   * @param key 组件键名
   * @returns 组件实例
   */
  get<T extends keyof ComponentMap>(key: T): ComponentMap[T] {
    this.ensureInitialized();
    const component = this.components.get(key);
    if (!component) {
      throw new Error(`Component not found: ${key}`);
    }
    return component as ComponentMap[T];
  }

  /**
   * 获取任意组件（用于非标准组件）
   * @param key 组件键名
   * @returns 组件实例
   */
  getAny<T>(key: string): T {
    this.ensureInitialized();
    const component = this.components.get(key);
    if (!component) {
      throw new Error(`Component not found: ${key}`);
    }
    return component as T;
  }

  /**
   * 检查组件是否存在
   * @param key 组件键名
   * @returns 是否存在
   */
  has(key: string): boolean {
    return this.components.has(key);
  }

  /**
   * 清空所有组件
   */
  clear(): void {
    this.components.clear();
    this.initialized = false;
  }

  /**
   * 获取所有组件的副本（用于清理等操作）
   * @returns 组件映射的副本
   */
  getAllComponents(): Map<string, any> {
    const copy = new Map<string, any>();
    for (const [key, value] of this.components) {
      copy.set(key, value);
    }
    return copy;
  }

  /**
   * 标记为已初始化
   */
  markAsInitialized(): void {
    this.initialized = true;
  }

  /**
   * 检查是否已初始化
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('ComponentRegistry is not initialized');
    }
  }
}