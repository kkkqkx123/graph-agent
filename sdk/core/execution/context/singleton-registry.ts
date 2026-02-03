/**
 * SingletonRegistry - 单例注册表
 * 统一管理所有全局单例服务，提供统一的访问接口
 *
 * 核心职责：
 * 1. 注册全局单例服务
 * 2. 提供统一的单例访问接口
 * 3. 支持测试环境下的单例替换
 * 4. 确保单例的全局唯一性
 *
 * 设计原则：
 * - 保持单例服务的全局特性
 * - 提供统一的访问路径
 * - 支持测试隔离
 * - 类型安全
 */

/**
 * 单例注册表
 */
export class SingletonRegistry {
  private static instances = new Map<string, any>();
  private static initialized = false;

  /**
   * 初始化注册表
   * 注册所有全局单例服务
   */
  static initialize(): void {
    if (this.initialized) {
      return;
    }

    // 延迟导入以避免循环依赖
    const { eventManager } = require('../../services/event-manager');
    const { workflowRegistry } = require('../../services/workflow-registry');
    const { threadRegistry } = require('../../services/thread-registry');
    const { toolService } = require('../../services/tool-service');
    const { LLMExecutor } = require('../llm-executor');
    const { graphRegistry } = require('../../services/graph-registry');

    // 注册全局单例服务
    this.register('eventManager', eventManager);
    this.register('workflowRegistry', workflowRegistry);
    this.register('threadRegistry', threadRegistry);
    this.register('toolService', toolService);
    this.register('llmExecutor', LLMExecutor.getInstance());
    this.register('graphRegistry', graphRegistry);

    this.initialized = true;
  }

  /**
   * 注册单例服务
   * @param key 服务键名
   * @param instance 服务实例
   */
  static register<T>(key: string, instance: T): void {
    this.instances.set(key, instance);
  }

  /**
   * 获取单例服务
   * @param key 服务键名
   * @returns 服务实例
   * @throws 如果服务未注册则抛出错误
   */
  static get<T>(key: string): T {
    if (!this.initialized) {
      this.initialize();
    }

    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error(`Singleton not registered: ${key}`);
    }
    return instance as T;
  }

  /**
   * 检查服务是否已注册
   * @param key 服务键名
   * @returns 是否已注册
   */
  static has(key: string): boolean {
    return this.instances.has(key);
  }

  /**
   * 重置注册表
   * 主要用于测试环境，清除所有注册的单例
   * 注意：这不会销毁单例实例本身，只是清除注册表的引用
   */
  static reset(): void {
    this.instances.clear();
    this.initialized = false;
  }

  /**
   * 获取所有已注册的服务键名
   * @returns 服务键名数组
   */
  static getRegisteredKeys(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * 检查是否已初始化
   * @returns 是否已初始化
   */
  static isInitialized(): boolean {
    return this.initialized;
  }
}