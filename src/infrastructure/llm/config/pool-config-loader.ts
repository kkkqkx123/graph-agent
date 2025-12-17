import { injectable, inject } from 'inversify';
import { ConfigManager } from '../../common/config/config-manager.interface';

/**
 * 轮询池配置加载器
 * 
 * 负责加载和验证轮询池配置
 */
@injectable()
export class PoolConfigLoader {
  constructor(
    @inject('ConfigManager') private configManager: ConfigManager
  ) {}

  /**
   * 加载轮询池配置
   */
  async loadPoolConfig(poolName: string): Promise<Record<string, any>> {
    const llmConfig = this.configManager.getConfigStructure();
    const pools = llmConfig['pools'] || {};
    
    const poolConfig = pools[poolName];
    if (!poolConfig) {
      throw new Error(`轮询池配置不存在: ${poolName}`);
    }

    // 验证配置
    this.validatePoolConfig(poolName, poolConfig);

    // 合并默认配置
    return this.mergeWithDefaultConfig(poolConfig);
  }

  /**
   * 加载所有轮询池配置
   */
  async loadAllPoolConfigs(): Promise<Record<string, any>> {
    const llmConfig = this.configManager.getConfigStructure();
    const pools = llmConfig['pools'] || {};
    
    const validatedConfigs: Record<string, any> = {};

    for (const [poolName, poolConfig] of Object.entries(pools)) {
      try {
        this.validatePoolConfig(poolName, poolConfig as Record<string, any>);
        validatedConfigs[poolName] = this.mergeWithDefaultConfig(poolConfig as Record<string, any>);
      } catch (error) {
        console.warn(`轮询池配置验证失败 ${poolName}:`, error);
      }
    }

    return validatedConfigs;
  }

  /**
   * 验证轮询池配置
   */
  private validatePoolConfig(poolName: string, config: Record<string, any>): void {
    const requiredFields = ['name', 'taskGroups'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`轮询池配置缺少必需字段: ${field}`);
      }
    }

    // 验证任务组
    const taskGroups = config['taskGroups'] || [];
    if (!Array.isArray(taskGroups) || taskGroups.length === 0) {
      throw new Error(`轮询池 ${poolName} 必须配置至少一个任务组`);
    }

    // 验证轮询策略
    const rotationConfig = config['rotation'] || {};
    const validStrategies = ['round_robin', 'least_recently_used', 'weighted'];
    if (rotationConfig.strategy && !validStrategies.includes(rotationConfig.strategy)) {
      throw new Error(`不支持的轮询策略: ${rotationConfig.strategy}`);
    }

    // 验证健康检查配置
    const healthCheckConfig = config['healthCheck'] || {};
    if (healthCheckConfig.interval && typeof healthCheckConfig.interval !== 'number') {
      throw new Error('健康检查间隔必须是数字');
    }

    if (healthCheckConfig.failureThreshold && typeof healthCheckConfig.failureThreshold !== 'number') {
      throw new Error('健康检查失败阈值必须是数字');
    }
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

  /**
   * 深度合并对象
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 检查是否为对象
   */
  private isObject(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * 获取轮询池配置状态
   */
  async getPoolConfigStatus(): Promise<Record<string, any>> {
    const llmConfig = this.configManager.getConfigStructure();
    const pools = llmConfig['pools'] || {};
    
    const status: Record<string, any> = {
      totalPools: Object.keys(pools).length,
      validPools: 0,
      invalidPools: 0,
      pools: {}
    };

    for (const [poolName, poolConfig] of Object.entries(pools)) {
      try {
        this.validatePoolConfig(poolName, poolConfig as Record<string, any>);
        status['pools'][poolName] = {
          valid: true,
          taskGroups: (poolConfig as any)['taskGroups']?.length || 0,
          hasRotation: !!(poolConfig as any)['rotation'],
          hasHealthCheck: !!(poolConfig as any)['healthCheck']
        };
        status['validPools']++;
      } catch (error) {
        status['pools'][poolName] = {
          valid: false,
          error: error instanceof Error ? error.message : String(error)
        };
        status['invalidPools']++;
      }
    }

    return status;
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<void> {
    await this.configManager.reload();
  }

  /**
   * 获取配置变更历史
   */
  async getConfigChangeHistory(): Promise<any[]> {
    // TODO: 实现配置变更历史记录
    return [];
  }

  /**
   * 验证配置语法
   */
  async validateConfigSyntax(config: Record<string, any>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证顶层结构
      if (!config['pools']) {
        warnings.push('配置缺少 pools 字段');
      }

      // 验证每个轮询池配置
      const pools = config['pools'] || {};
      for (const [poolName, poolConfig] of Object.entries(pools)) {
        try {
          this.validatePoolConfig(poolName, poolConfig as Record<string, any>);
        } catch (error) {
          errors.push(`轮询池 ${poolName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`配置语法验证失败: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }
}