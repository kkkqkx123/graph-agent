/**
 * Inversify依赖注入容器
 *
 * 统一的依赖注入容器，管理所有服务的生命周期和依赖关系
 * 支持类型安全的服务获取
 */

import { Container, ContainerModule } from 'inversify';
import { infrastructureBindings, servicesBindings } from './bindings';
import { TYPES, ServiceIdentifier, GetServiceType, TypedServiceIdentifier } from './service-keys';

/**
 * 全局容器实例
 */
export const diContainer = new Container({
  defaultScope: 'Singleton', // 默认单例模式
});

/**
 * 容器配置接口
 */
export interface ContainerConfig {
  enableLogging?: boolean;
  enableCache?: boolean;
}

/**
 * 容器管理器
 */
export class ContainerManager {
  private static instance: ContainerManager;
  private container: Container;
  private config: ContainerConfig;
  private initialized: boolean = false;

  private constructor(config: ContainerConfig = {}) {
    this.container = diContainer;
    this.config = {
      enableLogging: false,
      enableCache: true,
      ...config,
    };
  }

  /**
   * 获取容器管理器单例
   */
  static getInstance(config?: ContainerConfig): ContainerManager {
    if (!ContainerManager.instance) {
      ContainerManager.instance = new ContainerManager(config);
    }
    return ContainerManager.instance;
  }

  /**
   * 初始化容器
   */
  initialize(): void {
    if (this.initialized) {
      if (this.config.enableLogging) {
        console.warn('[DI] 容器已经初始化，跳过重复初始化');
      }
      return;
    }

    try {
      // 加载Infrastructure层绑定
      this.container.load(infrastructureBindings);

      // 加载Services层绑定
      this.container.load(servicesBindings);

      this.initialized = true;
      if (this.config.enableLogging) {
        console.log('[DI] 容器初始化成功');
      }
    } catch (error) {
      console.error('[DI] 容器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取容器实例
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * 加载模块
   */
  loadModule(module: ContainerModule): void {
    this.container.load(module);
    if (this.config.enableLogging) {
      console.log(`[DI] 模块已加载`);
    }
  }

  /**
   * 加载多个模块
   */
  loadModules(modules: ContainerModule[]): void {
    this.container.load(...modules);
    if (this.config.enableLogging) {
      console.log(`[DI] 已加载 ${modules.length} 个模块`);
    }
  }

  /**
   * 卸载模块
   */
  unloadModule(module: ContainerModule): void {
    this.container.unload(module);
    if (this.config.enableLogging) {
      console.log(`[DI] 模块已卸载`);
    }
  }

  /**
   * 获取服务（类型安全版本）
   * @param serviceIdentifier 服务标识符
   * @returns 服务实例
   */
  getService<K extends ServiceIdentifier>(
    serviceIdentifier: TypedServiceIdentifier<K>
  ): GetServiceType<K> {
    if (!this.initialized) {
      throw new Error('[DI] 容器未初始化，请先调用initialize()方法');
    }
    return this.container.get(serviceIdentifier) as GetServiceType<K>;
  }

  /**
   * 尝试获取服务（类型安全版本）
   * @param serviceIdentifier 服务标识符
   * @returns 服务实例或null
   */
  tryGetService<K extends ServiceIdentifier>(
    serviceIdentifier: TypedServiceIdentifier<K>
  ): GetServiceType<K> | null {
    if (!this.initialized) {
      return null;
    }
    try {
      return this.container.get(serviceIdentifier) as GetServiceType<K>;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查服务是否已绑定
   */
  isBound(serviceIdentifier: symbol | string | Function): boolean {
    return this.container.isBound(serviceIdentifier);
  }

  /**
   * 重新绑定服务
   */
  rebind<K extends ServiceIdentifier>(serviceIdentifier: TypedServiceIdentifier<K>): void {
    this.container.rebind(serviceIdentifier);
  }

  /**
   * 清空容器
   */
  clear(): void {
    this.container.unbindAll();
    this.initialized = false;
    if (this.config.enableLogging) {
      console.log(`[DI] 容器已清空`);
    }
  }

  /**
   * 检查容器是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 重置容器（主要用于测试）
   */
  reset(): void {
    this.clear();
  }
}

/**
 * 应用容器
 * 提供统一的服务访问接口
 */
export class AppContainer {
  private static containerManager: ContainerManager | null = null;

  /**
   * 初始化应用容器
   */
  static initialize(config?: ContainerConfig): void {
    if (this.containerManager) {
      console.warn('[AppContainer] 容器已经初始化');
      return;
    }

    this.containerManager = ContainerManager.getInstance(config);
    this.containerManager.initialize();

    if (config?.enableLogging) {
      console.log('[AppContainer] 应用容器初始化完成');
    }
  }

  /**
   * 获取容器管理器
   */
  static getContainerManager(): ContainerManager {
    if (!this.containerManager) {
      throw new Error('[AppContainer] 容器未初始化，请先调用initialize()方法');
    }
    return this.containerManager;
  }

  /**
   * 获取服务（类型安全版本）
   * @param serviceIdentifier 服务标识符
   * @returns 服务实例
   */
  static getService<K extends ServiceIdentifier>(
    serviceIdentifier: TypedServiceIdentifier<K>
  ): GetServiceType<K> {
    return this.getContainerManager().getService<K>(serviceIdentifier);
  }

  /**
   * 尝试获取服务（类型安全版本）
   * @param serviceIdentifier 服务标识符
   * @returns 服务实例或null
   */
  static tryGetService<K extends ServiceIdentifier>(
    serviceIdentifier: TypedServiceIdentifier<K>
  ): GetServiceType<K> | null {
    return this.getContainerManager().tryGetService<K>(serviceIdentifier);
  }

  /**
   * 检查服务是否已绑定
   */
  static isBound(serviceIdentifier: symbol | string | Function): boolean {
    return this.getContainerManager().isBound(serviceIdentifier);
  }

  /**
   * 检查容器是否已初始化
   */
  static isInitialized(): boolean {
    return this.containerManager !== null && this.containerManager.isInitialized();
  }

  /**
   * 重置容器（主要用于测试）
   */
  static reset(): void {
    if (this.containerManager) {
      this.containerManager.reset();
      this.containerManager = null;
    }
  }

  // ========== 便捷方法：常用服务访问 ==========

  /**
   * 获取会话编排服务
   */
  static getSessionOrchestrationService() {
    return this.getService(TYPES.SessionOrchestration);
  }


  /**
   * 获取工作流仓储
   */
  static getWorkflowRepository() {
    return this.getService(TYPES.WorkflowRepository);
  }

  /**
   * 获取会话仓储
   */
  static getSessionRepository() {
    return this.getService(TYPES.SessionRepository);
  }

  /**
   * 获取线程仓储
   */
  static getThreadRepository() {
    return this.getService(TYPES.ThreadRepository);
  }
}

// 导出容器实例
export { diContainer as container };

// 默认导出AppContainer
export default AppContainer;
