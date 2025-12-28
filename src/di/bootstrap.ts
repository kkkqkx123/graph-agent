/**
 * DI容器引导器
 *
 * 负责初始化依赖注入容器并加载所有服务绑定
 */

import { ContainerManager, ServiceLocator } from './container';
import { infrastructureBindings, applicationBindings } from './bindings';

/**
 * 容器配置接口
 */
export interface BootstrapConfig {
  enableLogging?: boolean;
  enableCache?: boolean;
}

/**
 * 容器引导器
 */
export class ContainerBootstrap {
  private static instance: ContainerBootstrap;
  private containerManager: ContainerManager;
  private initialized: boolean = false;

  private constructor(config: BootstrapConfig = {}) {
    this.containerManager = ContainerManager.getInstance(config);
  }

  /**
   * 获取引导器单例
   */
  static getInstance(config?: BootstrapConfig): ContainerBootstrap {
    if (!ContainerBootstrap.instance) {
      ContainerBootstrap.instance = new ContainerBootstrap(config);
    }
    return ContainerBootstrap.instance;
  }

  /**
   * 初始化容器
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[DI] 容器已经初始化，跳过重复初始化');
      return;
    }

    try {
      // 加载Infrastructure层绑定
      this.containerManager.loadModule(infrastructureBindings);

      // 加载Application层绑定
      this.containerManager.loadModule(applicationBindings);

      // 初始化ServiceLocator
      ServiceLocator.initialize(this.containerManager);

      this.initialized = true;
      console.log('[DI] 容器初始化成功');
    } catch (error) {
      console.error('[DI] 容器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取容器管理器
   */
  getContainerManager(): ContainerManager {
    if (!this.initialized) {
      throw new Error('[DI] 容器未初始化，请先调用initialize()方法');
    }
    return this.containerManager;
  }

  /**
   * 获取容器实例
   */
  getContainer() {
    return this.getContainerManager().getContainer();
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
    this.containerManager.clear();
    this.initialized = false;
    console.log('[DI] 容器已重置');
  }

  /**
   * 获取所有绑定的服务
   */
  getBoundServices(): symbol[] {
    return this.getContainerManager().getBoundServices();
  }
}

/**
 * 快捷函数：初始化容器
 */
export function initializeContainer(config?: BootstrapConfig): ContainerBootstrap {
  const bootstrap = ContainerBootstrap.getInstance(config);
  bootstrap.initialize();
  return bootstrap;
}

/**
 * 快捷函数：获取服务
 */
export function getService<T>(serviceIdentifier: symbol): T {
  return ServiceLocator.get<T>(serviceIdentifier);
}

/**
 * 快捷函数：尝试获取服务
 */
export function tryGetService<T>(serviceIdentifier: symbol): T | null {
  return ServiceLocator.tryGet<T>(serviceIdentifier);
}

/**
 * 快捷函数：检查服务是否已绑定
 */
export function isServiceBound(serviceIdentifier: symbol): boolean {
  return ServiceLocator.isBound(serviceIdentifier);
}