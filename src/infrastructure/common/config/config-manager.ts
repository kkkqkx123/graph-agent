import { injectable, unmanaged } from 'inversify';
import {
  ConfigManager,
  LLMConfig,
  ModelConfig,
  ProviderConfig,
  ValidationResult,
  ConfigSchema,
  ValidationRule
} from './config-manager.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as toml from 'toml';
import * as yaml from 'yaml';

/**
 * 配置管理器实现
 *
 * 支持从多种配置文件格式加载配置，并支持环境变量覆盖
 * 提供类型安全的配置访问和验证
 */

@injectable()
export class ConfigManagerImpl implements ConfigManager {
  private config: LLMConfig = {} as LLMConfig;
  private watchers: Map<string, Array<(newValue: any, oldValue: any) => void>> = new Map();
  private configPath: string;

  constructor(@unmanaged() configPath?: string) {
    this.configPath = configPath || './configs';
    // 不在构造函数中直接调用异步方法，而是初始化默认配置
    this.config = this.getDefaultConfig();
    this.loadEnvironmentVariables();
    // 异步加载配置文件，但不阻塞构造函数
    this.loadConfigFiles().catch(error => {
      console.error('配置文件加载失败:', error);
    });
  }

  /**
   * 获取配置值
   */
  get<T>(key: string, defaultValue?: T): T {
    const value = this.getNestedValue(this.config, key);
    return value !== undefined ? value : (defaultValue as T);
  }

  /**
   * 获取嵌套配置值 - 类型安全版本
   */
  getNested<K extends keyof LLMConfig>(key: K): LLMConfig[K] {
    return this.config[key];
  }

  /**
   * 获取模型配置
   */
  getModelConfig(provider: keyof Pick<LLMConfig, 'openai' | 'anthropic' | 'gemini' | 'mock'>, model: string): ModelConfig {
    const providerConfig = this.getNested(provider);
    if ('modelConfigs' in providerConfig && providerConfig.modelConfigs) {
      const modelConfig = providerConfig.modelConfigs[model];
      if (!modelConfig) {
        throw new Error(`模型配置未找到: ${provider}.${model}`);
      }
      return modelConfig;
    }
    throw new Error(`提供商配置无效: ${provider}`);
  }

  /**
   * 设置配置值
   */
  set<T>(key: string, value: T): void {
    const oldValue = this.get(key);
    this.setNestedValue(this.config, key, value);
    this.notifyWatchers(key, value, oldValue);
  }

  /**
   * 设置嵌套配置值
   */
  setNested<K extends keyof LLMConfig>(key: K, value: LLMConfig[K]): void {
    this.config[key] = value;
  }

  /**
   * 检查配置键是否存在
   */
  has(key: string): boolean {
    return this.getNestedValue(this.config, key) !== undefined;
  }

  /**
   * 删除配置
   */
  delete(key: string): boolean {
    const hasKey = this.has(key);
    if (hasKey) {
      this.deleteNestedValue(this.config, key);
    }
    return hasKey;
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.loadConfig();
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): LLMConfig {
    return {
      openai: {
        apiKey: '',
        baseURL: 'https://api.openai.com/v1',
        models: [
          'gpt-4',
          'gpt-4-turbo',
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-3.5-turbo',
          'gpt-5'
        ],
        timeout: 30000,
        retryCount: 3
      },
      anthropic: {
        apiKey: '',
        baseURL: 'https://api.anthropic.com',
        models: [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2.1',
          'claude-2.0',
          'claude-instant-1.2'
        ],
        timeout: 30000,
        retryCount: 3
      },
      gemini: {
        apiKey: '',
        baseURL: 'https://generativelanguage.googleapis.com',
        models: [
          'gemini-2.5-pro',
          'gemini-2.5-flash',
          'gemini-2.5-flash-lite',
          'gemini-2.0-flash-exp',
          'gemini-2.0-flash-thinking-exp',
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-1.5-flash-8b'
        ],
        timeout: 30000,
        retryCount: 3
      },
      mock: {
        models: [
          'mock-model',
          'mock-model-turbo',
          'mock-model-pro'
        ],
        timeout: 30000
      },
      rateLimit: {
        maxRequests: 60,
        windowSizeMs: 60000
      }
    };
  }

  /**
   * 获取所有配置键
   */
  keys(): string[] {
    return this.flattenObject(this.config);
  }

