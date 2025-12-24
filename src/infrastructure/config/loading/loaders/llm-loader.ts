/**
 * LLM模块加载器
 */

import { BaseModuleLoader } from '../base-loader';
import { ConfigFile, ModuleMetadata } from '../types';
import { ILogger } from '../../../../domain/common/types';

/**
 * LLM模块加载器
 */
export class LLMLoader extends BaseModuleLoader {
  readonly moduleType = 'llm';

  constructor(logger: ILogger) {
    super(logger);
  }

  /**
   * 预处理LLM配置文件
   */
  protected override async preprocessFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    const processedFiles = [];
    
    for (const file of files) {
      // 根据文件路径调整优先级
      if (file.path.includes('common.toml')) {
        // 通用配置优先级最高
        file.priority += 1000;
      } else if (file.path.includes('provider/')) {
        // 提供商配置次之
        file.priority += 500;
      } else if (file.path.includes('groups/')) {
        // 组配置
        file.priority += 300;
      } else if (file.path.includes('polling_pools/')) {
        // 轮询池配置
        file.priority += 200;
      } else if (file.path.includes('_group.toml')) {
        // 分组配置
        file.priority += 400;
      }
      
      processedFiles.push(file);
    }
    
    return processedFiles;
  }

  /**
   * 合并LLM配置
   */
  protected async mergeConfigs(configs: Record<string, any>[]): Promise<Record<string, any>> {
    let result: Record<string, any> = {};
    
    // 1. 首先处理_group配置
    const groupConfig = configs.find(c => c['_group']);
    if (groupConfig) {
      result = { ...groupConfig };
      this.logger.debug('应用LLM分组配置', { keys: Object.keys(groupConfig) });
    }
    
    // 2. 处理全局LLM配置（如并发控制、限流等）
    const globalConfigs = configs.filter(c =>
      !c['_group'] &&
      !c['provider'] &&
      !c['name'] &&
      !c['echelon1'] &&
      !c['pool_name']
    );
    
    for (const config of globalConfigs) {
      result = this.deepMerge(result, config);
    }
    
    // 3. 处理提供商配置
    const providerConfigs = configs.filter(c => c['provider']);
    const providers: Record<string, any> = {};
    
    for (const config of providerConfigs) {
      const provider = config['provider'];
      if (!providers[provider]) {
        providers[provider] = {};
      }
      
      // 合并通用配置到提供商配置
      const commonConfig = configs.find(c =>
        c['path']?.includes('common.toml') &&
        c['path']?.includes(provider)
      );
      
      if (commonConfig) {
        providers[provider] = this.deepMerge(providers[provider], commonConfig);
      }
      
      providers[provider] = this.deepMerge(providers[provider], config);
    }
    
    if (Object.keys(providers).length > 0) {
      result['providers'] = providers;
      this.logger.debug('应用LLM提供商配置', { 
        providers: Object.keys(providers) 
      });
    }
    
    // 4. 处理组配置
    const groupConfigs = configs.filter(c => c['echelon1'] || c['name']);
    const groups: Record<string, any> = {};
    
    for (const config of groupConfigs) {
      const groupName = config['name'] || 'unnamed_group';
      groups[groupName] = config;
    }
    
    if (Object.keys(groups).length > 0) {
      result['groups'] = groups;
      this.logger.debug('应用LLM组配置', { 
        groups: Object.keys(groups) 
      });
    }
    
    // 5. 处理轮询池配置
    const poolConfigs = configs.filter(c => c['pool_name']);
    const pools: Record<string, any> = {};
    
    for (const config of poolConfigs) {
      const poolName = config['pool_name'];
      pools[poolName] = config;
    }
    
    if (Object.keys(pools).length > 0) {
      result['polling_pools'] = pools;
      this.logger.debug('应用LLM轮询池配置', { 
        pools: Object.keys(pools) 
      });
    }
    
    // 6. 合并其他配置
    const otherConfigs = configs.filter(c =>
      !c['_group'] &&
      !c['provider'] &&
      !c['name'] &&
      !c['echelon1'] &&
      !c['pool_name']
    );
    
    for (const config of otherConfigs) {
      result = this.deepMerge(result, config);
    }
    
    return result;
  }

  /**
   * 提取LLM模块元数据
   */
  protected override extractMetadata(config: Record<string, any>): ModuleMetadata {
    return {
      name: 'llm',
      version: config['version'] || '1.0.0',
      description: 'LLM配置模块',
      registry: config['_registry']
    };
  }

  /**
   * 提取LLM模块依赖
   */
  protected override extractDependencies(config: Record<string, any>): string[] {
    const dependencies = ['global'];
    
    // LLM模块可能依赖其他模块的配置
    if (config['requires_tools']) {
      dependencies.push('tools');
    }
    
    if (config['requires_workflows']) {
      dependencies.push('workflows');
    }
    
    return dependencies;
  }
}
