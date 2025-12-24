/**
 * 抽象基础模块加载器
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseToml } from 'toml';
import * as yaml from 'yaml';
import { IModuleLoader, ConfigFile, ModuleConfig, ModuleMetadata } from './types';
import { ILogger } from '@shared/types/logger';
import { InheritanceProcessor } from '../processors/inheritance-processor';
import { EnvironmentProcessor } from '../processors/environment-processor';

/**
 * 抽象基础模块加载器
 */
export abstract class BaseModuleLoader implements IModuleLoader {
  abstract readonly moduleType: string;
  
  protected readonly logger: ILogger;
  protected readonly inheritanceProcessor: InheritanceProcessor;
  protected readonly environmentProcessor: EnvironmentProcessor;

  constructor(logger: ILogger) {
    this.logger = logger.child({ module: `${this.constructor.name}` });
    this.inheritanceProcessor = new InheritanceProcessor({}, this.logger);
    this.environmentProcessor = new EnvironmentProcessor({}, this.logger);
  }

  /**
   * 加载模块配置
   */
  async loadModule(configFiles: ConfigFile[]): Promise<ModuleConfig> {
    this.logger.debug('开始加载模块配置', { 
      moduleType: this.moduleType, 
      fileCount: configFiles.length 
    });

    try {
      // 1. 预处理配置文件
      const processedFiles = await this.preprocessFiles(configFiles);
      
      // 2. 按优先级排序
      const sortedFiles = this.sortByPriority(processedFiles);
      
      // 3. 逐个加载配置
      const configs = await this.loadConfigs(sortedFiles);
      
      // 4. 应用模块特定合并逻辑
      const mergedConfig = await this.mergeConfigs(configs);
      
      // 5. 提取元数据和依赖
      const metadata = this.extractMetadata(mergedConfig);
      const dependencies = this.extractDependencies(mergedConfig);
      
      const moduleConfig: ModuleConfig = {
        type: this.moduleType,
        configs: mergedConfig,
        metadata,
        dependencies
      };

      this.logger.debug('模块配置加载完成', { 
        moduleType: this.moduleType,
        configKeys: Object.keys(mergedConfig)
      });

      return moduleConfig;
    } catch (error) {
      this.logger.error('模块配置加载失败', error as Error, {
        moduleType: this.moduleType
      });
      throw error;
    }
  }

  /**
   * 检查是否支持指定模块类型
   */
  supports(moduleType: string): boolean {
    return moduleType === this.moduleType;
  }

  /**
   * 预处理配置文件（子类可重写）
   */
  protected async preprocessFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    return files;
  }

  /**
   * 加载配置文件内容
   */
  protected async loadConfigs(files: ConfigFile[]): Promise<Record<string, any>[]> {
    const configs: Record<string, any>[] = [];
    
    for (const file of files) {
      try {
        this.logger.debug('加载配置文件', { path: file.path });
        
        const content = await fs.readFile(file.path, 'utf8');
        const parsed = this.parseContent(content, file.path);
        
        // 应用继承处理
        const withInheritance = await this.inheritanceProcessor.process(parsed);
        
        // 应用环境变量处理
        const withEnvironment = await this.environmentProcessor.process(withInheritance);
        
        configs.push(withEnvironment);
      } catch (error) {
        this.logger.warn('配置文件加载失败，跳过', { 
          path: file.path, 
          error: (error as Error).message 
        });
      }
    }
    
    return configs;
  }

  /**
   * 合并配置（子类必须实现）
   */
  protected abstract mergeConfigs(configs: Record<string, any>[]): Promise<Record<string, any>>;

  /**
   * 提取元数据（子类可重写）
   */
  protected extractMetadata(config: Record<string, any>): ModuleMetadata {
    return {
      name: this.moduleType,
      version: config['version'] || '1.0.0',
      description: config['description'] || `${this.moduleType}配置模块`,
      registry: config['_registry']
    };
  }

  /**
   * 提取依赖关系（子类可重写）
   */
  protected extractDependencies(config: Record<string, any>): string[] {
    const dependencies = ['global']; // 默认依赖全局配置
    
    if (config['dependencies'] && Array.isArray(config['dependencies'])) {
      dependencies.push(...config['dependencies']);
    }
    
    return dependencies;
  }

  /**
   * 按优先级排序文件
   */
  protected sortByPriority(files: ConfigFile[]): ConfigFile[] {
    return files.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 解析文件内容
   */
  private parseContent(content: string, filePath: string): Record<string, any> {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      switch (ext) {
        case '.toml':
          return parseToml(content);
        case '.yaml':
        case '.yml':
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

  /**
   * 深度合并对象
   */
  protected deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) {
      return target;
    }

    if (typeof source !== 'object' || Array.isArray(source)) {
      return source;
    }

    if (typeof target !== 'object' || Array.isArray(target)) {
      target = {};
    }

    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (this.isObject(value) && this.isObject(result[key])) {
        result[key] = this.deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 浅度合并对象
   */
  protected shallowMerge(target: any, source: any): any {
    return { ...target, ...source };
  }

  /**
   * 数组追加合并
   */
  protected arrayAppendMerge(target: any, source: any): any {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (Array.isArray(value) && Array.isArray(result[key])) {
        result[key] = [...result[key], ...value];
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 检查是否为对象
   */
  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * 获取嵌套值
   */
  protected getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 设置嵌套值
   */
  protected setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}
