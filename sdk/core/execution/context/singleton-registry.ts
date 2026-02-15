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
 *
 * 本模块是所有单例服务的唯一来源
 */

import { EventManager } from '../../services/event-manager';
import { WorkflowRegistry } from '../../services/workflow-registry';
import { ThreadRegistry } from '../../services/thread-registry';
import { ToolService } from '../../services/tool-service';
import { CodeService } from '../../services/code-service';
import { ErrorService } from '../../services/error-service';
import { GraphRegistry } from '../../services/graph-registry';
import { GlobalMessageStorage } from '../../services/global-message-storage';
import { NodeTemplateRegistry } from '../../services/node-template-registry';
import { TriggerTemplateRegistry } from '../../services/trigger-template-registry';

/**
 * 单例注册表
 */
export class SingletonRegistry {
  private static instances = new Map<string, any>();
  private static initialized = false;

  /**
   * 初始化注册表
   * 按照依赖顺序注册所有全局单例服务
   */
  static initialize(): void {
    if (this.initialized) {
      return;
    }

    // 第一层：无依赖的服务
    if (!this.has('eventManager')) {
      this.register('eventManager', new EventManager());
    }
    if (!this.has('globalMessageStorage')) {
      this.register('globalMessageStorage', new GlobalMessageStorage());
    }
    if (!this.has('nodeTemplateRegistry')) {
      this.register('nodeTemplateRegistry', new NodeTemplateRegistry());
    }
    if (!this.has('triggerTemplateRegistry')) {
      this.register('triggerTemplateRegistry', new TriggerTemplateRegistry());
    }
    if (!this.has('codeService')) {
      this.register('codeService', new CodeService());
    }
    if (!this.has('toolService')) {
      this.register('toolService', new ToolService());
    }

    // 第二层：依赖第一层的服务
    if (!this.has('errorService')) {
      const eventManager = this.get<EventManager>('eventManager');
      this.register('errorService', new ErrorService(eventManager));
    }

    // 第三层：相互依赖的服务
    if (!this.has('graphRegistry')) {
      this.register('graphRegistry', new GraphRegistry());
    }
    if (!this.has('workflowRegistry')) {
      this.register('workflowRegistry', new WorkflowRegistry({ maxRecursionDepth: 10 }));
    }
    if (!this.has('threadRegistry')) {
      this.register('threadRegistry', new ThreadRegistry());
    }

    // 设置服务间的依赖关系
    const graphRegistry = this.get<GraphRegistry>('graphRegistry');
    const workflowRegistry = this.get<WorkflowRegistry>('workflowRegistry');
    const threadRegistry = this.get<ThreadRegistry>('threadRegistry');

    // workflow-registry 依赖 graph-registry
    workflowRegistry.setGraphRegistry(graphRegistry);

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

  // 便捷访问方法（类型安全）

  /**
   * 获取 EventManager 实例
   */
  static getEventManager(): EventManager {
    return this.get<EventManager>('eventManager');
  }

  /**
   * 获取 WorkflowRegistry 实例
   */
  static getWorkflowRegistry(): WorkflowRegistry {
    return this.get<WorkflowRegistry>('workflowRegistry');
  }

  /**
   * 获取 ThreadRegistry 实例
   */
  static getThreadRegistry(): ThreadRegistry {
    return this.get<ThreadRegistry>('threadRegistry');
  }

  /**
   * 获取 ToolService 实例
   */
  static getToolService(): ToolService {
    return this.get<ToolService>('toolService');
  }

  /**
   * 获取 CodeService 实例
   */
  static getCodeService(): CodeService {
    return this.get<CodeService>('codeService');
  }

  /**
   * 获取 ErrorService 实例
   */
  static getErrorService(): ErrorService {
    return this.get<ErrorService>('errorService');
  }

  /**
   * 获取 GraphRegistry 实例
   */
  static getGraphRegistry(): GraphRegistry {
    return this.get<GraphRegistry>('graphRegistry');
  }

  /**
   * 获取 GlobalMessageStorage 实例
   */
  static getGlobalMessageStorage(): GlobalMessageStorage {
    return this.get<GlobalMessageStorage>('globalMessageStorage');
  }

  /**
   * 获取 NodeTemplateRegistry 实例
   */
  static getNodeTemplateRegistry(): NodeTemplateRegistry {
    return this.get<NodeTemplateRegistry>('nodeTemplateRegistry');
  }

  /**
   * 获取 TriggerTemplateRegistry 实例
   */
  static getTriggerTemplateRegistry(): TriggerTemplateRegistry {
    return this.get<TriggerTemplateRegistry>('triggerTemplateRegistry');
  }
}