/**
 * 服务工厂基类
 * 
 * 提供服务创建和依赖注入的通用功能
 */

import { ILogger } from '@shared/types/logger';
import { IContainer } from '../../infrastructure/container/container';
import { BaseService } from './base-service';

/**
 * 服务工厂基类
 */
export abstract class BaseServiceFactory {
  protected readonly container: IContainer;
  protected readonly logger: ILogger;

  constructor(container: IContainer) {
    this.container = container;
    this.logger = container.get<ILogger>('ILogger');
  }



  /**
   * 获取依赖
   * @param token 依赖令牌
   * @returns 依赖实例
   */
  protected getDependency<T>(token: string): T {
    return this.container.get<T>(token);
  }

  /**
   * 可选地获取依赖
   * @param token 依赖令牌
   * @returns 依赖实例或undefined
   */
  protected getOptionalDependency<T>(token: string): T | undefined {
    try {
      return this.container.get<T>(token);
    } catch {
      return undefined;
    }
  }

  /**
   * 检查依赖是否存在
   * @param token 依赖令牌
   * @returns 是否存在
   */
  protected hasDependency(token: string): boolean {
    try {
      this.container.get(token);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 应用服务工厂基类
 */
export abstract class BaseApplicationServiceFactory<T extends BaseService> extends BaseServiceFactory {
  /**
   * 创建应用服务
   * @returns 应用服务实例
   */
  abstract createApplicationService(): T;

  /**
   * 批量创建服务
   * @param count 创建数量
   * @returns 服务实例数组
   */
  createBatchServices(count: number): T[] {
    const services: T[] = [];
    for (let i = 0; i < count; i++) {
      services.push(this.createApplicationService());
    }
    return services;
  }

  /**
   * 创建单例服务
   * @returns 服务实例
   */
  createSingletonService(): T {
    if (!this.singletonInstance) {
      this.singletonInstance = this.createApplicationService();
    }
    return this.singletonInstance;
  }

  private singletonInstance?: T;
}