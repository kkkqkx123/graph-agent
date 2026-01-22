/**
 * 简化的配置加载模块主类
 * 移除对RuleManager和Loaders的依赖，直接实现配置加载逻辑
 * 统一使用TOML格式，移除JSON和YAML支持以减少复杂度
 * 使用责任链模式处理配置
 */

import { IConfigDiscovery, ConfigFile, ValidationResult, ValidationSeverity } from './types';
import { ConfigChangeEvent } from './config-manager.interface';
import { ConfigDiscovery } from './discovery';
import { SchemaRegistry } from './schema-registry';
import { InheritanceProcessor } from '../processors/inheritance-processor';
import { EnvironmentProcessor } from '../processors/environment-processor';
import { IFileOrganizer, SplitFileOrganizer } from '../organizers';
import { ProcessorPipeline } from '../pipelines';
import { ILogger } from '../../../domain/common/types';
import { IConfigManager } from './config-manager.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseToml } from 'toml';
import { SCHEMA_MAP } from './schemas';

/**
 * 配置加载模块选项
 */
export interface ConfigLoadingModuleOptions {
  enableValidation?: boolean;
  validationSeverityThreshold?: 'error' | 'warning' | 'info';
}

/**
 * 配置加载模块主类
 * 实现 IConfigManager 接口，提供类型安全的配置访问
 */
export class ConfigLoadingModule implements IConfigManager {
  private readonly discovery: IConfigDiscovery;
  private readonly registry: SchemaRegistry;
  private readonly fileOrganizer: IFileOrganizer;
  private readonly processorPipeline: ProcessorPipeline;
  private readonly logger: ILogger;
  private readonly options: ConfigLoadingModuleOptions;
  private configs: Record<string, any> = {};
  private isInitialized = false;
  private basePath: string = '';
  private configVersion: string = '';
  private changeListeners: Map<string, Array<(newValue: any, oldValue: any) => void>> = new Map();

  constructor(logger: ILogger, options: ConfigLoadingModuleOptions = {}) {
    this.logger = logger.child({ module: 'ConfigLoadingModule' });
    this.options = {
      enableValidation: true,
      validationSeverityThreshold: 'error',
      ...options,
    };

    // 初始化组件
    this.discovery = new ConfigDiscovery({}, this.logger);
    this.registry = new SchemaRegistry(this.logger, SCHEMA_MAP);
    
    // 初始化文件组织器
    this.fileOrganizer = new SplitFileOrganizer(this.logger, {
      directoryMapping: {
        'pools': 'pools',
        'taskGroups': 'task_groups',
      },
    });
    
    // 初始化处理器管道
    this.processorPipeline = new ProcessorPipeline(this.logger);
    this.processorPipeline.addProcessor(new InheritanceProcessor({}, this.logger));
    this.processorPipeline.addProcessor(new EnvironmentProcessor({}, this.logger));
  }

  /**
   * 初始化并加载所有配置
   */
  async initialize(basePath: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.basePath = basePath;
    this.configVersion = this.generateVersion();
    this.logger.info('开始初始化配置加载模块', { basePath, version: this.configVersion });

    try {
      // 1. 发现所有配置文件
      const allFiles = await this.discovery.discoverConfigs(basePath);
      this.logger.debug('发现配置文件', { count: allFiles.length });

      // 2. 按模块类型分组
      const moduleFiles = this.groupByModuleType(allFiles);
      this.logger.debug('配置文件分组完成', {
        moduleTypes: Array.from(moduleFiles.keys()),
      });

      // 3. 加载各模块配置
      for (const [moduleType, files] of moduleFiles) {
        try {
          const moduleConfig = await this.loadModuleConfig(moduleType, files);
          this.configs[moduleType] = moduleConfig;

          // 验证配置
          if (this.options.enableValidation) {
            const validation = this.registry.validateConfig(moduleType, moduleConfig);
            this.handleValidationResult(validation, moduleType);
          }

          this.logger.debug('模块配置加载成功', { moduleType });
        } catch (error) {
          this.logger.error('模块配置加载失败', error as Error, { moduleType });
          // 继续处理其他模块
        }
      }

      this.isInitialized = true;
      this.logger.info('配置加载模块初始化完成', { version: this.configVersion });
    } catch (error) {
      this.logger.error('配置加载模块初始化失败', error as Error);
      throw error;
    }
  }

