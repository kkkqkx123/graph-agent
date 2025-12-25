/**
 * 分层依赖注入容器实现
 * 支持基础设施层、应用层和接口层的分层容器架构
 */

import {
  LoggerServiceBindings,
  ConfigServiceBindings,
  DatabaseServiceBindings,
  CacheServiceBindings
} from './bindings/infrastructure-bindings';
// TODO: 实现缺失的绑定文件
// import { WorkflowInfrastructureBindings } from './bindings/workflow-bindings';
// import { ThreadInfrastructureBindings } from './bindings/thread-bindings';
// import { SessionInfrastructureBindings } from './bindings/session-bindings';

import { ApplicationContainer } from '../../application/container/application-container';
import { InterfaceContainer } from '../../interfaces/container/interface-container';

/**
 * 服务生命周期枚举
 */
export enum ServiceLifetime {
  SINGLETON = 'singleton',    // 整个应用程序生命周期内只有一个实例
  TRANSIENT = 'transient',    // 每次请求都创建新实例
  SCOPED = 'scoped'          // 每个作用域内一个实例
}

/**
 * 服务注册选项
 */
export interface ServiceRegistrationOptions {
  lifetime: ServiceLifetime;
  dependencies?: string[];
}

/**
 * 服务注册信息
 */
export interface ServiceRegistration {
  key: string;
  implementation?: new (...args: any[]) => any;
  factory?: () => any;
  instance?: any;
  options: ServiceRegistrationOptions;
}

/**
 * 容器配置接口
 */
export interface ContainerConfiguration {
  [key: string]: any;
}

/**
 * 依赖注入容器接口
 */
export interface IContainer {
  // 基础注册方法
  register<T>(key: string, implementation: new (...args: any[]) => T, options?: ServiceRegistrationOptions): void;
  registerInstance<T>(key: string, instance: T): void;
  registerFactory<T>(key: string, factory: () => T, options?: ServiceRegistrationOptions): void;

  // 解析方法
  get<T>(key: string): T;
  tryGet<T>(key: string): T | null;
  has(key: string): boolean;

  // 生命周期管理
  createScope(): IContainer;
  dispose(): void;

  // 配置和元数据
  configure(config: ContainerConfiguration): void;
  getRegistrations(): Map<string, ServiceRegistration>;
}

/**
 * 基础容器实现
 */
export abstract class BaseContainer implements IContainer {
  protected services: Map<string, ServiceRegistration> = new Map();
  protected instances: Map<string, any> = new Map();
  protected scopedInstances: Map<string, any> = new Map();
  protected parent: IContainer | undefined;
  protected config: ContainerConfiguration = {};

  constructor(parent?: IContainer) {
    this.parent = parent;
  }

  register<T>(key: string, implementation: new (...args: any[]) => T, options: ServiceRegistrationOptions = { lifetime: ServiceLifetime.SINGLETON }): void {
    this.services.set(key, {
      key,
      implementation,
      options
    });
  }

  registerInstance<T>(key: string, instance: T): void {
    this.services.set(key, {
      key,
      instance,
      options: { lifetime: ServiceLifetime.SINGLETON }
    });
    this.instances.set(key, instance);
  }

  registerFactory<T>(key: string, factory: () => T, options: ServiceRegistrationOptions = { lifetime: ServiceLifetime.SINGLETON }): void {
    this.services.set(key, {
      key,
      factory,
      options
    });
  }

  get<T>(key: string): T {
    // 检查当前容器是否有注册
    if (this.services.has(key)) {
      const registration = this.services.get(key)!;
      return this.resolveInstance<T>(registration);
    }

    // 检查父容器
    if (this.parent) {
      return this.parent.get<T>(key);
    }

    throw new Error(`服务未注册: ${key}`);
  }

  tryGet<T>(key: string): T | null {
    try {
      return this.get<T>(key);
    } catch {
      return null;
    }
  }

  has(key: string): boolean {
    return this.services.has(key) || (this.parent?.has(key) ?? false);
  }

  createScope(): IContainer {
    return new ScopedContainer(this);
  }

  dispose(): void {
    // 清理所有服务
    for (const instance of this.instances.values()) {
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose();
      }
    }

