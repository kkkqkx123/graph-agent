/**
 * 配置加载模块主类
 */

import { IConfigDiscovery, IModuleLoader, IDependencyResolver, ITypeRegistry, ILoadingCache, IModuleRule, ConfigFile, ModuleConfig, ValidationResult, PreValidationResult, ValidationSeverity } from './types';
import { ConfigDiscovery } from './discovery';
import { DependencyResolver } from './dependency-resolver';
import { TypeRegistry } from './type-registry';
import { LoadingCache } from './loading-cache';
import { RuleManager } from './rules/rule-manager';
import { ILogger } from '../../../domain/common/types';

/**
 * 配置加载模块选项
 */
export interface ConfigLoadingModuleOptions {
  cacheTTL?: number;
  enableCache?: boolean;
  enableValidation?: boolean;
  enablePreValidation?: boolean;
  validationSeverityThreshold?: 'error' | 'warning' | 'info';
}

/**
 * 配置加载模块主类
 */
export class ConfigLoadingModule {
  private readonly discovery: IConfigDiscovery;
  private readonly resolver: IDependencyResolver;
  private readonly registry: ITypeRegistry;
  private readonly cache: ILoadingCache;
  private readonly loaders: Map<string, IModuleLoader> = new Map();
  private readonly rules: Map<string, IModuleRule> = new Map();
  private readonly logger: ILogger;
  private readonly options: ConfigLoadingModuleOptions;

  constructor(
    logger: ILogger,
    options: ConfigLoadingModuleOptions = {}
  ) {
    this.logger = logger.child({ module: 'ConfigLoadingModule' });
    this.options = {
      cacheTTL: 300000, // 5分钟
      enableCache: true,
      enableValidation: true,
      enablePreValidation: true,
      validationSeverityThreshold: 'error',
      ...options
    };

    // 初始化组件
    this.discovery = new ConfigDiscovery({}, this.logger);
    this.resolver = new DependencyResolver(this.logger);
    this.registry = new TypeRegistry(this.logger);
    this.cache = new LoadingCache(this.options.cacheTTL, this.logger);
  }

  /**
   * 注册模块规则
   */
  registerModuleRule(rule: IModuleRule): void {
    this.logger.debug('注册模块规则', { moduleType: rule.moduleType });

    this.loaders.set(rule.moduleType, rule.loader);
    this.rules.set(rule.moduleType, rule);

    // 使用新的Schema注册方法
    this.registry.registerSchema(rule.moduleType, rule.schema, '1.0.0', `${rule.moduleType}模块配置Schema`);
  }

  /**
   * 批量注册模块规则
   */
  registerModuleRules(rules: IModuleRule[]): void {
    for (const rule of rules) {
      this.registerModuleRule(rule);
    }
  }

  /**
   * 加载所有配置
   */
  async loadAllConfigs(basePath: string): Promise<Record<string, any>> {
    this.logger.info('开始加载所有配置', { basePath });

    try {
      // 检查缓存
      if (this.options.enableCache) {
        const cached = this.cache.getAllConfigs();
        if (cached) {
          this.logger.info('从缓存加载配置');
          return cached;
        }
      }

      // 1. 发现所有配置文件
      const allFiles = await this.discovery.discoverConfigs(basePath);
      this.logger.debug('发现配置文件', { count: allFiles.length });

      // 2. 按模块类型分组
      const moduleFiles = this.groupByModuleType(allFiles);
      this.logger.debug('配置文件分组完成', {
        moduleTypes: Array.from(moduleFiles.keys())
      });

      // 3. 预验证配置文件
      const preValidationResults = await this.preValidateFiles(moduleFiles);

      // 4. 根据预验证结果决定是否继续加载
      const shouldContinue = this.shouldContinueAfterPreValidation(preValidationResults);
      if (!shouldContinue) {
        throw new Error('配置预验证失败，停止加载流程');
      }

      // 5. 加载各模块配置
      const modules = new Map<string, ModuleConfig>();

      for (const [moduleType, files] of moduleFiles) {
        const loader = this.loaders.get(moduleType);
        if (loader) {
          try {
            const moduleConfig = await loader.loadModule(files);

            // 验证配置
            if (this.options.enableValidation) {
              const validation = this.registry.validateConfig(moduleType, moduleConfig.configs);
              this.handleValidationResult(validation, moduleType);
            }

            modules.set(moduleType, moduleConfig);
            this.logger.debug('模块配置加载成功', { moduleType });
          } catch (error) {
            this.logger.error('模块配置加载失败', error as Error);
            // 继续处理其他模块
          }
        } else {
          this.logger.warn('未找到模块加载器', { moduleType });
        }
      }

      // 6. 解析依赖关系并生成加载顺序
      const loadingOrder = await this.resolver.resolveDependencies(modules);
      this.logger.debug('依赖关系解析完成', {
        orderedModules: loadingOrder.orderedModules
      });

      // 7. 按顺序合并配置
      const result = await this.mergeInOrder(modules, loadingOrder);

      // 8. 缓存结果
      if (this.options.enableCache) {
        await this.cache.store(result);
      }

      this.logger.info('配置加载完成', {
        moduleCount: modules.size,
        modules: Array.from(modules.keys())
      });

      return result;
    } catch (error) {
      this.logger.error('配置加载失败', error as Error);
      throw error;
    }
  }

