/**
 * 环境变量处理器实现
 */

import { IConfigProcessor, EnvironmentProcessorOptions } from '../../domain/common/types';
import { ILogger } from '@shared/types/logger';

/**
 * 环境变量处理器
 * 处理配置中的${VAR}和${VAR:default}模式
 */
export class EnvironmentProcessor implements IConfigProcessor {
  private readonly pattern: RegExp;
  private readonly transform: (value: string) => any;
  private readonly logger: ILogger;

  constructor(
    options: EnvironmentProcessorOptions = {},
    logger: ILogger
  ) {
    this.pattern = options.pattern || /\$\{([^:}]+)(?::([^}]*))?\}/g;
    this.transform = options.transform || ((value: string) => value);
    this.logger = logger.child({ module: 'EnvironmentProcessor' });
  }

  /**
   * 处理配置，替换环境变量
   */
  process(config: Record<string, any>): Record<string, any> {
    this.logger.debug('开始处理环境变量注入');
    
    const processed = this.processObject(config);
    
    this.logger.debug('环境变量注入处理完成');
    return processed;
  }

  /**
   * 递归处理对象
   */
  private processObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.processString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.processObject(item));
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.processObject(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * 处理字符串中的环境变量
   */
  private processString(str: string): string {
    return str.replace(this.pattern, (match, varName, defaultValue) => {
      try {
        const envValue = process.env[varName];
        
        if (envValue === undefined) {
          if (defaultValue === undefined) {
            throw new Error(`环境变量 ${varName} 未设置且没有默认值`);
          }
          this.logger.debug('使用默认值', { varName, defaultValue });
          return defaultValue;
        }

        this.logger.debug('替换环境变量', { varName, value: this.maskSensitiveValue(varName, envValue) });
        
        return this.transform ? this.transform(envValue) : envValue;
      } catch (error) {
        this.logger.error('环境变量处理失败', error as Error, {
          varName
        });
        throw error;
      }
    });
  }

  /**
   * 掩码敏感值
   */
  private maskSensitiveValue(varName: string, value: string): string {
    const sensitivePatterns = [
      /key/i, /secret/i, /password/i, /token/i, /api/i
    ];
    
    const isSensitive = sensitivePatterns.some(pattern => pattern.test(varName));
    
    if (isSensitive && value.length > 4) {
      return value.substring(0, 4) + '***';
    }
    
    return value;
  }
}
