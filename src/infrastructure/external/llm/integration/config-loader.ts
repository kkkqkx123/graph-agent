import { injectable, inject } from 'inversify';
import { ConfigManager } from '../../../common/config/config-manager.interface';
import { PoolConfig } from '../../../../domain/llm/entities/pool';
import { TaskGroupConfig } from '../../../../domain/llm/entities/task-group';
import { EchelonConfig } from '../../../../domain/llm/value-objects/echelon-config';
import { RotationStrategy } from '../../../../domain/llm/value-objects/rotation-strategy';
import { FallbackStrategy } from '../../../../domain/llm/value-objects/fallback-strategy';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';

/**
 * 轮询池和任务组配置加载器
 * 
 * 负责从配置系统加载轮询池和任务组的配置，并进行解析和验证
 */
@injectable()
export class PollingPoolAndTaskGroupConfigLoader {
  constructor(
    @inject(LLM_DI_IDENTIFIERS.ConfigManager) 
    private configManager: ConfigManager
  ) {}

  /**
   * 加载轮询池配置
   * @param poolName 轮询池名称
   * @returns 轮询池配置
   */
  async loadPoolConfig(poolName: string): Promise<PoolConfig> {
    const configPath = `llms.polling_pools.${poolName}`;
    const rawConfig = await this.configManager.get(configPath);
    
    if (!rawConfig) {
      throw new Error(`Pool configuration not found: ${poolName}`);
    }

    return this.parsePoolConfig(rawConfig, poolName);
  }

  /**
   * 加载任务组配置
   * @param groupName 任务组名称
   * @returns 任务组配置
   */
  async loadTaskGroupConfig(groupName: string): Promise<TaskGroupConfig> {
    const configPath = `llms.groups.${groupName}`;
    const rawConfig = await this.configManager.get(configPath);
    
    if (!rawConfig) {
      throw new Error(`Task group configuration not found: ${groupName}`);
    }

    return this.parseTaskGroupConfig(rawConfig, groupName);
  }

  /**
   * 加载所有轮询池配置
   * @returns 轮询池配置映射
   */
  async loadAllPoolConfigs(): Promise<Map<string, PoolConfig>> {
    const poolConfigs = new Map<string, PoolConfig>();
    
    try {
      // 获取所有轮询池配置
      const poolsPath = 'llms.polling_pools';
      const poolsData = await this.configManager.get(poolsPath) || {};
      
      for (const [poolName, poolData] of Object.entries(poolsData)) {
        if (typeof poolData === 'object' && poolData !== null) {
          const config = this.parsePoolConfig(poolData, poolName);
          poolConfigs.set(poolName, config);
        }
      }
    } catch (error) {
      console.warn('Error loading pool configs:', error);
    }

    return poolConfigs;
  }

  /**
   * 加载所有任务组配置
   * @returns 任务组配置映射
   */
  async loadAllTaskGroupConfigs(): Promise<Map<string, TaskGroupConfig>> {
    const groupConfigs = new Map<string, TaskGroupConfig>();
    
    try {
      // 获取所有任务组配置
      const groupsPath = 'llms.groups';
      const groupsData = await this.configManager.get(groupsPath) || {};
      
      for (const [groupName, groupData] of Object.entries(groupsData)) {
        if (typeof groupData === 'object' && groupData !== null) {
          const config = this.parseTaskGroupConfig(groupData, groupName);
          groupConfigs.set(groupName, config);
        }
      }
    } catch (error) {
      console.warn('Error loading task group configs:', error);
    }

    return groupConfigs;
  }

