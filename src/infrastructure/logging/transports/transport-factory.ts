/**
 * 日志传输器工厂
 */

import { ILoggerTransport, ILoggerTransportFactory, LogOutputConfig, LogOutputType } from '../interfaces';
import { ConsoleTransport } from './console-transport';
import { FileTransport } from './file-transport';

/**
 * 传输器工厂实现
 */
export class TransportFactory implements ILoggerTransportFactory {
  private static instance: TransportFactory;
  private transportFactories: Map<LogOutputType, (config: LogOutputConfig) => ILoggerTransport> = new Map();

  private constructor() {
    this.registerDefaultTransports();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TransportFactory {
    if (!TransportFactory.instance) {
      TransportFactory.instance = new TransportFactory();
    }
    return TransportFactory.instance;
  }

  /**
   * 创建传输器
   */
  createTransport(config: LogOutputConfig): ILoggerTransport {
    const factory = this.transportFactories.get(config.type);
    if (!factory) {
      throw new Error(`不支持的日志传输器类型: ${config.type}`);
    }
    return factory(config);
  }

  /**
   * 检查是否支持指定配置
   */
  supports(config: LogOutputConfig): boolean {
    return this.transportFactories.has(config.type);
  }

  /**
   * 注册传输器
   */
  registerTransport(type: LogOutputType, factory: (config: LogOutputConfig) => ILoggerTransport): void {
    this.transportFactories.set(type, factory);
  }

  /**
   * 注册控制台传输器
   */
  private registerConsoleTransport(): void {
    this.transportFactories.set(LogOutputType.CONSOLE, (config) => {
      return new ConsoleTransport(config);
    });
  }

  /**
   * 注册文件传输器
   */
  private registerFileTransport(): void {
    this.transportFactories.set(LogOutputType.FILE, (config) => {
      return new FileTransport(config);
    });
  }

  /**
   * 注册默认传输器
   */
  private registerDefaultTransports(): void {
    this.registerConsoleTransport();
    this.registerFileTransport();
  }

  /**
   * 获取所有支持的传输器类型
   */
  getSupportedTypes(): LogOutputType[] {
    return Array.from(this.transportFactories.keys());
  }

  /**
   * 创建控制台传输器
   */
  createConsoleTransport(config: LogOutputConfig): ConsoleTransport {
    if (config.type !== LogOutputType.CONSOLE) {
      throw new Error('配置类型不匹配，期望: console');
    }
    return new ConsoleTransport(config);
  }

  /**
   * 创建文件传输器
   */
  createFileTransport(config: LogOutputConfig): FileTransport {
    if (config.type !== LogOutputType.FILE) {
      throw new Error('配置类型不匹配，期望: file');
    }
    return new FileTransport(config);
  }
}