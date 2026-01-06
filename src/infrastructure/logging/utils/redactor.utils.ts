/**
 * 敏感数据脱敏工具类
 */

import { RedactorConfig } from '../interfaces';

/**
 * 敏感数据脱敏工具类
 */
export class RedactorUtils {
  /**
   * 脱敏字符串中的敏感信息
   * @param input 输入字符串
   * @param config 敏感数据配置
   * @returns 脱敏后的字符串
   */
  static sanitize(input: string, config: RedactorConfig): string {
    if (!config.enabled || !config.patterns || config.patterns.length === 0) {
      return input;
    }

    let result = input;
    const replacement = config.replacement || '***';

    for (const pattern of config.patterns) {
      try {
        const regex = new RegExp(pattern, 'gi');
        result = result.replace(regex, replacement);
      } catch (error) {
        // 如果正则表达式无效，跳过该模式
        console.warn(`无效的正则表达式模式: ${pattern}`, error);
      }
    }

    return result;
  }

  /**
   * 脱敏对象中的敏感信息
   * @param obj 输入对象
   * @param config 敏感数据配置
   * @returns 脱敏后的对象
   */
  static sanitizeObject(obj: any, config: RedactorConfig): any {
    if (!config.enabled) {
      return obj;
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (obj instanceof Error) {
      return this.sanitizeError(obj, config);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, config));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.sanitize(value, config);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeObject(value, config);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 脱敏错误对象中的敏感信息
   * @param error 错误对象
   * @param config 敏感数据配置
   * @returns 脱敏后的错误对象
   */
  static sanitizeError(error: Error, config: RedactorConfig): Error {
    if (!config.enabled) {
      return error;
    }

    const sanitizedMessage = this.sanitize(error.message, config);
    const sanitizedStack = error.stack ? this.sanitize(error.stack, config) : undefined;

    // 创建一个新的错误对象，保持原有的错误类型
    const sanitizedError = new Error(sanitizedMessage);
    sanitizedError.stack = sanitizedStack;
    sanitizedError.name = error.name;

    // 复制其他属性
    for (const key in error) {
      if (error.hasOwnProperty(key) && key !== 'message' && key !== 'stack' && key !== 'name') {
        const value = (error as any)[key];
        if (typeof value === 'string') {
          (sanitizedError as any)[key] = this.sanitize(value, config);
        } else if (typeof value === 'object' && value !== null) {
          (sanitizedError as any)[key] = this.sanitizeObject(value, config);
        } else {
          (sanitizedError as any)[key] = value;
        }
      }
    }

    return sanitizedError;
  }

  /**
   * 检查字符串是否包含敏感信息
   * @param input 输入字符串
   * @param config 敏感数据配置
   * @returns 如果包含敏感信息返回 true
   */
  static containsSensitiveData(input: string, config: RedactorConfig): boolean {
    if (!config.enabled || !config.patterns || config.patterns.length === 0) {
      return false;
    }

    for (const pattern of config.patterns) {
      try {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(input)) {
          return true;
        }
      } catch (error) {
        // 如果正则表达式无效，跳过该模式
        console.warn(`无效的正则表达式模式: ${pattern}`, error);
      }
    }

    return false;
  }

  /**
   * 创建默认的敏感数据配置
   * @returns 默认配置
   */
  static createDefaultConfig(): RedactorConfig {
    return {
      patterns: [
        'sk-[a-zA-Z0-9]{20,}',
        'ms-[a-zA-Z0-9]{15,}',
        '\\w+@\\w+\\.\\w+',
        '1\\d{10}',
        'password["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+',
        'token["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+',
        'key["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+',
        'secret["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+',
        'authorization["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+',
        'bearer\\s+[a-zA-Z0-9\\-._~+/]+=*',
        'api[_-]?key["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+',
      ],
      replacement: '***',
      enabled: true,
    };
  }

  /**
   * 从环境变量加载敏感数据模式
   * @returns 敏感数据配置
   */
  static loadFromEnv(): RedactorConfig {
    const config = this.createDefaultConfig();

    // 从环境变量加载自定义模式
    const customPatterns = process.env['AGENT_SENSITIVE_PATTERNS'];
    if (customPatterns) {
      try {
        const patterns = JSON.parse(customPatterns);
        if (Array.isArray(patterns)) {
          config.patterns = [...config.patterns, ...patterns];
        }
      } catch (error) {
        console.warn('解析环境变量 AGENT_SENSITIVE_PATTERNS 失败:', error);
      }
    }

    // 从环境变量加载替换字符串
    const replacement = process.env['AGENT_SENSITIVE_REPLACEMENT'];
    if (replacement) {
      config.replacement = replacement;
    }

    // 从环境变量加载启用状态
    const enabled = process.env['AGENT_SENSITIVE_ENABLED'];
    if (enabled !== undefined) {
      config.enabled = enabled.toLowerCase() === 'true';
    }

    return config;
  }
}