  /**
   * 获取配置快照
   */
  snapshot(): LLMConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 监听配置变化
   */
  watch<T>(key: string, callback: (newValue: T, oldValue: T) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, []);
    }
    
    const watchers = this.watchers.get(key)!;
    watchers.push(callback);
    
    return () => {
      const index = watchers.indexOf(callback);
      if (index > -1) {
        watchers.splice(index, 1);
      }
    };
  }

  /**
   * 验证配置
   */
  validate(schema?: ConfigSchema): ValidationResult {
    const errors: string[] = [];
    
    if (!schema) {
      // 默认验证逻辑
      return this.validateDefaultConfig();
    }
    
    // 简单的配置验证实现
    for (const [key, rule] of Object.entries(schema)) {
      const value = this.get(key);
      
      if (rule.required && value === undefined) {
        errors.push(`配置项 '${key}' 是必需的`);
      }
      
      if (value !== undefined && rule.type) {
        const type = typeof value;
        if (type !== rule.type && !(rule.type === 'array' && Array.isArray(value))) {
          errors.push(`配置项 '${key}' 的类型应为 '${rule.type}'，实际为 '${type}'`);
        }
      }
      
      if (value !== undefined && rule.min !== undefined && typeof value === 'number' && value < rule.min) {
        errors.push(`配置项 '${key}' 的值不能小于 ${rule.min}`);
      }
      
      if (value !== undefined && rule.max !== undefined && typeof value === 'number' && value > rule.max) {
        errors.push(`配置项 '${key}' 的值不能大于 ${rule.max}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 默认配置验证
   */
  private validateDefaultConfig(): ValidationResult {
    const errors: string[] = [];
    
    // 验证必需的配置项
    if (!this.config.openai.apiKey) {
      errors.push('OpenAI API密钥是必需的');
    }
    
    if (!this.config.anthropic.apiKey) {
      errors.push('Anthropic API密钥是必需的');
    }
    
    if (!this.config.gemini.apiKey) {
      errors.push('Gemini API密钥是必需的');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取配置结构
   */
  getConfigStructure(): LLMConfig {
    return this.config;
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    try {
      // 加载环境变量
      this.loadEnvironmentVariables();
      
      // 加载配置文件
      await this.loadConfigFiles();
      
      // 在测试环境中不输出日志
      if (process.env['NODE_ENV'] !== 'test') {
        console.log('配置加载完成');
      }
    } catch (error) {
      console.error('配置加载失败:', error);
      throw error;
    }
  }

  /**
   * 加载环境变量
   */
  private loadEnvironmentVariables(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('LLM_')) {
        const configKey = key.toLowerCase().replace(/^llm_/, '').replace(/_/g, '.');
        this.setNestedValue(this.config, configKey, this.parseValue(value));
      }
    }
  }

  /**
   * 加载配置文件
   */
  private async loadConfigFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.configPath);
      
      for (const file of files) {
        if (file.endsWith('.toml') || file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json')) {
          await this.loadConfigFile(path.join(this.configPath, file));
        }
      }
    } catch (error) {
      // 配置文件目录不存在时忽略错误
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 加载单个配置文件
   */
  private async loadConfigFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let config: Record<string, any> = {};
      
      if (filePath.endsWith('.toml')) {
        config = toml.parse(content);
      } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        config = yaml.parse(content);
      } else if (filePath.endsWith('.json')) {
        config = JSON.parse(content);
      }
      
      // 合并配置
      this.mergeConfig(config);
    } catch (error) {
      console.error(`加载配置文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 合并配置
   */
  private mergeConfig(newConfig: Record<string, any>): void {
    for (const [key, value] of Object.entries(newConfig)) {
      this.setNestedValue(this.config, key, value);
    }
  }

  /**
   * 解析值（字符串转换为适当类型）
   */
  private parseValue(value: string | undefined): any {
    if (value === undefined) return undefined;
    
    // 尝试解析为数字
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      const num = parseFloat(value);
      if (!isNaN(num)) return num;
    }
    
    // 尝试解析为布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // 返回字符串
    return value;
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, key: string): any {
    const keys = key.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (k && (!current[k] || typeof current[k] !== 'object')) {
        current[k] = {};
      }
      if (k) {
        current = current[k];
      }
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }

  /**
   * 删除嵌套值
   */
  private deleteNestedValue(obj: any, key: string): void {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!k || !current[k] || typeof current[k] !== 'object') {
        return;
      }
      current = current[k];
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      delete current[lastKey];
    }
  }

  /**
   * 扁平化对象
   */
  private flattenObject(obj: any, prefix = ''): string[] {
    const keys: string[] = [];
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          keys.push(...this.flattenObject(obj[key], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
    }
    
    return keys;
  }

  /**
   * 通知观察者
   */
  private notifyWatchers(key: string, newValue: any, oldValue: any): void {
    const watchers = this.watchers.get(key);
    if (watchers) {
      for (const callback of watchers) {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error(`配置观察者回调执行失败: ${key}`, error);
        }
      }
    }
  }
}