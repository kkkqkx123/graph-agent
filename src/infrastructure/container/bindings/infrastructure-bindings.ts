/**
 * 基础设施层服务绑定
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { ILogger } from '@shared/types/logger';
import { LoggerFactory, LoggerConfigManager } from '../../logging';

/**
 * 日志服务绑定
 */
export class LoggerServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册日志配置管理器
    container.registerFactory<LoggerConfigManager>(
      'LoggerConfigManager',
      () => LoggerConfigManager.getInstance(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册日志工厂
    container.registerFactory<LoggerFactory>(
      'LoggerFactory',
      () => LoggerFactory.getInstance(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册默认日志记录器
    container.registerFactory<ILogger>(
      'ILogger',
      () => {
        const loggerFactory = LoggerFactory.getInstance();
        
        // 根据环境创建不同的日志记录器
        const env = process.env['NODE_ENV'] || 'development';
        switch (env.toLowerCase()) {
          case 'production':
            return loggerFactory.createProductionLogger();
          case 'test':
            return loggerFactory.createTestLogger();
          default:
            return loggerFactory.createDevelopmentLogger();
        }
      },
      { lifetime: ServiceLifetime.SINGLETON }
    );
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