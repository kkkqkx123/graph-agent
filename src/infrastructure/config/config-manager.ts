/**
 * 配置管理器实现
 */

import { EventEmitter } from '../common/utils';
import {
  IConfigManager,
  IConfigSource,
  IConfigProcessor,
  IConfigValidator,
  IConfigCache,
  ConfigManagerConfig,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigSourceType,
  ConfigProcessorConfig,
  ConfigValidatorConfig,
  FileConfigSourceOptions,
  EnvironmentConfigSourceOptions,
  RemoteConfigSourceOptions,
  EnvironmentProcessorOptions,
  InheritanceProcessorOptions,
  SchemaValidatorOptions,
  BusinessValidatorOptions
} from '../../domain/common/types';
import { ILogger } from '../../domain/common/types';

// 导入配置源实现
import { FileConfigSource } from './sources/file-source';
import { EnvironmentConfigSource } from './sources/environment-source';
import { MemoryConfigSource, MemoryConfigSourceOptions } from './sources/memory-source';

// 导入配置处理器实现
import { EnvironmentProcessor } from './processors/environment-processor';
import { InheritanceProcessor } from './processors/inheritance-processor';

// 导入配置验证器实现
import { SchemaValidator } from './validators/schema-validator';
import { BusinessValidator } from './validators/business-validator';

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
    for (const sourceConfig of this.configManagerConfig.sources) {
      try {
        const source = this.createConfigSource(sourceConfig);
        this.sources.push(source);
        this.logger.debug('配置源初始化成功', { type: sourceConfig.type, priority: sourceConfig.priority });
      } catch (error) {
        this.logger.error(`配置源初始化失败: ${(error as Error).message}, 类型: ${sourceConfig.type}`);
      }
    }

    // 按优先级排序
    this.sources.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 创建配置源实例
   */
  private createConfigSource(sourceConfig: any): IConfigSource {
    switch (sourceConfig.type) {
      case ConfigSourceType.FILE:
        return new FileConfigSource(
          sourceConfig.options as FileConfigSourceOptions,
          sourceConfig.priority,
          this.logger
        );
      
      case ConfigSourceType.ENVIRONMENT:
        return new EnvironmentConfigSource(
          sourceConfig.options as EnvironmentConfigSourceOptions,
          sourceConfig.priority,
          this.logger
        );
      
      case ConfigSourceType.MEMORY:
        return new MemoryConfigSource(
          sourceConfig.options as MemoryConfigSourceOptions,
          sourceConfig.priority,
          this.logger
        );
      
      case ConfigSourceType.REMOTE:
        // TODO: 实现远程配置源
        throw new Error('远程配置源尚未实现');
      
      default:
        throw new Error(`不支持的配置源类型: ${sourceConfig.type}`);
    }
  }

  /**
   * 初始化处理器
   */
  private async initializeProcessors(): Promise<void> {
    if (!this.configManagerConfig.processors) {
      return;
    }

    for (const processorConfig of this.configManagerConfig.processors) {
      try {
        const processor = this.createConfigProcessor(processorConfig);
        this.processors.push(processor);
        this.logger.debug('配置处理器初始化成功', { type: processorConfig.type });
      } catch (error) {
        this.logger.error(`配置处理器初始化失败: ${(error as Error).message}, 类型: ${processorConfig.type}`);
      }
    }
  }

  /**
   * 创建配置处理器实例
   */
  private createConfigProcessor(processorConfig: ConfigProcessorConfig): IConfigProcessor {
    switch (processorConfig.type) {
      case 'environment':
        return new EnvironmentProcessor(
          processorConfig.options as EnvironmentProcessorOptions,
          this.logger
        );
      
      case 'inheritance':
        return new InheritanceProcessor(
          processorConfig.options as InheritanceProcessorOptions,
          this.logger
        );
      
      case 'transformation':
        // TODO: 实现转换处理器
        throw new Error('转换处理器尚未实现');
      
      case 'custom':
        // TODO: 实现自定义处理器
        throw new Error('自定义处理器尚未实现');
      
      default:
        throw new Error(`不支持的配置处理器类型: ${processorConfig.type}`);
    }
  }

  /**
   * 初始化验证器
   */
  private async initializeValidators(): Promise<void> {
    if (!this.configManagerConfig.validators) {
      return;
    }

    for (const validatorConfig of this.configManagerConfig.validators) {
      try {
        const validator = this.createConfigValidator(validatorConfig);
        this.validators.push(validator);
        this.logger.debug('配置验证器初始化成功', { type: validatorConfig.type });
      } catch (error) {
        this.logger.error(`配置验证器初始化失败: ${(error as Error).message}, 类型: ${validatorConfig.type}`);
      }
    }
  }

  /**
   * 创建配置验证器实例
   */
  private createConfigValidator(validatorConfig: ConfigValidatorConfig): IConfigValidator {
    switch (validatorConfig.type) {
      case 'schema':
        return new SchemaValidator(
          validatorConfig.options as SchemaValidatorOptions,
          this.logger
        );
      
      case 'business':
        return new BusinessValidator(
          validatorConfig.options as BusinessValidatorOptions,
          this.logger
        );
      
      case 'custom':
        // TODO: 实现自定义验证器
        throw new Error('自定义验证器尚未实现');
      
      default:
        throw new Error(`不支持的配置验证器类型: ${validatorConfig.type}`);
    }
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
