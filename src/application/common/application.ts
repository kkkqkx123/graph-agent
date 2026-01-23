/**
 * 应用程序主类
 */

import { AppContainer } from '../../di/container';
import { TYPES } from '../../di/service-keys';
import { ILogger, IService } from '../../domain/common';

/**
 * 应用程序类
 */
export class Application implements IService {
  private readonly services: IService[] = [];
  private isInitialized = false;
  private isStarted = false;

  constructor() {
    // 不再需要传入容器，直接使用AppContainer
  }

  /**
   * 初始化应用程序
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 获取核心服务
      const logger = AppContainer.getService<ILogger>(TYPES.Logger);

      logger.info('正在初始化应用程序...');

      // TODO: 初始化配置管理器（待实现）
      // const configManager = AppContainer.getService<IConfigManager>(TYPES.ConfigManager);
      // await this.initializeConfig(configManager, logger);

      // 注册和初始化服务
      await this.initializeServices(logger);

      this.isInitialized = true;
      logger.info('应用程序初始化完成');
    } catch (error) {
      const logger = AppContainer.getService<ILogger>(TYPES.Logger);
      logger.error('应用程序初始化失败', error as Error);
      throw error;
    }
  }

  /**
   * 启动应用程序
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isStarted) {
      return;
    }

    try {
      const logger = AppContainer.getService<ILogger>(TYPES.Logger);
      logger.info('正在启动应用程序...');

      // 启动所有服务
      for (const service of this.services) {
        await service.start?.();
      }

      this.isStarted = true;
      logger.info('应用程序启动完成');
    } catch (error) {
      const logger = AppContainer.getService<ILogger>(TYPES.Logger);
      logger.error('应用程序启动失败', error as Error);
      throw error;
    }
  }

  /**
   * 停止应用程序
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      const logger = AppContainer.getService<ILogger>(TYPES.Logger);
      logger.info('正在停止应用程序...');

      // 停止所有服务
      for (const service of this.services) {
        await service.stop?.();
      }

      this.isStarted = false;
      logger.info('应用程序停止完成');
    } catch (error) {
      const logger = AppContainer.getService<ILogger>(TYPES.Logger);
      logger.error('应用程序停止失败', error as Error);
      throw error;
    }
  }

  /**
   * 释放应用程序资源
   */
  async dispose(): Promise<void> {
    try {
      await this.stop();

      const logger = AppContainer.getService<ILogger>(TYPES.Logger);
      logger.info('正在释放应用程序资源...');

      // 释放所有服务
      for (const service of this.services) {
        await service.dispose();
      }

      this.services.length = 0;
      this.isInitialized = false;

      logger.info('应用程序资源释放完成');
    } catch (error) {
      const logger = AppContainer.getService<ILogger>(TYPES.Logger);
      logger.error('应用程序资源释放失败', error as Error);
      throw error;
    }
  }

  /**
   * 初始化配置管理器
   */
  private async initializeConfig(logger: ILogger): Promise<void> {
    logger.info('正在初始化配置管理器...');

    // TODO: 实现配置管理器初始化逻辑
    // const configManager = AppContainer.getService<IConfigManager>(TYPES.ConfigManager);
    // await configManager.initialize();

    logger.info('配置管理器初始化完成');
  }

  /**
   * 初始化服务
   */
  private async initializeServices(logger: ILogger): Promise<void> {
    logger.info('正在初始化服务...');

    // TODO: 注册和初始化服务
    // const services = [
    //   this.container.get<IService>('WorkflowService'),
    //   this.container.get<IService>('SessionService'),
    //   this.container.get<IService>('ToolService'),
    //   this.container.get<IService>('StateService'),
    //   this.container.get<IService>('LLMService'),
    //   this.container.get<IService>('HistoryService')
    // ];

    // for (const service of services) {
    //   await service.initialize();
    //   this.services.push(service);
    // }

    logger.info('服务初始化完成');
  }
}