  /**
   * 解析轮询池配置
   * @param rawConfig 原始配置数据
   * @param poolName 轮询池名称
   * @returns 解析后的轮询池配置
   */
  private parsePoolConfig(rawConfig: any, poolName: string): PoolConfig {
    // 验证必需字段
    if (!rawConfig.name) {
      rawConfig.name = poolName;
    }

    if (!rawConfig.task_groups || !Array.isArray(rawConfig.task_groups)) {
      throw new Error(`Pool ${poolName} must have task_groups array`);
    }

    // 解析轮询策略
    const rotationStrategy = this.parseRotationStrategy(
      rawConfig.rotation_strategy || 'round_robin'
    );

    // 解析健康检查配置
    const healthCheckConfig = {
      interval: rawConfig.health_check_interval || 30,
      failureThreshold: rawConfig.failure_threshold || 3,
      recoveryTime: rawConfig.recovery_time || 60
    };

    // 解析降级配置
    const fallbackConfig = rawConfig.fallback_config ? {
      strategy: rawConfig.fallback_config.strategy || 'instance_rotation',
      maxInstanceAttempts: rawConfig.fallback_config.max_instance_attempts || 2
    } : undefined;

    // 解析速率限制配置
    const rateLimitingConfig = rawConfig.rate_limiting ? {
      enabled: rawConfig.rate_limiting.enabled !== false,
      algorithm: rawConfig.rate_limiting.algorithm || 'token_bucket',
      tokenBucket: rawConfig.rate_limiting.token_bucket ? {
        bucketSize: rawConfig.rate_limiting.token_bucket.bucket_size || 1000,
        refillRate: rawConfig.rate_limiting.token_bucket.refill_rate || 16.67
      } : undefined
    } : undefined;

    return PoolConfig.create({
      name: rawConfig.name,
      description: rawConfig.description || '',
      taskGroups: rawConfig.task_groups,
      rotationStrategy,
      healthCheckConfig,
      fallbackConfig,
      rateLimitingConfig
    });
  }

  /**
   * 解析任务组配置
   * @param rawConfig 原始配置数据
   * @param groupName 任务组名称
   * @returns 解析后的任务组配置
   */
  private parseTaskGroupConfig(rawConfig: any, groupName: string): TaskGroupConfig {
    // 验证必需字段
    if (!rawConfig.name) {
      rawConfig.name = groupName;
    }

    // 解析层级配置
    const echelons = new Map<number, EchelonConfig>();
    
    // 查找所有层级配置
    for (const [key, value] of Object.entries(rawConfig)) {
      if (key.startsWith('echelon') && typeof value === 'object' && value !== null) {
        const echelonNumber = parseInt(key.replace('echelon', ''));
        if (!isNaN(echelonNumber)) {
          const echelonConfig = this.parseEchelonConfig(value, echelonNumber);
          echelons.set(echelonNumber, echelonConfig);
        }
      }
    }

    if (echelons.size === 0) {
      throw new Error(`Task group ${groupName} must have at least one echelon`);
    }

    // 解析降级策略
    const fallbackStrategy = this.parseFallbackStrategy(
      rawConfig.fallback_strategy || 'echelon_down'
    );

    // 解析熔断器配置
    const circuitBreakerConfig = rawConfig.circuit_breaker ? {
      failureThreshold: rawConfig.circuit_breaker.failure_threshold || 5,
      recoveryTime: rawConfig.circuit_breaker.recovery_time || 60,
      halfOpenRequests: rawConfig.circuit_breaker.half_open_requests || 1
    } : undefined;

    // 解析降级配置
    const fallbackConfig = rawConfig.fallback_config ? {
      strategy: rawConfig.fallback_config.strategy || 'echelon_down',
      fallbackGroups: rawConfig.fallback_config.fallback_groups || [],
      maxAttempts: rawConfig.fallback_config.max_attempts || 3,
      retryDelay: rawConfig.fallback_config.retry_delay || 1.0,
      circuitBreaker: rawConfig.fallback_config.circuit_breaker ? {
        failureThreshold: rawConfig.fallback_config.circuit_breaker.failure_threshold || 5,
        recoveryTime: rawConfig.fallback_config.circuit_breaker.recovery_time || 60,
        halfOpenRequests: rawConfig.fallback_config.circuit_breaker.half_open_requests || 1
      } : undefined
    } : undefined;

    return TaskGroupConfig.create({
      name: rawConfig.name,
      description: rawConfig.description || '',
      echelons,
      fallbackStrategy,
      circuitBreakerConfig,
      fallbackConfig
    });
  }

