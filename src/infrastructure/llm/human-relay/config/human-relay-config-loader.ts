/**
 * HumanRelay配置加载器
 * 
 * 负责加载和验证HumanRelay配置
 */

import { injectable, inject } from 'inversify';
import { HumanRelayConfig } from '../../../../domain/llm/value-objects/human-relay-config';
import { LLM_DI_IDENTIFIERS } from '../../di-identifiers';

/**
 * HumanRelay配置加载器
 */
@injectable()
export class HumanRelayConfigLoader {
  constructor(
    @inject(LLM_DI_IDENTIFIERS.ConfigManager)
    private configManager: any
  ) { }

  /**
   * 加载HumanRelay配置
   * 
   * @param modelName 模型名称
   * @returns HumanRelay配置
   */
  public loadConfig(modelName: string): HumanRelayConfig {
    const basePath = `llms.provider.human_relay`;

    // 加载通用配置
    const commonConfig = this.configManager.get(`${basePath}.common`, {});

    // 加载特定模型配置
    const modelConfig = this.configManager.get(`${basePath}.${modelName}`, {});

    // 合并配置
    const mergedConfig = this.mergeConfigs(commonConfig, modelConfig);

    // 验证配置
    this.validateConfig(mergedConfig);

    return this.transformToConfigObject(mergedConfig);
  }

  /**
   * 获取所有可用的HumanRelay模型
   * 
   * @returns 模型列表
   */
  public getAvailableModels(): string[] {
    const basePath = `llms.provider.human_relay`;
    const commonConfig = this.configManager.get(`${basePath}.common`, {});
    return commonConfig.models || ['human-relay-s', 'human-relay-m'];
  }

  /**
   * 加载通用配置
   * 
   * @returns 通用配置
   */
  public loadCommonConfig(): HumanRelayConfig {
    const basePath = `llms.provider.human_relay`;
    const commonConfig = this.configManager.get(`${basePath}.common`, {});

    this.validateConfig(commonConfig);
    return this.transformToConfigObject(commonConfig);
  }

  /**
   * 加载单轮模式配置
   * 
   * @returns 单轮模式配置
   */
  public loadSingleModeConfig(): HumanRelayConfig {
    return this.loadConfig('human-relay-s');
  }

  /**
   * 加载多轮模式配置
   * 
   * @returns 多轮模式配置
   */
  public loadMultiModeConfig(): HumanRelayConfig {
    return this.loadConfig('human-relay-m');
  }

  /**
   * 加载高级配置
   * 
   * @returns 高级配置
   */
  public loadAdvancedConfig(): HumanRelayConfig {
    return this.loadConfig('human-relay-advanced');
  }

  /**
   * 从环境变量覆盖配置
   * 
   * @param config 原始配置
   * @returns 覆盖后的配置
   */
  public applyEnvironmentOverrides(config: any): any {
    const overrides: any = {};

    // 基础配置覆盖
    if (process.env['HUMAN_RELAY_MODE']) {
      overrides.mode = process.env['HUMAN_RELAY_MODE'];
    }

    if (process.env['HUMAN_RELAY_TIMEOUT']) {
      overrides.default_timeout = parseInt(process.env['HUMAN_RELAY_TIMEOUT'], 10);
    }

    if (process.env['HUMAN_RELAY_MAX_HISTORY']) {
      overrides.max_history_length = parseInt(process.env['HUMAN_RELAY_MAX_HISTORY'], 10);
    }

    // 前端配置覆盖
    if (process.env['HUMAN_RELAY_FRONTEND_TYPE']) {
      overrides.frontend = {
        ...config.frontend,
        type: process.env['HUMAN_RELAY_FRONTEND_TYPE']
      };
    }

    if (process.env['HUMAN_RELAY_WEB_PORT']) {
      overrides.frontend = {
        ...config.frontend,
        web: {
          ...config.frontend?.web,
          port: parseInt(process.env['HUMAN_RELAY_WEB_PORT'], 10)
        }
      };
    }

    if (process.env['HUMAN_RELAY_API_ENDPOINT']) {
      overrides.frontend = {
        ...config.frontend,
        api: {
          ...config.frontend?.api,
          endpoint: process.env['HUMAN_RELAY_API_ENDPOINT']
        }
      };
    }

    // 功能配置覆盖
    if (process.env['HUMAN_RELAY_ENABLE_HISTORY']) {
      overrides.features = {
        ...config.features,
        conversation_history: process.env['HUMAN_RELAY_ENABLE_HISTORY'] === 'true'
      };
    }

    if (process.env['HUMAN_RELAY_ENABLE_PERSISTENCE']) {
      overrides.features = {
        ...config.features,
        session_persistence: process.env['HUMAN_RELAY_ENABLE_PERSISTENCE'] === 'true'
      };
    }

    // 深度合并配置
    return this.deepMerge(config, overrides);
  }

