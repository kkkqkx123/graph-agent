/**
 * 轮询池配置加载器
 * 
 * 负责加载和验证轮询池配置，继承自BaseModuleLoader
 */

import { BaseModuleLoader } from '../base-loader';
import { ConfigFile, ModuleConfig, ModuleMetadata } from '../types';
import { ILogger } from '../../../../domain/common/types';
import { validatePoolConfig } from '../rules';

/**
 * 轮询池配置加载器
 */
export class PoolConfigLoader extends BaseModuleLoader {
  readonly moduleType = 'pool';

  constructor(logger: ILogger) {
    super(logger);
  }

  /**
   * 预处理轮询池配置文件
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
   * 合并轮询池配置
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

    // 2. 处理具体的轮询池配置
    const poolConfigs = configs.filter(c =>
      !c['path']?.includes('default.toml') &&
      !c['path']?.includes('common.toml')
    );

    const pools: Record<string, any> = {};

    for (const config of poolConfigs) {
      const poolName = config['pool_name'] || config['name'];
      if (poolName) {
        // 验证配置
        validatePoolConfig(poolName, config);

        // 合并默认配置
        pools[poolName] = this.mergeWithDefaultConfig(config);
      }
    }

    if (Object.keys(pools).length > 0) {
      result['pools'] = pools;
      this.logger.debug('应用轮询池配置', {
        pools: Object.keys(pools)
      });
    }

    return result;
  }

  /**
   * 提取轮询池模块元数据
   */
  protected override extractMetadata(config: Record<string, any>): ModuleMetadata {
    return {
      name: 'pool',
      version: config['version'] || '1.0.0',
      description: '轮询池配置模块',
      registry: config['_registry']
    };
  }

  /**
   * 合并默认配置
   */
  private mergeWithDefaultConfig(config: Record<string, any>): Record<string, any> {
    const defaultConfig = {
      rotation: {
        strategy: 'round_robin',
        currentIndex: 0
      },
      healthCheck: {
        enabled: true,
        interval: 30,
        failureThreshold: 3
      },
      concurrencyControl: {
        enabled: false,
        maxConcurrency: 10
      },
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 60
      },
      fallbackConfig: {
        strategy: 'instance_rotation',
        maxInstanceAttempts: 2
      }
    };

    return this.deepMerge(defaultConfig, config);
  }
}
