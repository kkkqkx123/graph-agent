/**
 * 工作流函数模块加载器
 */

import { BaseModuleLoader } from '../base-loader';
import { ConfigFile, ModuleMetadata } from '../types';
import { ILogger } from '../../../../domain/common/types';

/**
 * 工作流函数模块加载器
 */
export class WorkflowFunctionLoader extends BaseModuleLoader {
  readonly moduleType = 'workflow_functions';

  constructor(logger: ILogger) {
    super(logger);
  }

  /**
   * 预处理工作流函数配置文件
   */
  protected override async preprocessFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    const processedFiles = [];
    
    for (const file of files) {
      // 根据文件路径调整优先级
      if (file.path.includes('__registry__.toml')) {
        // 注册表配置优先级最高
        file.priority += 1000;
      } else if (file.path.includes('builtin/')) {
        // 内置函数优先级较高
        file.priority += 500;
      } else if (file.path.includes('custom/')) {
        // 自定义函数
        file.priority += 300;
      }
      
      processedFiles.push(file);
    }
    
    return processedFiles;
  }

  /**
   * 合并工作流函数配置
   */
  protected async mergeConfigs(configs: Record<string, any>[]): Promise<Record<string, any>> {
    let result: Record<string, any> = {};
    
    // 1. 首先处理注册表配置
    const registryConfig = configs.find(c =>
      c['metadata'] &&
      (c['metadata'].name === 'workflow_functions_registry' || c['path']?.includes('__registry__'))
    );
    
    if (registryConfig) {
      result = { ...registryConfig };
      this.logger.debug('应用工作流函数注册表配置', { 
        functionTypes: Object.keys(registryConfig['function_types'] || {}),
        functionSets: Object.keys(registryConfig['function_sets'] || {})
      });
    }
    
    // 2. 按类型分组函数配置
    const functionsByType: Record<string, Record<string, any>> = {
      conditions: {},
      nodes: {},
      routing: {},
      triggers: {}
    };
    
    for (const config of configs) {
      // 跳过注册表配置
      if (config === registryConfig) {
        continue;
      }
      
      // 根据文件路径确定函数类型
      let functionType = 'unknown';
      if (config['path']?.includes('conditions/')) {
        functionType = 'conditions';
      } else if (config['path']?.includes('nodes/')) {
        functionType = 'nodes';
      } else if (config['path']?.includes('routing/')) {
        functionType = 'routing';
      } else if (config['path']?.includes('triggers/')) {
        functionType = 'triggers';
      } else if (config['function_type']) {
        functionType = config['function_type'];
      }
      
      if (functionType !== 'unknown' && config['name']) {
        if (!functionsByType[functionType]) {
          functionsByType[functionType] = {};
        }
        const name = config['name']!;
        if (name && functionsByType[functionType]) {
          functionsByType[functionType]![name] = config;
        }
      }
    }
    
    // 3. 将函数配置添加到结果中
    for (const [type, functions] of Object.entries(functionsByType)) {
      if (Object.keys(functions).length > 0) {
        result[type] = functions;
        this.logger.debug('应用函数类型配置', { 
          type, 
          functions: Object.keys(functions) 
        });
      }
    }
    
    // 4. 处理函数集配置（如果存在）
    const functionSets = registryConfig?.['function_sets'] || {};
    if (Object.keys(functionSets).length > 0) {
      result['function_sets'] = functionSets;
    }
    
    // 5. 处理自动发现配置
    const autoDiscovery = registryConfig?.['auto_discovery'] || {};
    if (Object.keys(autoDiscovery).length > 0) {
      result['auto_discovery'] = autoDiscovery;
    }
    
    // 6. 合并其他配置
    const otherConfigs = configs.filter(c =>
      c !== registryConfig &&
      !c['name'] &&
      !c['function_type']
    );
    
    for (const config of otherConfigs) {
      result = this.deepMerge(result, config);
    }
    
    return result;
  }

  /**
   * 提取工作流函数模块元数据
   */
  protected override extractMetadata(config: Record<string, any>): ModuleMetadata {
    return {
      name: 'workflow_functions',
      version: config['version'] || '1.0.0',
      description: '工作流函数配置模块',
      registry: config['_registry'] || config['metadata']?.name
    };
  }

  /**
   * 提取工作流函数模块依赖
   */
  protected override extractDependencies(config: Record<string, any>): string[] {
    const dependencies = ['global'];
    
    // 工作流函数模块可能依赖其他模块的配置
    if (config['requires_workflow']) {
      dependencies.push('workflow');
    }
    
    if (config['requires_llm']) {
      dependencies.push('llm');
    }
    
    if (config['requires_tools']) {
      dependencies.push('tools');
    }
    
    // 节点函数可能需要存储配置
    const hasNodeFunctions = config['nodes'] && Object.keys(config['nodes']).length > 0;
    if (hasNodeFunctions) {
      dependencies.push('storage');
    }
    
    // 触发函数可能需要事件配置
    const hasTriggerFunctions = config['triggers'] && Object.keys(config['triggers']).length > 0;
    if (hasTriggerFunctions) {
      dependencies.push('events');
    }
    
    return dependencies;
  }
}