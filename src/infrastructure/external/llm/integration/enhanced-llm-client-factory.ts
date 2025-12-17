import { injectable, inject } from 'inversify';
import { ILLMClient } from '../../../../domain/llm/interfaces/llm-client.interface';
import { ILLMWrapper } from '../../../../domain/llm/interfaces/llm-wrapper.interface';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { LLMClientFactory } from '../clients/llm-client-factory';
import { LLMClientAdapter } from './llm-client-adapter';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';

/**
 * 增强的LLM客户端工厂
 * 
 * 扩展现有的LLMClientFactory，添加包装器创建和管理功能
 */
@injectable()
export class EnhancedLLMClientFactory extends LLMClientFactory {
  constructor(
    @inject(LLM_DI_IDENTIFIERS.OpenAIChatClient) openaiChatClient: any,
    @inject(LLM_DI_IDENTIFIERS.OpenAIResponseClient) openaiResponseClient: any,
    @inject(LLM_DI_IDENTIFIERS.AnthropicClient) anthropicClient: any,
    @inject(LLM_DI_IDENTIFIERS.GeminiClient) geminiClient: any,
    @inject(LLM_DI_IDENTIFIERS.GeminiOpenAIClient) geminiOpenAIClient: any,
    @inject(LLM_DI_IDENTIFIERS.MockClient) mockClient: any,
    @inject(LLM_DI_IDENTIFIERS.ConfigManager) configManager: any
  ) {
    super(
      openaiChatClient,
      openaiResponseClient,
      anthropicClient,
      geminiClient,
      geminiOpenAIClient,
      mockClient,
      configManager
    );
  }

  /**
   * 创建LLM包装器
   * @param provider 提供商名称
   * @param model 模型名称（可选）
   * @param instanceId 实例ID（可选）
   * @returns LLM包装器实例
   */
  createWrapper(provider: string, model?: string, instanceId?: string): ILLMWrapper {
    const client = this.createClient(provider, model);
    const modelConfig = client.getModelConfig();
    const id = instanceId || `${provider}-${model || 'default'}-${Date.now()}`;
    
    return new LLMClientAdapter(client, id, modelConfig);
  }

  /**
   * 批量创建包装器
   * @param configs 包装器配置数组
   * @returns 包装器数组
   */
  createWrappers(configs: Array<{
    provider: string;
    model?: string;
    instanceId?: string;
  }>): ILLMWrapper[] {
    return configs.map(config => 
      this.createWrapper(config.provider, config.model, config.instanceId)
    );
  }

  /**
   * 从配置创建包装器
   * @param config 包装器配置
   * @returns LLM包装器实例
   */
  createWrapperFromConfig(config: {
    provider: string;
    model?: string;
    instanceId?: string;
    weight?: number;
    priority?: number;
    maxRetries?: number;
    timeout?: number;
  }): ILLMWrapper {
    const wrapper = this.createWrapper(
      config.provider,
      config.model,
      config.instanceId
    );

    // 可以在这里添加额外的配置逻辑
    // 例如设置权重、优先级等
    
    return wrapper;
  }

  /**
   * 创建任务组所需的包装器集合
   * @param echelonConfig 层级配置
   * @returns 包装器映射
   */
  createEchelonWrappers(echelonConfig: {
    models: string[];
    concurrency_limit: number;
    rpm_limit: number;
    priority: number;
    timeout: number;
    max_retries: number;
    temperature?: number;
    max_tokens?: number;
  }): Map<string, ILLMWrapper[]> {
    const wrapperMap = new Map<string, ILLMWrapper[]>();

    for (const model of echelonConfig.models) {
      const [provider, modelName] = this.parseModelString(model);
      const wrapper = this.createWrapper(provider, modelName);
      
      if (!wrapperMap.has(model)) {
        wrapperMap.set(model, []);
      }
      wrapperMap.get(model)!.push(wrapper);
    }

    return wrapperMap;
  }

  /**
   * 解析模型字符串
   * @param modelString 模型字符串（格式：provider-model）
   * @returns [provider, model] 元组
   */
  private parseModelString(modelString: string): [string, string] {
    const parts = modelString.split('-');
    if (parts.length < 2) {
      // 如果没有分隔符，假设整个字符串是模型名，使用默认提供商
      return ['openai', modelString];
    }
    
    const provider = parts[0];
    const model = parts.slice(1).join('-');
    return [provider, model];
  }

