/**
 * 日志配置实现
 */

import { LogLevel } from '../../domain/common/types/logger-types';
import { ConfigurationError, InvalidConfigurationError, ValidationError } from '../../../common/exceptions';

/**
 * 日志输出类型
 */
export enum LogOutputType {
  CONSOLE = 'console',
  FILE = 'file',
  REMOTE = 'remote',
}

/**
 * 日志格式类型
 */
export enum LogFormatType {
  JSON = 'json',
  TEXT = 'text',
  CUSTOM = 'custom',
}

/**
 * 日志轮转策略
 */
export enum LogRotationStrategy {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  SIZE = 'size',
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
export type LogOutputConfig = ConsoleLogOutputConfig | FileLogOutputConfig | RemoteLogOutputConfig;

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
      enabled: true,
    },
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
      ...config,
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
      ...config,
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
      ...config,
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
      ...config,
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
      throw new InvalidConfigurationError('level', '日志级别必须设置');
    }
    if (!this.config.outputs || this.config.outputs.length === 0) {
      throw new InvalidConfigurationError('outputs', '至少需要配置一个日志输出');
    }
    return this.config as LoggerConfig;
  }
}

import { RedactorUtils } from './utils';

/**
 * 日志配置管理器
 */
export class LoggerConfigManager {
  private static instance: LoggerConfigManager;
  private config: LoggerConfig;

  private constructor() {
    this.config = this.createDefaultConfig();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): LoggerConfigManager {
    if (!LoggerConfigManager.instance) {
      LoggerConfigManager.instance = new LoggerConfigManager();
    }
    return LoggerConfigManager.instance;
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 从TOML配置加载
   */
  loadFromToml(tomlConfig: any): void {
    const config = this.parseTomlConfig(tomlConfig);
    this.updateConfig(config);
  }

  /**
   * 从环境变量加载
   */
  loadFromEnv(): void {
    const envConfig = this.parseEnvConfig();
    this.updateConfig(envConfig);
  }

  /**
   * 创建默认配置
   */
  private createDefaultConfig(): LoggerConfig {
    return new LoggerConfigBuilder()
      .setLevel(LogLevel.INFO)
      .addConsoleOutput({
        level: LogLevel.DEBUG,
        format: LogFormatType.TEXT,
        colorize: true,
        timestamp: true,
      })
      .addFileOutput({
        level: LogLevel.INFO,
        format: LogFormatType.JSON,
        path: 'logs/agent.log',
        rotation: 'daily' as any,
        max_size: '10MB',
        max_files: 7,
      })
      .setSensitiveData(RedactorUtils.createDefaultConfig())
      .setMeta({
        service: 'agent-framework',
        version: '1.0.0',
      })
      .build();
  }

  /**
   * 解析TOML配置
   */
  private parseTomlConfig(tomlConfig: any): Partial<LoggerConfig> {
    const result: Partial<LoggerConfig> = {};

    // 解析日志级别
    if (tomlConfig.log_level) {
      result.level = tomlConfig.log_level.toUpperCase() as LogLevel;
    }

    // 解析日志输出
    if (tomlConfig.log_outputs && Array.isArray(tomlConfig.log_outputs)) {
      result.outputs = tomlConfig.log_outputs.map((output: any) => this.parseLogOutput(output));
    }

    // 解析敏感信息配置
    if (tomlConfig.secret_patterns && Array.isArray(tomlConfig.secret_patterns)) {
      result.sensitive_data = {
        patterns: tomlConfig.secret_patterns,
        replacement: '***',
        enabled: true,
      };
    }

    return result;
  }

  /**
   * 解析单个日志输出配置
   */
  private parseLogOutput(output: any): LogOutputConfig {
    const baseConfig = {
      level: output.level?.toUpperCase() || LogLevel.INFO,
      format: output.format?.toUpperCase() || LogFormatType.JSON,
      enabled: output.enabled !== false,
    };

    switch (output.type?.toLowerCase()) {
      case LogOutputType.CONSOLE:
        return {
          ...baseConfig,
          type: LogOutputType.CONSOLE,
          colorize: output.colorize !== false,
          timestamp: output.timestamp !== false,
        } as LogOutputConfig;

      case LogOutputType.FILE:
        return {
          ...baseConfig,
          type: LogOutputType.FILE,
          path: output.path || 'logs/app.log',
          rotation: output.rotation || 'daily',
          max_size: output.max_size || '10MB',
          max_files: output.max_files || 7,
          compress: output.compress !== false,
        } as LogOutputConfig;

      default:
        throw new InvalidConfigurationError('output.type', `不支持的日志输出类型: ${output.type}`);
    }
  }

  /**
   * 解析环境变量配置
   */
  private parseEnvConfig(): Partial<LoggerConfig> {
    const result: Partial<LoggerConfig> = {};

    // 解析日志级别
    if (process.env['AGENT_LOG_LEVEL']) {
      result.level = process.env['AGENT_LOG_LEVEL'].toUpperCase() as LogLevel;
    }

    // 解析日志格式
    if (process.env['AGENT_LOG_FORMAT']) {
      const format = process.env['AGENT_LOG_FORMAT'].toUpperCase() as LogFormatType;
      if (result.outputs) {
        result.outputs.forEach(output => {
          output.format = format;
        });
      }
    }

    // 解析日志文件路径
    if (process.env['AGENT_LOG_FILE']) {
      if (result.outputs) {
        const fileOutput = result.outputs.find(o => o.type === LogOutputType.FILE);
        if (fileOutput) {
          (fileOutput as any).path = process.env['AGENT_LOG_FILE'];
        }
      }
    }

    return result;
  }

  /**
   * 验证配置
   */
  validateConfig(config: LoggerConfig): boolean {
    // 验证日志级别
    if (!Object.values(LogLevel).includes(config.level)) {
      throw new InvalidConfigurationError('level', `无效的日志级别: ${config.level}`);
    }

    // 验证输出配置
    if (!config.outputs || config.outputs.length === 0) {
      throw new InvalidConfigurationError('outputs', '至少需要配置一个日志输出');
    }

    for (const output of config.outputs) {
      if (!Object.values(LogOutputType).includes(output.type)) {
        throw new InvalidConfigurationError('output.type', `无效的日志输出类型: ${output.type}`);
      }

      if (!Object.values(LogLevel).includes(output.level)) {
        throw new InvalidConfigurationError('output.level', `无效的日志级别: ${output.level}`);
      }

      if (output.type === LogOutputType.FILE && !(output as any).path) {
        throw new InvalidConfigurationError('output.path', '文件输出必须指定路径');
      }
    }

    return true;
  }
}
