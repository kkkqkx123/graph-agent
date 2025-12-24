/**
 * 任务组配置加载器
 * 
 * 负责加载和验证任务组配置，继承自BaseModuleLoader
 */

import { BaseModuleLoader } from '../base-loader';
import { ConfigFile, ModuleConfig, ModuleMetadata } from '../types';
import { ILogger } from '@shared/types/logger';

/**
 * 任务组配置加载器
 */
export class TaskGroupConfigLoader extends BaseModuleLoader {
  readonly moduleType = 'taskGroup';

  constructor(logger: ILogger) {
    super(logger);
  }

  /**
   * 预处理任务组配置文件
   */
  protected override async preprocessFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    const processedFiles = [];
    
    for (const file of files) {
      // 根据文件路径调整优先级
      if (file.path.includes('common.toml')) {
        // 通用配置优先级最高
        file.priority += 1000;
      } else if (file.path.includes('default.toml')) {
        // 默认配置次之
        file.priority += 500;
      }
      
      processedFiles.push(file);
    }
    
    return processedFiles;
  }

  /**
   * 合并任务组配置
   */
  protected async mergeConfigs(configs: Record<string, any>[]): Promise<Record<string, any>> {
    let result: Record<string, any> = {};
    
    // 1. 首先处理默认配置
    const defaultConfigs = configs.filter(c =>
      c['path']?.includes('default.toml') || c['path']?.includes('common.toml')
    );
    
    for (const config of defaultConfigs) {
      result = this.deepMerge(result, config);
    }
    
    // 2. 处理具体的任务组配置
    const groupConfigs = configs.filter(c =>
      !c['path']?.includes('default.toml') &&
      !c['path']?.includes('common.toml')
    );
    
    const taskGroups: Record<string, any> = {};
    
    for (const config of groupConfigs) {
      const groupName = config['name'] || config['group_name'];
      if (groupName) {
        // 验证配置
        this.validateTaskGroupConfig(groupName, config);
        
        // 合并默认配置
        taskGroups[groupName] = this.mergeWithDefaultConfig(config);
      }
    }
    
    if (Object.keys(taskGroups).length > 0) {
      result['taskGroups'] = taskGroups;
      this.logger.debug('应用任务组配置', { 
        taskGroups: Object.keys(taskGroups) 
      });
    }
    
    return result;
  }

  /**
   * 提取任务组模块元数据
   */
  protected override extractMetadata(config: Record<string, any>): ModuleMetadata {
    return {
      name: 'taskGroup',
      version: config['version'] || '1.0.0',
      description: '任务组配置模块',
      registry: config['_registry']
    };
  }

  /**
   * 验证任务组配置
   */
  private validateTaskGroupConfig(groupName: string, config: Record<string, any>): void {
    const requiredFields = ['name'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`任务组配置缺少必需字段: ${field}`);
      }
    }

    // 验证层级配置
    const echelons = this.extractEchelons(config);
    if (Object.keys(echelons).length === 0) {
      throw new Error(`任务组 ${groupName} 必须配置至少一个层级`);
    }

    // 验证每个层级配置
    for (const [echelonName, echelonConfig] of Object.entries(echelons)) {
      this.validateEchelonConfig(groupName, echelonName, echelonConfig as Record<string, any>);
    }

    // 验证降级配置
    const fallbackConfig = config['fallbackConfig'] || {};
    if (fallbackConfig['strategy']) {
      const validStrategies = ['echelon_down', 'pool_fallback', 'global_fallback'];
      if (!validStrategies.includes(fallbackConfig['strategy'])) {
        throw new Error(`不支持的降级策略: ${fallbackConfig['strategy']}`);
      }
    }
  }

  /**
   * 提取层级配置
   */
  private extractEchelons(config: Record<string, any>): Record<string, any> {
    const echelons: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (key.startsWith('echelon') && typeof value === 'object' && value !== null) {
        echelons[key] = value;
      }
    }
    
    return echelons;
  }

  /**
   * 验证层级配置
   */
  private validateEchelonConfig(groupName: string, echelonName: string, config: Record<string, any>): void {
    const requiredFields = ['priority', 'models'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`层级配置 ${groupName}.${echelonName} 缺少必需字段: ${field}`);
      }
    }

    // 验证优先级
    const priority = config['priority'];
    if (typeof priority !== 'number' || priority < 0) {
      throw new Error(`层级 ${groupName}.${echelonName} 的优先级必须是正数`);
    }

    // 验证模型列表
    const models = config['models'] || [];
    if (!Array.isArray(models) || models.length === 0) {
      throw new Error(`层级 ${groupName}.${echelonName} 必须配置至少一个模型`);
    }

    for (const model of models) {
      if (typeof model !== 'string') {
        throw new Error(`层级 ${groupName}.${echelonName} 的模型名称必须是字符串`);
      }
    }
  }

  /**
   * 合并默认配置
   */
  private mergeWithDefaultConfig(config: Record<string, any>): Record<string, any> {
    const defaultConfig = {
      fallbackStrategy: 'echelon_down',
      maxAttempts: 3,
      retryDelay: 1.0,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTime: 60,
        halfOpenRequests: 1
      }
    };

    return this.deepMerge(defaultConfig, config);
  }
}
