/**
 * 日志配置实现
 */

import { LogLevel } from '../../domain/common/types/logger-types';
import {
  LoggerConfig,
  LogOutputConfig,
  LogOutputType,
  LogFormatType,
  RedactorConfig,
  LoggerConfigBuilder,
} from './interfaces';
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
        throw new Error(`不支持的日志输出类型: ${output.type}`);
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
      throw new Error(`无效的日志级别: ${config.level}`);
    }

    // 验证输出配置
    if (!config.outputs || config.outputs.length === 0) {
      throw new Error('至少需要配置一个日志输出');
    }

    for (const output of config.outputs) {
      if (!Object.values(LogOutputType).includes(output.type)) {
        throw new Error(`无效的日志输出类型: ${output.type}`);
      }

      if (!Object.values(LogLevel).includes(output.level)) {
        throw new Error(`无效的日志级别: ${output.level}`);
      }

      if (output.type === LogOutputType.FILE && !(output as any).path) {
        throw new Error('文件输出必须指定路径');
      }
    }

    return true;
  }
}
