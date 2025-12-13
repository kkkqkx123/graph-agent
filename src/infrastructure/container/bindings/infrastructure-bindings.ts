/**
 * 基础设施层服务绑定
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';

/**
 * 日志服务绑定
 */
export class LoggerServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册日志服务
    // container.registerFactory<ILogger>(
    //   'ILogger',
    //   () => new Logger(config.logger),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}

/**
 * 配置服务绑定
 */
export class ConfigServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册配置管理器
    // container.registerFactory<IConfigManager>(
    //   'IConfigManager',
    //   () => new ConfigManager(config.config),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}

/**
 * 数据库服务绑定
 */
export class DatabaseServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册数据库服务
    // container.registerFactory<IDatabase>(
    //   'IDatabase',
    //   () => new Database(config.database),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}

/**
 * 缓存服务绑定
 */
export class CacheServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册缓存服务
    // container.registerFactory<ICache>(
    //   'ICache',
    //   () => new Cache(config.cache),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}

/**
 * LLM服务绑定
 */
export class LLMServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册LLM服务
    // container.registerFactory<ILLMService>(
    //   'ILLMService',
    //   () => new LLMService(config.llm),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}