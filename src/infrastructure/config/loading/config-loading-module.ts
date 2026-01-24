/**
 * 简化的配置加载模块主类
 * 移除冗余逻辑，使用统一的服务层
 */

import { IConfigDiscovery, ConfigFile } from './types';
import { ConfigDiscovery } from './discovery';
import { SchemaRegistry } from './schema-registry';
import { InheritanceProcessor } from '../processors/inheritance-processor';
import { EnvironmentProcessor } from '../processors/environment-processor';
import { IFileOrganizer, SplitFileOrganizer } from '../organizers';
import { ProcessorPipeline } from '../pipelines';
import { ILogger } from '../../../domain/common/types';
import { ConfigFileService } from '../services/config-file-service';
import { ConfigCacheManager } from '../services/config-cache-manager';
import { ConfigValidator } from '../services/config-validator';
import { SCHEMA_MAP } from './schemas';
import { ConfigurationError } from '../../../domain/common/exceptions';

/**
 * 配置加载模块选项
 */
export interface ConfigLoadingModuleOptions {
  enableValidation?: boolean;
  enableCache?: boolean;
  cacheTTL?: number;
  maxCacheSize?: number;
}

/**
 * 配置加载模块主类
 * 提供类型安全的配置访问
 */
export class ConfigLoadingModule {
  private readonly discovery: IConfigDiscovery;
  private readonly fileOrganizer: IFileOrganizer;
  private readonly processorPipeline: ProcessorPipeline;
  private readonly fileService: ConfigFileService;
  private readonly cacheManager: ConfigCacheManager;
  private readonly validator: ConfigValidator;
  private readonly logger: ILogger;
  private readonly options: Required<ConfigLoadingModuleOptions>;
  private configs: Record<string, any> = {};
  private isInitialized = false;
  private basePath: string = '';

  constructor(logger: ILogger, options: ConfigLoadingModuleOptions = {}) {
    this.logger = logger;
    this.options = {
      enableValidation: options.enableValidation ?? true,
      enableCache: options.enableCache ?? true,
      cacheTTL: options.cacheTTL ?? 5 * 60 * 1000,
      maxCacheSize: options.maxCacheSize ?? 100,
    };

    // 初始化服务层
    this.fileService = new ConfigFileService(logger, ['.toml']);
    this.cacheManager = new ConfigCacheManager(logger, {
      maxSize: this.options.maxCacheSize,
      defaultTTL: this.options.cacheTTL,
    });

    // 初始化Schema注册表
    const schemaRegistry = new SchemaRegistry(this.logger, SCHEMA_MAP);

    // 初始化验证器
    this.validator = new ConfigValidator(
      this.logger,
      schemaRegistry,
      this.fileService,
      {
        enableSyntaxValidation: this.options.enableValidation,
        enableSchemaValidation: this.options.enableValidation,
        failOnSyntaxError: true,
        failOnSchemaError: true,
      }
    );

    // 初始化组件
    this.discovery = new ConfigDiscovery({}, this.logger);

    // 初始化文件组织器
    this.fileOrganizer = new SplitFileOrganizer(this.logger, {
      directoryMapping: {
        'pools': 'pools',
        'taskGroups': 'task_groups',
      },
    });

    // 初始化处理器管道
    this.processorPipeline = new ProcessorPipeline(this.logger);
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
          this.logger.debug('模块配置加载成功', { moduleType });
        } catch (error) {
          this.logger.error('模块配置加载失败', error as Error, { moduleType });
          throw error; // 改为抛出错误，而不是继续处理
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
   * 使用统一的服务层处理文件操作、缓存和验证
   */
  async loadModuleConfig(moduleType: string, files: ConfigFile[]): Promise<Record<string, any>> {
    this.logger.debug('加载模块配置', { moduleType, fileCount: files.length });

    // 生成缓存键
    const cacheKey = ConfigCacheManager.generateCacheKeyFromConfigFiles(
      moduleType,
      files.map(f => ({ path: f.path, priority: f.priority }))
    );

    // 检查缓存
    if (this.options.enableCache) {
      const cached = this.cacheManager.get<Record<string, any>>(cacheKey);
      if (cached) {
        this.logger.debug('从缓存加载模块配置', { moduleType, cacheKey });
        return cached;
      }
    }

    // 按优先级排序
    const sortedFiles = files.sort((a, b) => b.priority - a.priority);

    // 读取并解析文件内容
    const loadedFiles = await this.fileService.readAndParseBatch(sortedFiles);

    // 更新文件对象的metadata
    const filesWithContent = loadedFiles.map(({ file, content }) => ({
      ...file,
      metadata: {
        ...file.metadata,
        content,
      },
    }));

    // 使用FileOrganizer组织文件
    const organized = this.fileOrganizer.organize(filesWithContent);

    // 使用ProcessorPipeline处理配置
    const processed = await this.processorPipeline.process(organized);

    // 统一验证（语法和Schema）
    await this.validator.validateModuleConfig(moduleType, sortedFiles, processed);

    // 缓存结果
    if (this.options.enableCache) {
      this.cacheManager.set(cacheKey, processed);
      this.logger.debug('模块配置已缓存', { moduleType, cacheKey });
    }

    return processed;
  }

  /**
   * 获取配置值（返回引用）
   */
  get<T = any>(key: string, defaultValue?: T): T {
    if (!this.isInitialized) {
      throw new ConfigurationError('配置加载模块尚未初始化');
    }

    const value = this.getNestedValue(this.configs, key);
    return (value !== undefined ? value : defaultValue) as T;
  }

  /**
   * 获取所有配置（返回引用）
   */
  getAllConfigs(): Record<string, any> {
    if (!this.isInitialized) {
      throw new ConfigurationError('配置加载模块尚未初始化');
    }
    return this.configs;
  }

  /**
   * 获取模块配置（返回引用）
   */
  getModuleConfig(moduleType: string): Record<string, any> | undefined {
    if (!this.isInitialized) {
      throw new ConfigurationError('配置加载模块尚未初始化');
    }
    return this.configs[moduleType];
  }

  /**
   * 刷新配置
   */
  async refresh(): Promise<void> {
    if (!this.isInitialized) {
      throw new ConfigurationError('配置加载模块尚未初始化');
    }

    this.logger.info('开始刷新配置');
    this.cacheManager.clear();
    this.configs = {};
    await this.initialize(this.basePath);
    this.logger.info('配置刷新完成');
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

}