  /**
   * 获取包装器信息
   * @param provider 提供商名称
   * @param model 模型名称（可选）
   * @returns 包装器信息
   */
  async getWrapperInfo(provider: string, model?: string): Promise<{
    name: string;
    version: string;
    supportedModels: string[];
    features: string[];
    capabilities: any;
  }> {
    const client = this.createClient(provider, model);
    const wrapper = this.createWrapper(provider, model);
    
    const clientInfo = await this.getClientInfo(provider);
    const wrapperInfo = await wrapper.getInfo();
    
    return {
      name: wrapperInfo.name,
      version: wrapperInfo.version,
      supportedModels: clientInfo.supportedModels,
      features: clientInfo.features,
      capabilities: wrapperInfo.capabilities
    };
  }

  /**
   * 健康检查所有包装器
   * @param configs 包装器配置数组
   * @returns 健康检查结果
   */
  async healthCheckAllWrappers(configs: Array<{
    provider: string;
    model?: string;
    instanceId?: string;
  }>): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const config of configs) {
      const key = config.instanceId || `${config.provider}-${config.model || 'default'}`;
      
      try {
        const wrapper = this.createWrapper(config.provider, config.model, config.instanceId);
        results[key] = await wrapper.healthCheck();
      } catch (error) {
        results[key] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    return results;
  }

  /**
   * 创建带权重的包装器
   * @param provider 提供商名称
   * @param model 模型名称（可选）
   * @param weight 权重值
   * @param instanceId 实例ID（可选）
   * @returns 带权重的包装器
   */
  createWeightedWrapper(
    provider: string, 
    model?: string, 
    weight: number = 1,
    instanceId?: string
  ): ILLMWrapper & { weight: number } {
    const wrapper = this.createWrapper(provider, model, instanceId);
    
    // 使用对象扩展添加权重属性
    return Object.assign(wrapper, { weight });
  }

  /**
   * 创建带优先级的包装器
   * @param provider 提供商名称
   * @param model 模型名称（可选）
   * @param priority 优先级值
   * @param instanceId 实例ID（可选）
   * @returns 带优先级的包装器
   */
  createPriorityWrapper(
    provider: string, 
    model?: string, 
    priority: number = 1,
    instanceId?: string
  ): ILLMWrapper & { priority: number } {
    const wrapper = this.createWrapper(provider, model, instanceId);
    
    // 使用对象扩展添加优先级属性
    return Object.assign(wrapper, { priority });
  }

  /**
   * 验证包装器配置
   * @param config 包装器配置
   * @returns 验证结果
   */
  validateWrapperConfig(config: {
    provider: string;
    model?: string;
    instanceId?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.provider) {
      errors.push('Provider is required');
    }

    if (config.provider && !this.getSupportedProviders().includes(config.provider.toLowerCase())) {
      errors.push(`Unsupported provider: ${config.provider}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取推荐的包装器配置
   * @param useCase 使用场景
   * @returns 推荐配置
   */
  getRecommendedWrapperConfig(useCase: 'fast' | 'balanced' | 'powerful'): Array<{
    provider: string;
    model: string;
    weight: number;
    description: string;
  }> {
    switch (useCase) {
      case 'fast':
        return [
          { provider: 'openai', model: 'gpt-4o-mini', weight: 3, description: 'Fast and cost-effective' },
          { provider: 'anthropic', model: 'claude-3-haiku', weight: 2, description: 'Quick responses' },
          { provider: 'gemini', model: 'gemini-2.5-flash', weight: 1, description: 'Rapid processing' }
        ];
      
      case 'balanced':
        return [
          { provider: 'openai', model: 'gpt-4o', weight: 3, description: 'Balanced performance' },
          { provider: 'anthropic', model: 'claude-3-sonnet', weight: 2, description: 'Good balance' },
          { provider: 'gemini', model: 'gemini-2.5-pro', weight: 1, description: 'Reliable choice' }
        ];
      
      case 'powerful':
        return [
          { provider: 'openai', model: 'gpt-5', weight: 3, description: 'Most capable' },
          { provider: 'anthropic', model: 'claude-3-opus', weight: 2, description: 'High performance' },
          { provider: 'gemini', model: 'gemini-3.0-pro', weight: 1, description: 'Advanced features' }
        ];
      
      default:
        return this.getRecommendedWrapperConfig('balanced');
    }
  }
}