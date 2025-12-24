/**
 * 配置加载模块主类
 */

import { IConfigDiscovery, IModuleLoader, IDependencyResolver, ITypeRegistry, ILoadingCache, IModuleRule, ConfigFile, ModuleConfig } from './types';
import { ConfigDiscovery } from './discovery';
import { DependencyResolver } from './dependency-resolver';
import { TypeRegistry } from './type-registry';
import { LoadingCache } from './loading-cache';
import { ILogger } from '../../../domain/common/types';

/**
 * 配置加载模块选项
 */
export interface ConfigLoadingModuleOptions {
  cacheTTL?: number;
  enableCache?: boolean;
  enableValidation?: boolean;
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
    this.registry.registerModuleType(rule.moduleType, rule.schema);
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

      // 3. 加载各模块配置
      const modules = new Map<string, ModuleConfig>();
      
      for (const [moduleType, files] of moduleFiles) {
        const loader = this.loaders.get(moduleType);
        if (loader) {
          try {
            const moduleConfig = await loader.loadModule(files);
            
            // 验证配置
            if (this.options.enableValidation) {
              const validation = this.registry.validateConfig(moduleType, moduleConfig.configs);
              if (!validation.isValid) {
                this.logger.warn('模块配置验证失败', { 
                  moduleType, 
                  errors: validation.errors 
                });
                // 继续处理，但记录警告
              }
            }
            
            modules.set(moduleType, moduleConfig);
            this.logger.debug('模块配置加载成功', { moduleType });
          } catch (error) {
            this.logger.error('模块配置加载失败', error as Error, {
              moduleType
            });
            // 继续处理其他模块
          }
        } else {
          this.logger.warn('未找到模块加载器', { moduleType });
        }
      }

      // 4. 解析依赖关系并生成加载顺序
      const loadingOrder = await this.resolver.resolveDependencies(modules);
      this.logger.debug('依赖关系解析完成', { 
        orderedModules: loadingOrder.orderedModules 
      });

      // 5. 按顺序合并配置
      const result = await this.mergeInOrder(modules, loadingOrder);
      
      // 6. 缓存结果
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
      this.logger.error('模块配置加载失败', error as Error, {
        moduleType
      });
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
}
