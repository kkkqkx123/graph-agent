/**
 * 简化的配置加载模块主类
 * 移除对RuleManager和Loaders的依赖，直接实现配置加载逻辑
 * 统一使用TOML格式，移除JSON和YAML支持以减少复杂度
 * 使用责任链模式处理配置
 */

import { IConfigDiscovery, ConfigFile, ValidationResult } from './types';
import { ConfigDiscovery } from './discovery';
import { SchemaRegistry } from './schema-registry';
import { InheritanceProcessor } from '../processors/inheritance-processor';
import { EnvironmentProcessor } from '../processors/environment-processor';
import { IFileOrganizer, SplitFileOrganizer } from '../organizers';
import { ProcessorPipeline } from '../pipelines';
import { ILogger, IConfigProcessor } from '../../../domain/common/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseToml } from 'toml';
import { SCHEMA_MAP } from './schemas';
import { ConfigurationError, InvalidConfigurationError, ValidationError } from '../../../common/exceptions';

/**
 * 配置加载模块选项
 */
export interface ConfigLoadingModuleOptions {
  enableValidation?: boolean;
  enableCache?: boolean;
  cacheTTL?: number; // 缓存过期时间（毫秒）
}

/**
 * 配置加载模块主类
 * 提供类型安全的配置访问
 */
export class ConfigLoadingModule {
  private readonly discovery: IConfigDiscovery;
  private readonly registry: SchemaRegistry;
  private readonly fileOrganizer: IFileOrganizer;
  private readonly processorPipeline: ProcessorPipeline;
  private readonly logger: ILogger;
  private readonly options: ConfigLoadingModuleOptions;
  private configs: Record<string, any> = {};
  private isInitialized = false;
  private basePath: string = '';
  private configCache: Map<string, { config: any; timestamp: number }> = new Map();

  constructor(logger: ILogger, options: ConfigLoadingModuleOptions = {}) {
    this.logger = logger;
    this.options = {
      enableValidation: true,
      enableCache: true,
      cacheTTL: 5 * 60 * 1000, // 默认5分钟
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
    // InheritanceProcessor将在initialize时创建并设置basePath
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
    this.logger.info('开始初始化配置加载模块', { basePath });

    // 创建并添加InheritanceProcessor（需要basePath）
    const inheritanceProcessor = new InheritanceProcessor({}, this.logger, basePath);
    this.processorPipeline.addProcessor(inheritanceProcessor);

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
      this.logger.info('配置加载模块初始化完成');
    } catch (error) {
      this.logger.error('配置加载模块初始化失败', error as Error);
      throw error;
    }
  }

  /**
   * 加载特定模块配置
   *
   * 使用FileOrganizer组织文件，使用ProcessorPipeline处理配置
   * 添加预验证机制，在加载前验证配置文件
   * 添加缓存机制，避免重复加载
   */
  async loadModuleConfig(moduleType: string, files: ConfigFile[]): Promise<Record<string, any>> {
    this.logger.debug('加载模块配置', { moduleType, fileCount: files.length });

    // 生成缓存键
    const cacheKey = this.generateCacheKey(moduleType, files);

    // 检查缓存
    if (this.options.enableCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.logger.debug('从缓存加载模块配置', { moduleType, cacheKey });
        return cached;
      }
    }

    // 按优先级排序
    const sortedFiles = files.sort((a, b) => b.priority - a.priority);

    // 1. 预验证文件（如果启用验证）
    if (this.options.enableValidation) {
      const validatedFiles = await this.preValidateFiles(moduleType, sortedFiles);
      if (validatedFiles.length === 0) {
        throw new InvalidConfigurationError(moduleType, `模块 ${moduleType} 没有有效的配置文件`);
      }
      sortedFiles.length = 0;
      sortedFiles.push(...validatedFiles);
    }

    // 2. 加载文件内容
    const loadedFiles = await this.loadFiles(sortedFiles);

    // 3. 使用FileOrganizer组织文件
    const organized = this.fileOrganizer.organize(loadedFiles);

    // 4. 使用ProcessorPipeline处理配置
    const processed = await this.processorPipeline.process(organized);

    // 5. 最终验证处理后的配置
    if (this.options.enableValidation) {
      const validation = this.registry.validateConfig(moduleType, processed);
      if (!validation.isValid) {
        this.handleValidationResult(validation, moduleType);
      }
    }

    // 缓存结果
    if (this.options.enableCache) {
      this.addToCache(cacheKey, processed);
      this.logger.debug('模块配置已缓存', { moduleType, cacheKey });
    }

    return processed;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(moduleType: string, files: ConfigFile[]): string {
    const fileHash = files
      .map(f => `${f.path}:${f.priority}`)
      .sort()
      .join('|');
    return `${moduleType}:${fileHash}`;
  }

  /**
   * 从缓存获取配置
   */
  private getFromCache(cacheKey: string): any | null {
    const cached = this.configCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // 检查缓存是否过期
    const now = Date.now();
    const ttl = this.options.cacheTTL || 5 * 60 * 1000;
    if (now - cached.timestamp > ttl) {
      this.configCache.delete(cacheKey);
      this.logger.debug('缓存已过期', { cacheKey });
      return null;
    }

    return cached.config;
  }