  /**
   * 解析层级配置
   * @param rawConfig 原始层级配置
   * @param echelonNumber 层级编号
   * @returns 解析后的层级配置
   */
  private parseEchelonConfig(rawConfig: any, echelonNumber: number): EchelonConfig {
    if (!rawConfig.models || !Array.isArray(rawConfig.models)) {
      throw new Error(`Echelon ${echelonNumber} must have models array`);
    }

    return EchelonConfig.create({
      models: rawConfig.models,
      concurrencyLimit: rawConfig.concurrency_limit || 10,
      rpmLimit: rawConfig.rpm_limit || 100,
      priority: rawConfig.priority || echelonNumber,
      timeout: rawConfig.timeout || 30,
      maxRetries: rawConfig.max_retries || 3,
      temperature: rawConfig.temperature,
      maxTokens: rawConfig.max_tokens,
      thinkingConfig: rawConfig.thinking_config ? {
        enabled: rawConfig.thinking_config.enabled !== false,
        budgetTokens: rawConfig.thinking_config.budget_tokens || 2000
      } : undefined
    });
  }

  /**
   * 解析轮询策略
   * @param strategy 策略名称
   * @returns 轮询策略实例
   */
  private parseRotationStrategy(strategy: string): RotationStrategy {
    switch (strategy.toLowerCase()) {
      case 'round_robin':
        return RotationStrategy.createRoundRobin();
      case 'weighted':
        return RotationStrategy.createWeighted();
      case 'random':
        return RotationStrategy.createRandom();
      case 'least_connections':
        return RotationStrategy.createLeastConnections();
      default:
        console.warn(`Unknown rotation strategy: ${strategy}, using round_robin`);
        return RotationStrategy.createRoundRobin();
    }
  }

  /**
   * 解析降级策略
   * @param strategy 策略名称
   * @returns 降级策略实例
   */
  private parseFallbackStrategy(strategy: string): FallbackStrategy {
    switch (strategy.toLowerCase()) {
      case 'echelon_down':
        return FallbackStrategy.createEchelonDown();
      case 'next_instance':
        return FallbackStrategy.createNextInstance();
      case 'random_instance':
        return FallbackStrategy.createRandomInstance();
      case 'fail_fast':
        return FallbackStrategy.createFailFast();
      default:
        console.warn(`Unknown fallback strategy: ${strategy}, using echelon_down`);
        return FallbackStrategy.createEchelonDown();
    }
  }

  /**
   * 验证轮询池配置
   * @param config 轮询池配置
   * @returns 验证结果
   */
  validatePoolConfig(config: PoolConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.getName()) {
      errors.push('Pool name is required');
    }

    if (config.getTaskGroups().length === 0) {
      errors.push('Pool must have at least one task group');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证任务组配置
   * @param config 任务组配置
   * @returns 验证结果
   */
  validateTaskGroupConfig(config: TaskGroupConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.getName()) {
      errors.push('Task group name is required');
    }

    if (config.getEchelons().size === 0) {
      errors.push('Task group must have at least one echelon');
    }

    // 检查层级优先级是否连续
    const echelonNumbers = Array.from(config.getEchelons().keys()).sort((a, b) => a - b);
    for (let i = 1; i < echelonNumbers.length; i++) {
      if (echelonNumbers[i] !== echelonNumbers[i - 1] + 1) {
        errors.push(`Echelon numbers must be consecutive, missing: ${echelonNumbers[i - 1] + 1}`);
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 重新加载配置
   * @param poolName 轮询池名称（可选）
   * @param groupName 任务组名称（可选）
   */
  async reloadConfig(poolName?: string, groupName?: string): Promise<void> {
    // 触发配置管理器重新加载
    await this.configManager.reload();
    
    // 可以在这里添加缓存清理逻辑
    console.log('Configuration reloaded');
  }

  /**
   * 获取配置版本信息
   * @returns 版本信息
   */
  async getConfigVersion(): Promise<{
    version: string;
    lastModified: Date;
    checksum: string;
  }> {
    try {
      const configInfo = await this.configManager.getConfigInfo();
      return {
        version: configInfo.version || '1.0.0',
        lastModified: new Date(configInfo.lastModified || Date.now()),
        checksum: configInfo.checksum || ''
      };
    } catch (error) {
      return {
        version: '1.0.0',
        lastModified: new Date(),
        checksum: ''
      };
    }
  }
}