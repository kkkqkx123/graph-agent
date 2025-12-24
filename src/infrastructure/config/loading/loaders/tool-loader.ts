/**
 * 工具模块加载器
 */

import { BaseModuleLoader } from '../base-loader';
import { ConfigFile, ModuleMetadata } from '../types';
import { ILogger } from '../../../../domain/common/types';

/**
 * 工具模块加载器
 */
export class ToolLoader extends BaseModuleLoader {
  readonly moduleType = 'tools';

  constructor(logger: ILogger) {
    super(logger);
  }

  /**
   * 预处理工具配置文件
   */
  protected override async preprocessFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    const processedFiles = [];
    
    for (const file of files) {
      // 根据文件路径调整优先级
      if (file.path.includes('__registry__.toml')) {
        // 注册表配置优先级最高
        file.priority += 1000;
      } else if (file.path.includes('builtin/')) {
        // 内置工具优先级较高
        file.priority += 500;
      } else if (file.path.includes('native/')) {
        // 原生工具
        file.priority += 400;
      } else if (file.path.includes('rest/')) {
        // REST工具
        file.priority += 300;
      } else if (file.path.includes('mcp/')) {
        // MCP工具
        file.priority += 200;
      }
      
      processedFiles.push(file);
    }
    
    return processedFiles;
  }

  /**
   * 合并工具配置
   */
  protected async mergeConfigs(configs: Record<string, any>[]): Promise<Record<string, any>> {
    let result: Record<string, any> = {};
    
    // 1. 首先处理注册表配置
    const registryConfig = configs.find(c =>
      c['metadata'] &&
      (c['metadata'].name === 'tools_registry' || c['path']?.includes('__registry__'))
    );
    
    if (registryConfig) {
      result = { ...registryConfig };
      this.logger.debug('应用工具注册表配置', { 
        toolTypes: Object.keys(registryConfig['tool_types'] || {}),
        toolSets: Object.keys(registryConfig['tool_sets'] || {})
      });
    }
    
    // 2. 按类型分组工具配置
    const toolsByType: Record<string, Record<string, any>> = {
      builtin: {},
      native: {},
      rest: {},
      mcp: {}
    };
    
    for (const config of configs) {
      // 跳过注册表配置
      if (config === registryConfig) {
        continue;
      }
      
      // 根据文件路径确定工具类型
      let toolType = 'unknown';
      if (config['path']?.includes('builtin/')) {
        toolType = 'builtin';
      } else if (config['path']?.includes('native/')) {
        toolType = 'native';
      } else if (config['path']?.includes('rest/')) {
        toolType = 'rest';
      } else if (config['path']?.includes('mcp/')) {
        toolType = 'mcp';
      } else if (config['tool_type']) {
        toolType = config['tool_type'];
      }
      
      if (toolType !== 'unknown' && config['name']) {
        if (!toolsByType[toolType]) {
          toolsByType[toolType] = {};
        }
        const name = config['name']!;
        if (name && toolsByType[toolType]) {
          toolsByType[toolType]![name] = config;
        }
      }
    }
    
    // 3. 将工具配置添加到结果中
    for (const [type, tools] of Object.entries(toolsByType)) {
      if (Object.keys(tools).length > 0) {
        result[type] = tools;
        this.logger.debug('应用工具类型配置', { 
          type, 
          tools: Object.keys(tools) 
        });
      }
    }
    
    // 4. 处理工具集配置（如果存在）
    const toolSets = registryConfig?.['tool_sets'] || {};
    if (Object.keys(toolSets).length > 0) {
      result['tool_sets'] = toolSets;
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
      !c['tool_type']
    );
    
    for (const config of otherConfigs) {
      result = this.deepMerge(result, config);
    }
    
    return result;
  }

  /**
   * 提取工具模块元数据
   */
  protected override extractMetadata(config: Record<string, any>): ModuleMetadata {
    return {
      name: 'tools',
      version: config['version'] || '1.0.0',
      description: '工具配置模块',
      registry: config['_registry'] || config['metadata']?.name
    };
  }

  /**
   * 提取工具模块依赖
   */
  protected override extractDependencies(config: Record<string, any>): string[] {
    const dependencies = ['global'];
    
    // 工具模块可能依赖其他模块的配置
    if (config['requires_llm']) {
      dependencies.push('llm');
    }
    
    if (config['requires_storage']) {
      dependencies.push('storage');
    }
    
    // REST工具可能需要网络配置
    const hasRestTools = config['rest'] && Object.keys(config['rest']).length > 0;
    if (hasRestTools) {
      dependencies.push('network');
    }
    
    // MCP工具可能需要连接配置
    const hasMcpTools = config['mcp'] && Object.keys(config['mcp']).length > 0;
    if (hasMcpTools) {
      dependencies.push('mcp');
    }
    
    return dependencies;
  }
}
