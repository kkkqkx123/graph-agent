/**
 * 简化的配置加载模块主类
 * 移除对RuleManager和Loaders的依赖，直接实现配置加载逻辑
 * 统一使用TOML格式，移除JSON和YAML支持以减少复杂度
 * 使用责任链模式处理配置
 */

import { IConfigDiscovery, ConfigFile, ValidationResult, ValidationSeverity } from './types';
import { ConfigDiscovery } from './discovery';
import { SchemaRegistry } from './schema-registry';
import { InheritanceProcessor } from '../processors/inheritance-processor';
import { EnvironmentProcessor } from '../processors/environment-processor';
import { IFileOrganizer, SplitFileOrganizer } from '../organizers';
import { ProcessorPipeline } from '../pipelines';
import { ILogger } from '../../../domain/common/types';
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

    this.logger.info('开始初始化配置加载模块', { basePath });

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
   */
  getAll(): Record<string, any> {
    if (!this.isInitialized) {
      throw new Error('配置加载模块尚未初始化');
    }

    return { ...this.configs };
  }

  /**
   * 检查配置键是否存在
   */
  has(key: string): boolean {
    if (!this.isInitialized) {
      return false;
    }

    return this.getNestedValue(this.configs, key) !== undefined;
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
