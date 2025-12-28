/**
 * Inversify依赖注入容器
 *
 * 统一的依赖注入容器，管理所有服务的生命周期和依赖关系
 */

import { Container, ContainerModule, interfaces } from 'inversify';
import { TYPES } from './service-keys';

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

  private constructor(config: ContainerConfig = {}) {
    this.container = diContainer;
    this.config = {
      enableLogging: false,
      enableCache: true,
      ...config
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
   * 获取服务
   */
  getService<T>(serviceIdentifier: symbol): T {
    return this.container.get<T>(serviceIdentifier);
  }

  /**
   * 尝试获取服务
   */
  tryGetService<T>(serviceIdentifier: symbol): T | null {
    try {
      return this.container.get<T>(serviceIdentifier);
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查服务是否已绑定
   */
  isBound(serviceIdentifier: symbol): boolean {
    return this.container.isBound(serviceIdentifier);
  }

  /**
   * 重新绑定服务
   */
  rebind<T>(serviceIdentifier: symbol): void {
    this.container.rebind<T>(serviceIdentifier);
  }

  /**
   * 清空容器
   */
  clear(): void {
    this.container.unbindAll();
    if (this.config.enableLogging) {
      console.log(`[DI] 容器已清空`);
    }
  }

  /**
   * 获取所有绑定的服务
   */
  getBoundServices(): symbol[] {
    // 使用反射获取绑定的服务
    const boundServices: symbol[] = [];
    
    // 遍历所有已知的TYPES
    Object.values(TYPES).forEach(type => {
      if (this.container.isBound(type)) {
        boundServices.push(type);
      }
    });
    
    return boundServices;
  }
}

/**
 * 服务定位器
 * 提供便捷的服务访问方式
 */
export class ServiceLocator {
  private static containerManager: ContainerManager;

  static initialize(containerManager: ContainerManager): void {
    this.containerManager = containerManager;
  }

  static get<T>(serviceIdentifier: symbol): T {
    if (!this.containerManager) {
      throw new Error('ServiceLocator未初始化，请先调用initialize()方法');
    }
    return this.containerManager.getService<T>(serviceIdentifier);
  }

  static tryGet<T>(serviceIdentifier: symbol): T | null {
    if (!this.containerManager) {
      return null;
    }
    return this.containerManager.tryGetService<T>(serviceIdentifier);
  }

  static isBound(serviceIdentifier: symbol): boolean {
    if (!this.containerManager) {
      return false;
    }
    return this.containerManager.isBound(serviceIdentifier);
  }
}

// 导出容器实例
export { diContainer as container };