/**
 * 环境变量配置源实现
 */

import { IConfigSource, ConfigSourceType, EnvironmentConfigSourceOptions } from '../../domain/common/types';
import { ILogger } from '@shared/types/logger';

/**
 * 环境变量配置源
 */
export class EnvironmentConfigSource implements IConfigSource {
  readonly type = ConfigSourceType.ENVIRONMENT;
  readonly priority: number;
  
  private readonly prefix: string;
  private readonly separator: string;
  private readonly transform: 'lowercase' | 'uppercase' | 'none';
  private readonly logger: ILogger;

  constructor(
    options: EnvironmentConfigSourceOptions,
    priority: number,
    logger: ILogger
  ) {
    this.prefix = options.prefix || '';
    this.separator = options.separator || '_';
    this.transform = options.transform || 'lowercase';
    this.priority = priority;
    this.logger = logger.child({ 
      module: 'EnvironmentConfigSource', 
      prefix: this.prefix 
    });
  }

  /**
   * 加载环境变量配置
   */
  async load(): Promise<Record<string, any>> {
    try {
      this.logger.debug('正在加载环境变量配置');
      
      const config: Record<string, any> = {};
      
      // 遍历所有环境变量
      for (const [key, value] of Object.entries(process.env)) {
        // 检查前缀
        if (this.prefix && !key.startsWith(this.prefix)) {
          continue;
        }
        
        // 移除前缀
        let envKey = this.prefix ? key.substring(this.prefix.length) : key;
        
        // 应用转换
        envKey = this.applyTransform(envKey);
        
        // 转换为嵌套对象
        this.setNestedValue(config, envKey, this.parseValue(value));
      }
      
      this.logger.debug('环境变量配置加载成功', { 
        keyCount: Object.keys(this.flattenConfig(config)).length 
      });
      
      return config;
    } catch (error) {
      this.logger.error('环境变量配置加载失败', error as Error);
      throw error;
    }
  }

  /**
   * 应用键名转换
   */
  private applyTransform(key: string): string {
    switch (this.transform) {
      case 'lowercase':
        return key.toLowerCase();
      case 'uppercase':
        return key.toUpperCase();
      case 'none':
      default:
        return key;
    }
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split(this.separator).filter(key => key.length > 0);
    const lastKey = keys.pop()!;
    
    let current = obj;
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
  }

  /**
   * 解析值类型
   */
  private parseValue(value: string | undefined): any {
    if (value === undefined) {
      return undefined;
    }
    
    // 尝试解析为布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // 尝试解析为数字
    const numValue = Number(value);
    if (!isNaN(numValue) && isFinite(numValue)) {
      return numValue;
    }
    
    // 尝试解析为JSON
    if ((value.startsWith('{') && value.endsWith('}')) || 
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch {
        // 如果解析失败，返回原始字符串
      }
    }
    
    // 返回字符串
    return value;
  }

  /**
   * 扁平化配置对象（用于日志记录）
   */
  private flattenConfig(obj: Record<string, any>, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenConfig(value, fullKey));
      } else {
        result[fullKey] = value;
      }
    }
    
    return result;
  }
}
