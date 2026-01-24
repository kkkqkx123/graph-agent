/**
 * 环境变量处理器实现
 */

import {
  IConfigProcessor,
  EnvironmentProcessorOptions,
  ILogger,
} from '../../../domain/common/types';

/**
 * 环境变量处理器
 * 处理配置中的${VAR}和${VAR:default}模式
 * 自动进行类型转换（字符串 -> 数字/布尔值/JSON等）
 */
export class EnvironmentProcessor implements IConfigProcessor {
  private readonly pattern: RegExp;
  private readonly logger: ILogger;

  constructor(options: EnvironmentProcessorOptions = {}, logger: ILogger) {
    this.pattern = options.pattern || /\$\{([^:}]+)(?::([^}]*))?\}/g;
    this.logger = logger;
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
   * 自动进行类型转换
   */
  private processString(str: string): any {
    return str.replace(this.pattern, (match, varName, defaultValue) => {
      try {
        const envValue = process.env[varName];

        if (envValue === undefined) {
          if (defaultValue === undefined) {
            throw new Error(`环境变量 ${varName} 未设置且没有默认值`);
          }
          this.logger.debug('使用默认值', { varName, defaultValue });
          // 默认值也需要类型转换
          return this.autoConvert(defaultValue);
        }

        this.logger.debug('替换环境变量', {
          varName,
          value: this.maskSensitiveValue(varName, envValue),
        });

        // 自动类型转换
        return this.autoConvert(envValue);
      } catch (error) {
        this.logger.error('环境变量处理失败', error as Error, {
          varName,
        });
        throw error;
      }
    });
  }

  /**
   * 自动类型转换
   * 将字符串值转换为适当的类型（数字、布尔值、JSON等）
   *
   * 转换规则：
   * - "true"/"false" -> boolean
   * - 纯数字 -> number
   * - JSON字符串 -> object/array
   * - 其他 -> string
   */
  private autoConvert(value: string): any {
    const trimmedValue = value.trim();

    // 空字符串返回undefined
    if (trimmedValue === '') {
      return undefined;
    }

    // 尝试转换为布尔值
    if (trimmedValue.toLowerCase() === 'true') {
      return true;
    }
    if (trimmedValue.toLowerCase() === 'false') {
      return false;
    }

    // 尝试转换为数字（整数或浮点数）
    if (/^-?\d+$/.test(trimmedValue)) {
      return parseInt(trimmedValue, 10);
    }
    if (/^-?\d+\.\d+$/.test(trimmedValue)) {
      return parseFloat(trimmedValue);
    }

    // 尝试转换为JSON对象或数组
    if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) ||
        (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))) {
      try {
        return JSON.parse(trimmedValue);
      } catch {
        // 不是有效的JSON，返回原始字符串
      }
    }

    // 返回原始字符串
    return value;
  }

  /**
   * 掩码敏感值
   */
  private maskSensitiveValue(varName: string, value: string): string {
    const sensitivePatterns = [/key/i, /secret/i, /password/i, /token/i, /api/i];

    const isSensitive = sensitivePatterns.some(pattern => pattern.test(varName));

    if (isSensitive && value.length > 4) {
      return value.substring(0, 4) + '***';
    }

    return value;
  }
}