    for (const instance of this.scopedInstances.values()) {
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose();
      }
    }

    this.services.clear();
    this.instances.clear();
    this.scopedInstances.clear();
  }

  configure(config: ContainerConfiguration): void {
    this.config = { ...this.config, ...config };
  }

  getRegistrations(): Map<string, ServiceRegistration> {
    return new Map(this.services);
  }

  protected resolveInstance<T>(registration: ServiceRegistration): T {
    const { key, options } = registration;

    // 根据生命周期处理实例
    switch (options.lifetime) {
      case ServiceLifetime.SINGLETON:
        return this.getSingletonInstance<T>(registration);
      case ServiceLifetime.TRANSIENT:
        return this.createInstance<T>(registration);
      case ServiceLifetime.SCOPED:
        return this.getScopedInstance<T>(registration);
      default:
        throw new Error(`不支持的生命周期类型: ${options.lifetime}`);
    }
  }

  protected getSingletonInstance<T>(registration: ServiceRegistration): T {
    const { key } = registration;

    if (this.instances.has(key)) {
      return this.instances.get(key) as T;
    }

    const instance = this.createInstance<T>(registration);
    this.instances.set(key, instance);
    return instance;
  }

  protected getScopedInstance<T>(registration: ServiceRegistration): T {
    const { key } = registration;

    if (this.scopedInstances.has(key)) {
      return this.scopedInstances.get(key) as T;
    }

    const instance = this.createInstance<T>(registration);
    this.scopedInstances.set(key, instance);
    return instance;
  }

  protected createInstance<T>(registration: ServiceRegistration): T {
    if (registration.factory) {
      return registration.factory();
    }

    if (registration.instance) {
      return registration.instance;
    }

    if (registration.implementation) {
      // TODO: 实现自动依赖解析
      // const dependencies = this.resolveDependencies(registration.implementation);
      // return new registration.implementation(...dependencies);
      return new registration.implementation();
    }

    throw new Error(`无法创建实例: ${registration.key}`);
  }

  // TODO: 实现自动依赖解析
  // protected resolveDependencies(implementation: any): any[] {
  //   // 通过反射获取构造函数参数类型
  //   const paramTypes = Reflect.getMetadata('design:paramtypes', implementation) || [];
  //   return paramTypes.map((paramType: any) => {
  //     const serviceName = this.getServiceName(paramType);
  //     return this.get(serviceName);
  //   });
  // }
}

/**
 * 作用域容器实现
 */
export class ScopedContainer extends BaseContainer {
  private scopeId: string;

  constructor(parent: IContainer) {
    super(parent);
    this.scopeId = this.generateScopeId();
  }

  private generateScopeId(): string {
    return `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 服务绑定基类
 */
export abstract class ServiceBindings {
  abstract registerServices(container: IContainer, config: ContainerConfiguration): void;
}

/**
 * 基础设施层容器
 */
export class InfrastructureContainer extends BaseContainer {
  constructor(config: ContainerConfiguration = {}) {
    super();
    this.configure(config);
    this.registerInfrastructureServices();
  }

  private registerInfrastructureServices(): void {
    // 注册基础设施层服务
    const loggerBindings = new LoggerServiceBindings();
    loggerBindings.registerServices(this, this.config);

    const configBindings = new ConfigServiceBindings();
    configBindings.registerServices(this, this.config);

    const databaseBindings = new DatabaseServiceBindings();
    databaseBindings.registerServices(this, this.config);

    const cacheBindings = new CacheServiceBindings();
    cacheBindings.registerServices(this, this.config);

    // LLM绑定现在通过ConfigServiceBindings注册

    // TODO: 实现缺失的绑定文件
    // const workflowBindings = new WorkflowInfrastructureBindings();
    // workflowBindings.registerServices(this, this.config);

    // const threadBindings = new ThreadInfrastructureBindings();
    // threadBindings.registerServices(this, this.config);

    // const sessionBindings = new SessionInfrastructureBindings();
    // sessionBindings.registerServices(this, this.config);
  }
}


/**
 * 容器引导器
 */
export class ContainerBootstrap {
  /**
   * 创建分层容器
   */
  static createContainers(config: ContainerConfiguration = {}): {
    infrastructure: InfrastructureContainer;
    application: ApplicationContainer;
    interface: InterfaceContainer;
  } {
    // 创建基础设施容器
    const infrastructureContainer = new InfrastructureContainer(config);

    // 创建应用容器
    const applicationContainer = new ApplicationContainer(
      infrastructureContainer,
      config
    );

    // 创建接口容器
    // TODO: 修复ApplicationContainer实现IContainer接口
    // const interfaceContainer = new InterfaceContainer(
    //   applicationContainer,
    //   config
    // );
    const interfaceContainer = null as any;

    return {
      infrastructure: infrastructureContainer,
      application: applicationContainer,
      interface: interfaceContainer
    };
  }

  // 重新导出分层容器
}

// 重新导出分层容器
export { ApplicationContainer } from '../../application/container/application-container';
export { InterfaceContainer } from '../../interfaces/container/interface-container';