  // 私有方法

  /**
   * 合并配置对象
   */
  private mergeConfigs(common: any, specific: any): any {
    return {
      ...common,
      ...specific,
      frontend: {
        ...common.frontend,
        ...specific.frontend
      },
      templates: {
        ...common.templates,
        ...specific.templates
      },
      features: {
        ...common.features,
        ...specific.features
      },
      error_handling: {
        ...common.error_handling,
        ...specific.error_handling
      },
      metadata: {
        ...common.metadata,
        ...specific.metadata
      }
    };
  }

  /**
   * 验证配置
   */
  private validateConfig(config: any): void {
    // 验证必需字段
    if (!config.provider || typeof config.provider !== 'string') {
      throw new Error('提供商名称无效');
    }

    if (!config.mode || !['single', 'multi'].includes(config.mode)) {
      throw new Error('无效的HumanRelay模式配置');
    }

    if (!config.frontend || !config.frontend.type) {
      throw new Error('缺少前端配置');
    }

    if (!['tui', 'web', 'api'].includes(config.frontend.type)) {
      throw new Error('无效的前端类型');
    }

    if (config.default_timeout && (config.default_timeout <= 0 || config.default_timeout > 3600)) {
      throw new Error('默认超时时间必须在1-3600秒之间');
    }

    if (config.max_history_length && (config.max_history_length <= 0 || config.max_history_length > 1000)) {
      throw new Error('最大历史长度必须在1-1000之间');
    }

    // 验证Web配置
    if (config.frontend.web) {
      const webConfig = config.frontend.web;
      if (webConfig.port && (webConfig.port < 1024 || webConfig.port > 65535)) {
        throw new Error('Web端口必须在1024-65535范围内');
      }
    }

    // 验证多轮模式的特殊要求
    if (config.mode === 'multi') {
      if (config.max_history_length < 2) {
        throw new Error('多轮模式的最大历史长度至少为2');
      }

      if (!config.features.conversation_history) {
        console.warn('多轮模式建议启用对话历史功能');
      }
    }

    // 验证模板
    if (!config.templates || !config.templates.single || !config.templates.multi) {
      throw new Error('缺少必需的模板配置');
    }
  }

  /**
   * 转换为配置对象
   */
  private transformToConfigObject(config: any): HumanRelayConfig {
    return new HumanRelayConfig({
      provider: config.provider,
      modelType: config.model_type || 'human-relay',
      mode: config.mode,
      defaultTimeout: config.default_timeout || 300,
      maxHistoryLength: config.max_history_length || 50,
      frontendConfig: config.frontend,
      templates: config.templates,
      features: config.features,
      errorHandling: config.error_handling,
      persistence: config.persistence,
      metadata: config.metadata
    });
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * 获取配置摘要
   */
  public getConfigSummary(config: HumanRelayConfig): {
    provider: string;
    mode: string;
    frontendType: string;
    features: string[];
    timeout: number;
    maxHistory: number;
  } {
    return {
      provider: config.provider,
      mode: config.mode,
      frontendType: config.frontendConfig.type,
      features: Object.entries(config.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature),
      timeout: config.defaultTimeout,
      maxHistory: config.maxHistoryLength
    };
  }

  /**
   * 验证配置兼容性
   */
  public validateCompatibility(config: HumanRelayConfig): {
    isCompatible: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查模式与功能的兼容性
    if (config.isSingleMode() && config.supportsFeature('conversationHistory')) {
      warnings.push('单轮模式启用对话历史功能可能没有实际效果');
    }

    if (config.isMultiMode() && !config.supportsFeature('conversationHistory')) {
      errors.push('多轮模式必须启用对话历史功能');
    }

    // 检查前端类型与功能的兼容性
    if (config.getCurrentFrontendType() === 'tui' && config.supportsFeature('sessionPersistence')) {
      warnings.push('TUI前端可能不支持会话持久化功能');
    }

    // 检查超时设置的合理性
    if (config.defaultTimeout < 60) {
      warnings.push('超时时间过短可能导致用户无法完成输入');
    }

    if (config.defaultTimeout > 1800) {
      warnings.push('超时时间过长可能影响用户体验');
    }

    // 检查历史长度设置
    if (config.maxHistoryLength > 200) {
      warnings.push('历史长度过大可能影响性能');
    }

    return {
      isCompatible: errors.length === 0,
      warnings,
      errors
    };
  }
}