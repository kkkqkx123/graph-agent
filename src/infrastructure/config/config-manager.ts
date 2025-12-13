/**
 * 配置管理器实现
 */

import { EventEmitter } from '@shared/utils/event-emitter';
import {
  IConfigManager,
  IConfigSource,
  IConfigProcessor,
  IConfigValidator,
  IConfigCache,
  ConfigManagerConfig,
  ConfigValidationResult,
  ConfigValidationError
} from '@shared/types/config';
import { ILogger } from '@shared/types/logger';

/**
 * 配置管理器实现
 */
export class ConfigManager extends EventEmitter implements IConfigManager {
  private readonly sources: IConfigSource[] = [];
  private readonly processors: IConfigProcessor[] = [];
  private readonly validators: IConfigValidator[] = [];
  private readonly cache?: IConfigCache;
  private readonly logger: ILogger;
  private config: Record<string, any> = {};
  private watchers: Map<string, Set<(value: any) => void>> = new Map();
  private isInitialized = false;

  constructor(
    private readonly configManagerConfig: ConfigManagerConfig,
    logger: ILogger
  ) {
    super();
    this.logger = logger.child({ module: 'ConfigManager' });
  }

  /**
   * 初始化配置管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('正在初始化配置管理器...');

      // 初始化配置源
      await this.initializeSources();

      // 初始化处理器
      await this.initializeProcessors();

      // 初始化验证器
      await this.initializeValidators();

      // 加载配置
      await this.loadConfig();

      this.isInitialized = true;
      this.logger.info('配置管理器初始化完成');
    } catch (error) {
      this.logger.error('配置管理器初始化失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取配置值
   */
  get<T = any>(key: string, defaultValue?: T): T {
    if (!this.isInitialized) {
      throw new Error('配置管理器尚未初始化');
    }

    // 检查缓存
    if (this.cache && this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // 获取配置值
    const value = this.getNestedValue(this.config, key);

    // 设置缓存
    if (this.cache && value !== undefined) {
      this.cache.set(key, value);
    }

    return (value !== undefined ? value : defaultValue) as T;
  }

  /**
   * 设置配置值
   */
  set(key: string, value: any): void {
    if (!this.isInitialized) {
      throw new Error('配置管理器尚未初始化');
    }

    this.setNestedValue(this.config, key, value);

    // 更新缓存
    if (this.cache) {
      this.cache.set(key, value);
    }

    // 触发变更事件
    this.emit('change', key, value);
    this.emit(`change:${key}`, value);

    // 通知观察者
    const keyWatchers = this.watchers.get(key);
    if (keyWatchers) {
      keyWatchers.forEach(callback => callback(value));
    }
  }

  /**
   * 检查配置键是否存在
   */
  has(key: string): boolean {
    if (!this.isInitialized) {
      return false;
    }

    return this.getNestedValue(this.config, key) !== undefined;
  }

  /**
   * 删除配置键
   */
  delete(key: string): void {
    if (!this.isInitialized) {
      throw new Error('配置管理器尚未初始化');
    }

    this.deleteNestedValue(this.config, key);

    // 删除缓存
    if (this.cache) {
      this.cache.delete(key);
    }

    // 触发变更事件
    this.emit('change', key, undefined);
    this.emit(`change:${key}`, undefined);
  }

  /**
   * 获取所有配置
   */
  getAll(): Record<string, any> {
    if (!this.isInitialized) {
      throw new Error('配置管理器尚未初始化');
    }

    return { ...this.config };
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('配置管理器尚未初始化');
    }

    try {
      this.logger.info('正在重新加载配置...');

      // 清除缓存
      if (this.cache) {
        this.cache.clear();
      }

      // 重新加载配置
      await this.loadConfig();

      this.logger.info('配置重新加载完成');
      this.emit('reload');
    } catch (error) {
      this.logger.error('配置重新加载失败', error as Error);
      throw error;
    }
  }

  /**
   * 监听配置变更
   */
  watch(key: string, callback: (value: any) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }

    this.watchers.get(key)!.add(callback);

    // 返回取消监听的函数
    return () => {
      const keyWatchers = this.watchers.get(key);
      if (keyWatchers) {
        keyWatchers.delete(callback);
        if (keyWatchers.size === 0) {
          this.watchers.delete(key);
        }
      }
    };
  }

  /**
   * 取消监听配置变更
   */
  unwatch(key: string): void {
    this.watchers.delete(key);
  }

  /**
   * 初始化配置源
   */
  private async initializeSources(): Promise<void> {
    for (const _sourceConfig of this.configManagerConfig.sources) {
      // TODO: 根据配置创建配置源实例
      // const source = this.createConfigSource(sourceConfig);
      // this.sources.push(source);
    }

    // 按优先级排序
    this.sources.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 初始化处理器
   */
  private async initializeProcessors(): Promise<void> {
    // TODO: 根据配置创建处理器实例
  }

  /**
   * 初始化验证器
   */
  private async initializeValidators(): Promise<void> {
    // TODO: 根据配置创建验证器实例
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    let mergedConfig: Record<string, any> = {};

    // 从所有源加载配置
    for (const source of this.sources) {
      try {
        const sourceConfig = await source.load();
        mergedConfig = this.mergeConfigs(mergedConfig, sourceConfig);
      } catch (error) {
        this.logger.warn(`从配置源加载配置失败: ${source.type}`, { error });
      }
    }

    // 应用处理器
    for (const processor of this.processors) {
      try {
        mergedConfig = processor.process(mergedConfig);
      } catch (error) {
        this.logger.warn('配置处理失败', { error });
      }
    }

    // 验证配置
    const validationResult = await this.validateConfig(mergedConfig);
    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.map(e => `${e.path}: ${e.message}`);
      throw new Error(`配置验证失败:\n${errorMessages.join('\n')}`);
    }

    this.config = mergedConfig;
  }

  /**
   * 验证配置
   */
  private async validateConfig(config: Record<string, any>): Promise<ConfigValidationResult> {
    const errors: ConfigValidationError[] = [];

    for (const validator of this.validators) {
      try {
        const result = validator.validate(config);
        if (!result.isValid) {
          errors.push(...result.errors);
        }
      } catch (error) {
        errors.push({
          path: 'unknown',
          message: `验证器执行失败: ${(error as Error).message}`,
          code: 'VALIDATOR_ERROR'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 合并配置
   */
  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(result[key])) {
          result[key] = this.mergeConfigs(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || !this.isObject(current[key])) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * 删除嵌套值
   */
  private deleteNestedValue(obj: Record<string, any>, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      return current && current[key] ? current[key] : null;
    }, obj);

    if (target && target.hasOwnProperty(lastKey)) {
      delete target[lastKey];
    }
  }

  /**
   * 检查是否为对象
   */
  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}