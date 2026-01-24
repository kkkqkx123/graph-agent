/**
 * 日志工厂类
 */

import { ILogger } from '../../domain/common/types/logger-types';
import { LoggerConfig, LoggerConfigBuilder, LogOutputType, LogFormatType } from './logger-config';
import { Logger } from './logger';
import { LoggerConfigManager } from './logger-config';
import { InvalidConfigurationError } from '../../common/exceptions';

/**
 * 日志工厂类
 */
export class LoggerFactory {
  private static instance: LoggerFactory;
  private configManager: LoggerConfigManager;
  private defaultLogger: ILogger | null = null;

  private constructor() {
    this.configManager = LoggerConfigManager.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory();
    }
    return LoggerFactory.instance;
  }

  /**
   * 创建日志记录器
   * 
   * 注意：Logger 不再维护实例级上下文
   * 上下文由调用方在每次日志调用时提供
   */
  createLogger(config?: Partial<LoggerConfig>): ILogger {
    let loggerConfig: LoggerConfig;

    if (config) {
      // 如果提供了配置，与默认配置合并
      const defaultConfig = this.configManager.getConfig();
      loggerConfig = { ...defaultConfig, ...config };
    } else {
      // 使用配置管理器中的配置
      loggerConfig = this.configManager.getConfig();
    }

    return new Logger(loggerConfig);
  }

  /**
   * 创建默认日志记录器
   */
  createDefaultLogger(): ILogger {
    if (!this.defaultLogger) {
      this.defaultLogger = this.createLogger();
    }
    return this.defaultLogger;
  }

  /**
   * 从TOML配置创建日志记录器
   */
  createFromToml(tomlConfig: any): ILogger {
    this.configManager.loadFromToml(tomlConfig);
    return this.createLogger();
  }

  /**
   * 从环境变量创建日志记录器
   */
  createFromEnv(): ILogger {
    this.configManager.loadFromEnv();
    return this.createLogger();
  }

  /**
   * 创建开发环境日志记录器
   */
  createDevelopmentLogger(): ILogger {
    const config = new LoggerConfigBuilder()
      .setLevel('DEBUG' as any)
      .addConsoleOutput({
        level: 'DEBUG' as any,
        format: 'TEXT' as any,
        colorize: true,
        timestamp: true,
      })
      .addFileOutput({
        level: 'DEBUG' as any,
        format: 'JSON' as any,
        path: 'logs/dev.log',
        rotation: 'daily' as any,
        max_size: '50MB',
        max_files: 3,
      })
      .build();

    return new Logger(config);
  }

  /**
   * 创建生产环境日志记录器
   */
  createProductionLogger(): ILogger {
    const config = new LoggerConfigBuilder()
      .setLevel('INFO' as any)
      .addConsoleOutput({
        level: 'WARN' as any,
        format: 'JSON' as any,
        colorize: false,
        timestamp: true,
      })
      .addFileOutput({
        level: 'INFO' as any,
        format: 'JSON' as any,
        path: 'logs/app.log',
        rotation: 'daily' as any,
        max_size: '100MB',
        max_files: 30,
        compress: true,
      })
      .build();

    return new Logger(config);
  }

  /**
   * 创建测试环境日志记录器
   */
  createTestLogger(): ILogger {
    const config = new LoggerConfigBuilder()
      .setLevel('ERROR' as any)
      .addConsoleOutput({
        level: 'ERROR' as any,
        format: 'TEXT' as any,
        colorize: false,
        timestamp: false,
      })
      .build();

    return new Logger(config);
  }

  /**
   * 创建自定义日志记录器
   */
  createCustomLogger(
    level: string,
    outputs: Array<{
      type: LogOutputType;
      format: LogFormatType;
      config?: any;
    }>
  ): ILogger {
    const builder = new LoggerConfigBuilder().setLevel(level as any);

    for (const output of outputs) {
      switch (output.type) {
        case LogOutputType.CONSOLE:
          builder.addConsoleOutput({
            level: level as any,
            format: output.format,
            ...output.config,
          });
          break;
        case LogOutputType.FILE:
          builder.addFileOutput({
            level: level as any,
            format: output.format,
            ...output.config,
          });
          break;
        default:
          throw new InvalidConfigurationError('output.type', `不支持的输出类型: ${output.type}`);
      }
    }

    const config = builder.build();
    return new Logger(config);
  }

  /**
   * 重置默认日志记录器
   */
  resetDefaultLogger(): void {
    if (this.defaultLogger) {
      this.defaultLogger.close?.();
      this.defaultLogger = null;
    }
  }

  /**
   * 更新全局配置
   */
  updateGlobalConfig(config: Partial<LoggerConfig>): void {
    this.configManager.updateConfig(config);
    this.resetDefaultLogger();
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): LoggerConfigManager {
    return this.configManager;
  }

  /**
   * 关闭所有日志记录器
   */
  async closeAll(): Promise<void> {
    if (this.defaultLogger) {
      await this.defaultLogger.close?.();
      this.defaultLogger = null;
    }
  }
}
