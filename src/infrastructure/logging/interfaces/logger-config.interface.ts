/**
 * 日志配置接口定义
 */

import { LogLevel } from '../../../domain/common/types/logger-types';

/**
 * 日志输出类型
 */
export enum LogOutputType {
  CONSOLE = 'console',
  FILE = 'file',
  REMOTE = 'remote'
}

/**
 * 日志格式类型
 */
export enum LogFormatType {
  JSON = 'json',
  TEXT = 'text',
  CUSTOM = 'custom'
}

/**
 * 日志轮转策略
 */
export enum LogRotationStrategy {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  SIZE = 'size'
}

/**
 * 基础日志输出配置
 */
export interface BaseLogOutputConfig {
  type: LogOutputType;
  level: LogLevel;
  format: LogFormatType;
  enabled?: boolean;
}

/**
 * 控制台日志输出配置
 */
export interface ConsoleLogOutputConfig extends BaseLogOutputConfig {
  type: LogOutputType.CONSOLE;
  colorize?: boolean;
  timestamp?: boolean;
}

/**
 * 文件日志输出配置
 */
export interface FileLogOutputConfig extends BaseLogOutputConfig {
  type: LogOutputType.FILE;
  path: string;
  rotation?: LogRotationStrategy;
  max_size?: string;
  max_files?: number;
  compress?: boolean;
}

/**
 * 远程日志输出配置
 */
export interface RemoteLogOutputConfig extends BaseLogOutputConfig {
  type: LogOutputType.REMOTE;
  endpoint: string;
  api_key?: string;
  batch_size?: number;
  flush_interval?: number;
}

/**
 * 日志输出配置联合类型
 */
export type LogOutputConfig =
  | ConsoleLogOutputConfig
  | FileLogOutputConfig
  | RemoteLogOutputConfig;

/**
 * 敏感信息脱敏配置
 */
export interface RedactorConfig {
  patterns: string[];
  replacement?: string;
  enabled?: boolean;
}

/**
 * 日志系统配置
 */
export interface LoggerConfig {
  level: LogLevel;
  outputs: LogOutputConfig[];
  sensitive_data?: RedactorConfig;
  meta?: Record<string, any>;
}

/**
 * 日志配置构建器
 */
export class LoggerConfigBuilder {
  private config: Partial<LoggerConfig> = {
    level: LogLevel.INFO,
    outputs: [],
    sensitive_data: {
      patterns: [],
      replacement: '***',
      enabled: true
    }
  };

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): LoggerConfigBuilder {
    this.config.level = level;
    return this;
  }

  /**
   * 添加控制台输出
   */
  addConsoleOutput(config: Partial<ConsoleLogOutputConfig> = {}): LoggerConfigBuilder {
    this.config.outputs = this.config.outputs || [];
    this.config.outputs.push({
      type: LogOutputType.CONSOLE,
      level: LogLevel.DEBUG,
      format: LogFormatType.TEXT,
      enabled: true,
      colorize: true,
      timestamp: true,
      ...config
    });
    return this;
  }

  /**
   * 添加文件输出
   */
  addFileOutput(config: Partial<FileLogOutputConfig>): LoggerConfigBuilder {
    this.config.outputs = this.config.outputs || [];
    this.config.outputs.push({
      type: LogOutputType.FILE,
      level: LogLevel.INFO,
      format: LogFormatType.JSON,
      path: 'logs/app.log',
      rotation: LogRotationStrategy.DAILY,
      max_size: '10MB',
      max_files: 7,
      compress: true,
      ...config
    });
    return this;
  }

  /**
   * 添加远程输出
   */
  addRemoteOutput(config: Partial<RemoteLogOutputConfig>): LoggerConfigBuilder {
    this.config.outputs = this.config.outputs || [];
    this.config.outputs.push({
      type: LogOutputType.REMOTE,
      level: LogLevel.WARN,
      format: LogFormatType.JSON,
      endpoint: '',
      batch_size: 100,
      flush_interval: 5000,
      ...config
    });
    return this;
  }

  /**
   * 设置敏感信息配置
   */
  setSensitiveData(config: Partial<RedactorConfig>): LoggerConfigBuilder {
    this.config.sensitive_data = {
      patterns: [],
      replacement: '***',
      enabled: true,
      ...config
    };
    return this;
  }

  /**
   * 设置元数据
   */
  setMeta(meta: Record<string, any>): LoggerConfigBuilder {
    this.config.meta = meta;
    return this;
  }

  /**
   * 构建配置
   */
  build(): LoggerConfig {
    if (!this.config.level) {
      throw new Error('日志级别必须设置');
    }
    if (!this.config.outputs || this.config.outputs.length === 0) {
      throw new Error('至少需要配置一个日志输出');
    }
    return this.config as LoggerConfig;
  }
}