  /**
   * 加载特定模块配置
   */
  async loadModuleConfig(moduleType: string, basePath: string): Promise<Record<string, any>> {
    this.logger.debug('加载模块配置', { moduleType, basePath });

    // 检查缓存
    if (this.options.enableCache) {
      const cached = this.cache.getModuleConfig(moduleType);
      if (cached) {
        this.logger.debug('从缓存加载模块配置', { moduleType });
        return cached;
      }
    }

    const loader = this.loaders.get(moduleType);
    if (!loader) {
      throw new Error(`未找到模块类型 ${moduleType} 的加载器`);
    }

    try {
      // 发现模块配置文件
      const moduleFiles = await this.discovery.discoverModuleConfigs(
        `${basePath}/${moduleType}`,
        moduleType
      );

      // 加载模块配置
      const moduleConfig = await loader.loadModule(moduleFiles);

      // 验证配置
      if (this.options.enableValidation) {
        const validation = this.registry.validateConfig(moduleType, moduleConfig.configs);
        if (!validation.isValid) {
          this.logger.warn('模块配置验证失败', {
            moduleType,
            errors: validation.errors
          });
        }
      }

      // 缓存结果
      if (this.options.enableCache) {
        this.cache.setModuleConfig(moduleType, moduleConfig.configs);
      }

      this.logger.debug('模块配置加载完成', { moduleType });
      return moduleConfig.configs;
    } catch (error) {
      this.logger.error('模块配置加载失败', error as Error);
      throw error;
    }
  }

  /**
   * 重新加载配置
   */
  async reloadConfigs(basePath: string): Promise<Record<string, any>> {
    this.logger.info('重新加载配置');

    // 清空缓存
    if (this.options.enableCache) {
      this.cache.clear();
    }

    return this.loadAllConfigs(basePath);
  }

  /**
   * 获取已注册的模块类型
   */
  getRegisteredModuleTypes(): string[] {
    return Array.from(this.loaders.keys());
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): any {
    return this.cache.getStats();
  }

  /**
   * 清理缓存
   */
  cleanupCache(): number {
    return this.cache.cleanup();
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
   * 按顺序合并配置
   */
  private async mergeInOrder(
    modules: Map<string, ModuleConfig>,
    order: { orderedModules: string[] }
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const moduleName of order.orderedModules) {
      const module = modules.get(moduleName);
      if (module) {
        result[moduleName] = module.configs;
      }
    }

    return result;
  }

  /**
   * 预验证配置文件
   */
  private async preValidateFiles(moduleFiles: Map<string, ConfigFile[]>): Promise<Map<string, PreValidationResult>> {
    const results = new Map<string, PreValidationResult>();

    if (!this.options.enablePreValidation) {
      return results;
    }

    for (const [moduleType, files] of moduleFiles) {
      try {
        // 对每个文件进行基础验证
        const fileResults = await Promise.all(
          files.map(async file => {
            const content = await this.readFileContent(file.path);
            const parsed = await this.parseContent(content, file.path);
            return this.registry.preValidate(parsed, moduleType);
          })
        );

        // 合并文件验证结果
        const combinedResult = this.combinePreValidationResults(fileResults);
        results.set(moduleType, combinedResult);

        this.logger.debug('预验证完成', { moduleType, isValid: combinedResult.isValid });
      } catch (error) {
        this.logger.error('预验证失败', error as Error);
        results.set(moduleType, {
          isValid: false,
          errors: [`预验证执行失败: ${(error as Error).message}`],
          severity: 'error'
        });
      }
    }

    return results;
  }

  /**
   * 根据预验证结果决定是否继续加载
   */
  private shouldContinueAfterPreValidation(results: Map<string, PreValidationResult>): boolean {
    if (!this.options.enablePreValidation) {
      return true;
    }

    for (const [moduleType, result] of results) {
      if (!result.isValid && this.isSeverityAboveThreshold(result.severity)) {
        this.logger.error('预验证失败，停止加载', undefined, {
          moduleType: moduleType,
          severity: result.severity,
          errors: result.errors
        });
        return false;
      }
    }

    return true;
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
        errors: validation.errors.slice(0, 5)
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
  private getLogLevelForSeverity(severity: ValidationSeverity): 'error' | 'warn' | 'info' | 'debug' {
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
   * 合并预验证结果
   */
  private combinePreValidationResults(results: PreValidationResult[]): PreValidationResult {
    const allErrors: string[] = [];
    let maxSeverity: ValidationSeverity = 'success';

    for (const result of results) {
      allErrors.push(...result.errors);

      // 更新最高严重性
      const severityLevels = { error: 3, warning: 2, info: 1, success: 0 };
      if (severityLevels[result.severity] > severityLevels[maxSeverity]) {
        maxSeverity = result.severity;
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      severity: maxSeverity
    };
  }

  /**
   * 读取文件内容
   */
  private async readFileContent(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    return fs.readFile(filePath, 'utf8');
  }

  /**
   * 解析文件内容
   */
  private async parseContent(content: string, filePath: string): Promise<Record<string, any>> {
    const path = await import('path');
    const ext = path.extname(filePath).toLowerCase();

    try {
      switch (ext) {
        case '.toml':
          const { parse: parseToml } = await import('toml');
          return parseToml(content);
        case '.yaml':
        case '.yml':
          const yaml = await import('yaml');
          return yaml.parse(content);
        case '.json':
          return JSON.parse(content);
        default:
          throw new Error(`不支持的配置文件格式: ${ext}`);
      }
    } catch (error) {
      throw new Error(`解析配置文件失败 ${filePath}: ${(error as Error).message}`);
    }
  }
}