  /**
   * 添加配置到缓存
   */
  private addToCache(cacheKey: string, config: any): void {
    this.configCache.set(cacheKey, {
      config: this.deepClone(config),
      timestamp: Date.now(),
    });

    // 限制缓存大小（最多缓存100个配置）
    if (this.configCache.size > 100) {
      // 删除最旧的缓存项
      const oldestKey = this.configCache.keys().next().value;
      if (oldestKey) {
        this.configCache.delete(oldestKey);
        this.logger.debug('缓存已满，删除最旧的缓存项', { cacheKey: oldestKey });
      }
    }
  }

  /**
   * 预验证配置文件
   * 在加载前验证文件的基本结构和语法
   * 改进错误处理，收集所有验证失败的文件
   */
  private async preValidateFiles(moduleType: string, files: ConfigFile[]): Promise<ConfigFile[]> {
    const validFiles: ConfigFile[] = [];
    const invalidFiles: Array<{ path: string; error: string }> = [];

    for (const file of files) {
      try {
        // 读取文件内容
        const content = await fs.readFile(file.path, 'utf8');

        // 尝试解析TOML
        const parsed = this.parseContent(content, file.path);

        // 基本结构验证
        if (!parsed || typeof parsed !== 'object') {
          this.logger.warn('配置文件解析结果无效', { path: file.path });
          invalidFiles.push({ path: file.path, error: '解析结果不是有效的对象' });
          continue;
        }

        // 添加到有效文件列表
        validFiles.push({
          ...file,
          metadata: {
            ...file.metadata,
            content: parsed,
          },
        });

        this.logger.debug('配置文件预验证通过', { path: file.path });
      } catch (error) {
        const errorMessage = (error as Error).message;
        this.logger.warn('配置文件预验证失败', {
          path: file.path,
          error: errorMessage,
        });
        invalidFiles.push({ path: file.path, error: errorMessage });
      }
    }

    // 如果有文件验证失败，记录详细信息
    if (invalidFiles.length > 0) {
      this.logger.warn('模块配置文件预验证结果', {
        moduleType,
        total: files.length,
        valid: validFiles.length,
        invalid: invalidFiles.length,
        invalidFiles: invalidFiles.map(f => f.path),
      });
    }

    return validFiles;
  }

  /**
   * 加载文件内容
   * 改进错误处理，收集所有加载失败的文件
   */
  private async loadFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    const loadedFiles: ConfigFile[] = [];
    const failedFiles: Array<{ path: string; error: string }> = [];

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
        const errorMessage = (error as Error).message;
        this.logger.warn('配置文件加载失败', {
          path: file.path,
          error: errorMessage,
        });
        failedFiles.push({ path: file.path, error: errorMessage });
      }
    }

    // 如果所有文件都加载失败，抛出错误
    if (loadedFiles.length === 0 && failedFiles.length > 0) {
      const errorSummary = failedFiles.map(f => `  - ${f.path}: ${f.error}`).join('\n');
      throw new ConfigurationError(`所有配置文件加载失败:\n${errorSummary}`);
    }

    // 如果有部分文件加载失败，记录警告
    if (failedFiles.length > 0) {
      this.logger.warn('部分配置文件加载失败', {
        total: files.length,
        success: loadedFiles.length,
        failed: failedFiles.length,
        failedFiles: failedFiles.map(f => f.path),
      });
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
      throw new ConfigurationError('配置加载模块尚未初始化');
    }

    const value = this.getNestedValue(this.configs, key);
    return (value !== undefined ? value : defaultValue) as T;
  }

  /**
   * 获取所有配置
   *
   * @returns 所有配置的副本
   */
  getAllConfigs(): Record<string, any> {
    if (!this.isInitialized) {
      throw new ConfigurationError('配置加载模块尚未初始化');
    }
    return this.deepClone(this.configs);
  }

  /**
   * 刷新配置
   *
   * 重新加载配置文件，清空缓存
   * 支持热更新，无需重启应用
   */
  async refresh(): Promise<void> {
    if (!this.isInitialized) {
      throw new ConfigurationError('配置加载模块尚未初始化');
    }

    this.logger.info('开始刷新配置');

    // 清空缓存
    this.configCache.clear();

    // 重新加载配置
    await this.initialize(this.basePath);

    this.logger.info('配置刷新完成');
  }

  /**
   * 深度克隆对象
   * 用于配置缓存
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * 解析文件内容
   *
   * 统一使用TOML格式，移除JSON和YAML支持
   */
  private parseContent(content: string, filePath: string): Record<string, any> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext !== '.toml') {
      throw new InvalidConfigurationError('format', `不支持的配置文件格式: ${ext}，仅支持TOML格式`);
    }

    try {
      return parseToml(content);
    } catch (error) {
      throw new InvalidConfigurationError('content', `解析配置文件失败 ${filePath}: ${(error as Error).message}`);
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
      this.logger.error('配置验证失败', undefined, {
        moduleType: moduleType,
        severity: validation.severity,
        errorCount: validation.errors.length,
        errors: validation.errors.slice(0, 5),
      });

      const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`);
      throw new ValidationError(`配置验证失败（${validation.severity}）:\n${errorMessages.join('\n')}`);
    }
  }
}