  /**
   * 加载特定模块配置
   *
   * 使用FileOrganizer组织文件，使用ProcessorPipeline处理配置
   */
  async loadModuleConfig(moduleType: string, files: ConfigFile[]): Promise<Record<string, any>> {
    this.logger.debug('加载模块配置', { moduleType, fileCount: files.length });

    // 按优先级排序
    const sortedFiles = files.sort((a, b) => b.priority - a.priority);

    // 1. 加载文件内容
    const loadedFiles = await this.loadFiles(sortedFiles);

    // 2. 使用FileOrganizer组织文件
    const organized = this.fileOrganizer.organize(loadedFiles);

    // 3. 使用ProcessorPipeline处理配置
    const processed = await this.processorPipeline.process(organized);

    return processed;
  }

  /**
   * 加载文件内容
   */
  private async loadFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    const loadedFiles: ConfigFile[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file.path, 'utf8');
        const parsed = this.parseContent(content, file.path);

        loadedFiles.push({
          ...file,
          metadata: {
            ...file.metadata,
            content: parsed,
          },
        });
      } catch (error) {
        this.logger.warn('配置文件加载失败，跳过', {
          path: file.path,
          error: (error as Error).message,
        });
      }
    }

    return loadedFiles;
  }

  /**
   * 获取配置值
   *
   * @template T - 返回值的类型
   * @param key - 配置键，支持点号分隔的嵌套路径
   * @param defaultValue - 默认值，当配置不存在时返回
   * @returns 配置值或默认值
   */
  get<T = any>(key: string, defaultValue?: T): T {
    if (!this.isInitialized) {
      throw new Error('配置加载模块尚未初始化');
    }

    const value = this.getNestedValue(this.configs, key);
    return (value !== undefined ? value : defaultValue) as T;
  }

  /**
   * 获取所有配置
   *
   * @returns 所有配置的浅拷贝对象
   */
  getAll(): Record<string, any> {
    if (!this.isInitialized) {
      throw new Error('配置加载模块尚未初始化');
    }

    return { ...this.configs };
  }

  /**
   * 检查配置键是否存在
   *
   * @param key - 配置键，支持点号分隔的嵌套路径
   * @returns 如果配置存在且不为 undefined，返回 true
   */
  has(key: string): boolean {
    if (!this.isInitialized) {
      return false;
    }

    return this.getNestedValue(this.configs, key) !== undefined;
  }

  /**
   * 设置配置值
   *
   * @param key - 配置键，支持点号分隔的嵌套路径
   * @param value - 要设置的值
   */
  set(key: string, value: any): void {
    if (!this.isInitialized) {
      throw new Error('配置加载模块尚未初始化');
    }

    const oldValue = this.get(key);
    const keys = key.split('.');
    let current = this.configs;

    // 遍历到倒数第二层
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (k === undefined) {
        throw new Error(`无效的配置键: ${key}`);
      }
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k] as Record<string, any>;
    }

    // 设置最后一层的值
    const lastKey = keys[keys.length - 1];
    if (lastKey === undefined) {
      throw new Error(`无效的配置键: ${key}`);
    }
    current[lastKey] = value;

    // 触发变更监听器
    this.notifyChange(key, value, oldValue);
  }

  /**
   * 注册配置变更监听器
   *
   * @param key - 配置键，支持点号分隔的嵌套路径和通配符
   * @param callback - 变更回调函数
   * @returns 取消监听的函数
   */
  onChange(key: string, callback: (newValue: any, oldValue: any) => void): () => void {
    if (!this.changeListeners.has(key)) {
      this.changeListeners.set(key, []);
    }
    this.changeListeners.get(key)!.push(callback);

    this.logger.debug('注册配置变更监听器', { key });

    // 返回取消监听的函数
    return () => {
      const listeners = this.changeListeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
          this.logger.debug('取消配置变更监听器', { key });
        }
      }
    };
  }

  /**
   * 刷新配置
   *
   * 重新加载配置文件，触发所有匹配的变更监听器
   */
  async refresh(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('配置加载模块尚未初始化');
    }

    this.logger.info('开始刷新配置');

    // 保存旧配置用于比较
    const oldConfigs = JSON.parse(JSON.stringify(this.configs));
    const oldVersion = this.configVersion;

    try {
      // 重新加载配置
      this.configs = {};
      this.isInitialized = false;
      await this.initialize(this.basePath);

      // 比较配置变更并触发监听器
      this.detectChanges(oldConfigs, this.configs);

      this.logger.info('配置刷新完成', {
        oldVersion,
        newVersion: this.configVersion,
      });
    } catch (error) {
      // 恢复旧配置
      this.configs = oldConfigs;
      this.isInitialized = true;
      this.configVersion = oldVersion;
      this.logger.error('配置刷新失败，已恢复旧配置', error as Error);
      throw error;
    }
  }

  /**
   * 获取配置版本
   *
   * @returns 配置版本号
   */
  getVersion(): string {
    return this.configVersion;
  }

  /**
   * 生成配置版本号
   */
  private generateVersion(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 通知配置变更
   */
  private notifyChange(key: string, newValue: any, oldValue: any): void {
    // 查找匹配的监听器
    for (const [pattern, listeners] of this.changeListeners.entries()) {
      if (this.matchPattern(pattern, key)) {
        for (const listener of listeners) {
          try {
            listener(newValue, oldValue);
          } catch (error) {
            this.logger.error('配置变更监听器执行失败', error as Error, { key, pattern });
          }
        }
      }
    }
  }

  /**
   * 检测配置变更
   */
  private detectChanges(oldConfigs: Record<string, any>, newConfigs: Record<string, any>): void {
    const allKeys = new Set([
      ...this.getAllKeys(oldConfigs),
      ...this.getAllKeys(newConfigs),
    ]);

    for (const key of allKeys) {
      const oldValue = this.getNestedValue(oldConfigs, key);
      const newValue = this.getNestedValue(newConfigs, key);

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        this.notifyChange(key, newValue, oldValue);
      }
    }
  }

  /**
   * 获取所有配置键
   */
  private getAllKeys(obj: Record<string, any>, prefix: string = ''): string[] {
    const keys: string[] = [];

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        keys.push(...this.getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  /**
   * 匹配通配符模式
   */
  private matchPattern(pattern: string, key: string): boolean {
    // 精确匹配
    if (pattern === key) {
      return true;
    }

    // 通配符匹配
    const patternParts = pattern.split('.');
    const keyParts = key.split('.');

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const keyPart = keyParts[i];

      if (patternPart === '*') {
        continue;
      }

      if (patternPart !== keyPart) {
        return false;
      }
    }

    return true;
  }

  /**
   * 重新加载配置
   */
  async reload(basePath: string): Promise<void> {
    this.logger.info('重新加载配置');
    this.configs = {};
    this.isInitialized = false;
    await this.initialize(basePath);
  }

  /**
   * 获取已注册的模块类型
   */
  getRegisteredModuleTypes(): string[] {
    return this.registry.getRegisteredTypes();
  }

  /**
   * 按模块类型分组配置文件
   */
  private groupByModuleType(files: ConfigFile[]): Map<string, ConfigFile[]> {
    const groups = new Map<string, ConfigFile[]>();

    for (const file of files) {
      if (!groups.has(file.moduleType)) {
        groups.set(file.moduleType, []);
      }
      groups.get(file.moduleType)!.push(file);
    }

    return groups;
  }

  /**
   * 处理验证结果
   */
  private handleValidationResult(validation: ValidationResult, moduleType: string): void {
    if (!validation.isValid) {
      const logLevel = this.getLogLevelForSeverity(validation.severity);

      this.logger[logLevel]('配置验证失败', undefined, {
        moduleType: moduleType,
        severity: validation.severity,
        errorCount: validation.errors.length,
        errors: validation.errors.slice(0, 5),
      });

      // 如果严重性超过阈值，抛出错误
      if (this.isSeverityAboveThreshold(validation.severity)) {
        const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`);
        throw new Error(`配置验证失败（${validation.severity}）:\n${errorMessages.join('\n')}`);
      }
    }
  }

  /**
   * 检查严重性是否超过阈值
   */
  private isSeverityAboveThreshold(severity: ValidationSeverity): boolean {
    const severityLevels = { error: 3, warning: 2, info: 1, success: 0 };
    const thresholdLevels = { error: 3, warning: 2, info: 1 };

    const currentLevel = severityLevels[severity];
    const thresholdLevel = thresholdLevels[this.options.validationSeverityThreshold || 'error'];

    return currentLevel >= thresholdLevel;
  }

  /**
   * 根据严重性获取日志级别
   */
  private getLogLevelForSeverity(
    severity: ValidationSeverity
  ): 'error' | 'warn' | 'info' | 'debug' {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warn';
      case 'info':
        return 'info';
      default:
        return 'debug';
    }
  }

  /**
   * 解析文件内容
   *
   * 统一使用TOML格式，移除JSON和YAML支持
   */
  private parseContent(content: string, filePath: string): Record<string, any> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext !== '.toml') {
      throw new Error(`不支持的配置文件格式: ${ext}，仅支持TOML格式`);
    }

    try {
      return parseToml(content);
    } catch (error) {
      throw new Error(`解析配置文件失败 ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}
