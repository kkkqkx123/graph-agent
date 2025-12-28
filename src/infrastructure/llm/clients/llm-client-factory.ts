import { injectable, inject } from 'inversify';
import { BaseLLMClient } from './base-llm-client';
import { OpenAIChatClient } from './openai-chat-client';
import { OpenAIResponseClient } from './openai-response-client';
import { AnthropicClient } from './anthropic-client';
import { GeminiClient } from './gemini-client';
import { GeminiOpenAIClient } from './gemini-openai-client';
import { MockClient } from './mock-client';
import { HumanRelayClient } from './human-relay-client';
import { HumanRelayMode } from '../../../domain/llm/value-objects/human-relay-mode';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';

/**
 * LLM客户端工厂
 * 
 * 提供智能客户端选择机制，根据提供商和模型自动选择合适的客户端
 */

@injectable()
export class LLMClientFactory {
  constructor(
    @inject(LLM_DI_IDENTIFIERS.OpenAIChatClient) private openaiChatClient: OpenAIChatClient,
    @inject(LLM_DI_IDENTIFIERS.OpenAIResponseClient) private openaiResponseClient: OpenAIResponseClient,
    @inject(LLM_DI_IDENTIFIERS.AnthropicClient) private anthropicClient: AnthropicClient,
    @inject(LLM_DI_IDENTIFIERS.GeminiClient) private geminiClient: GeminiClient,
    @inject(LLM_DI_IDENTIFIERS.GeminiOpenAIClient) private geminiOpenAIClient: GeminiOpenAIClient,
    @inject(LLM_DI_IDENTIFIERS.MockClient) private mockClient: MockClient,
    @inject(LLM_DI_IDENTIFIERS.HumanRelayClient) private humanRelayClient: HumanRelayClient,
    @inject(LLM_DI_IDENTIFIERS.ConfigManager) private configManager: any
  ) { }

  /**
   * 创建LLM客户端
   * @param provider 提供商名称
   * @param model 模型名称（必需）
   * @returns LLM客户端实例
   */
  createClient(provider: string, model: string): BaseLLMClient {
    const normalizedProvider = provider.toLowerCase();
    const normalizedModel = model.toLowerCase();

    switch (normalizedProvider) {
      case 'openai':
        return this.selectOpenAIClient(normalizedModel);

      case 'anthropic':
        return this.anthropicClient;

      case 'gemini':
      case 'google':
        return this.selectGeminiClient(normalizedModel);

      case 'mock':
        return this.mockClient;

      case 'human-relay':
        return this.createHumanRelayClient(normalizedModel);

      default:
        throw new Error(`不支持的LLM提供商: ${provider}`);
    }
  }

  /**
   * 根据模型选择OpenAI客户端
   * @param model 模型名称
   * @returns OpenAI客户端实例
   */
  private selectOpenAIClient(model: string): BaseLLMClient {
    if (this.isResponseModel(model)) {
      return this.openaiResponseClient;
    }
    return this.openaiChatClient;
  }

  /**
   * 判断是否为Response模型
   * @param model 模型名称
   * @returns 是否为Response模型
   */
  private isResponseModel(model: string): boolean {
    const responseModels = [
      'gpt-5', 'gpt-5-codex', 'gpt-5.1',
      'gpt-4.5', 'gpt-4.5-turbo',
      'gpt-4-response', 'gpt-4.5-response'
    ];

    const normalizedModel = model.toLowerCase();
    return responseModels.some(responseModel =>
      normalizedModel.includes(responseModel.toLowerCase())
    );
  }

  /**
   * 根据配置选择Gemini客户端
   * @param model 模型名称
   * @returns Gemini客户端实例
   */
  private selectGeminiClient(model: string): BaseLLMClient {
    // 从配置中获取客户端类型
    const clientType = this.configManager.get('llm.gemini.clientType', 'native');

    if (clientType === 'openai-compatible') {
      return this.geminiOpenAIClient;
    }

    return this.geminiClient; // 默认使用原生客户端
  }

  /**
   * 获取所有支持的提供商
   * @returns 提供商列表
   */
  getSupportedProviders(): string[] {
    return ['openai', 'anthropic', 'gemini', 'mock', 'human-relay'];
  }

  /**
   * 获取提供商支持的模型
   * @param provider 提供商名称
   * @param model 模型名称（必需）
   * @returns 模型列表
   */
  async getSupportedModels(provider: string, model: string): Promise<string[]> {
    const normalizedProvider = provider.toLowerCase();
    const client = this.createClient(normalizedProvider, model);
    return client.getSupportedModels();
  }

  /**
   * 检查提供商是否支持特定模型
   * @param provider 提供商名称
   * @param model 模型名称
   * @returns 是否支持
   */
  async isModelSupported(provider: string, model: string): Promise<boolean> {
    try {
      const models = await this.getSupportedModels(provider, model);
      return models.includes(model);
    } catch {
      return false;
    }
  }

  /**
   * 获取客户端信息
   * @param provider 提供商名称
   * @param model 模型名称（必需）
   * @returns 客户端信息
   */
  async getClientInfo(provider: string, model: string): Promise<{
    name: string;
    version: string;
    supportedModels: string[];
    features: string[];
  }> {
    const normalizedProvider = provider.toLowerCase();
    const client = this.createClient(normalizedProvider, model);

    const supportedModels = await client.getSupportedModels();
    return {
      name: client.getClientName(),
      version: client.getClientVersion(),
      supportedModels,
      features: this.getClientFeatures(client)
    };
  }

  /**
   * 获取客户端支持的功能
   * @param client 客户端实例
   * @returns 功能列表
   */
  private getClientFeatures(client: BaseLLMClient): string[] {
    const features: string[] = [];

    // 检查流式响应支持
    features.push('streaming');

    // 检查工具调用支持
    const modelConfig = client.getModelConfig();
    if (modelConfig.supportsTools()) {
      features.push('tools');
    }

    // 检查多模态支持
    if (modelConfig.supportsImages()) {
      features.push('images');
    }

    if (modelConfig.supportsAudio()) {
      features.push('audio');
    }

    if (modelConfig.supportsVideo()) {
      features.push('video');
    }

    return features;
  }

  /**
   * 批量创建客户端
   * @param clientConfigs 客户端配置列表，格式为 [{ provider, model }]
   * @returns 客户端映射
   */
  createClients(clientConfigs: Array<{ provider: string; model: string }>): Record<string, BaseLLMClient> {
    const clients: Record<string, BaseLLMClient> = {};

    for (const config of clientConfigs) {
      try {
        const normalizedProvider = config.provider.toLowerCase();
        const key = `${normalizedProvider}:${config.model}`;
        clients[key] = this.createClient(normalizedProvider, config.model);
      } catch (error) {
        console.warn(`创建客户端失败: ${config.provider}:${config.model}`, error);
      }
    }

    return clients;
  }

  /**
   * 创建HumanRelay客户端
   * @param model 模型名称（single 或 multi）
   * @returns HumanRelay客户端实例
   */
  private createHumanRelayClient(model: string): BaseLLMClient {
    // 根据模型名称确定模式
    let mode: HumanRelayMode;
    switch (model) {
      case 'single':
      case 's':
        mode = HumanRelayMode.SINGLE;
        break;
      case 'multi':
      case 'm':
        mode = HumanRelayMode.MULTI;
        break;
      default:
        mode = HumanRelayMode.SINGLE;
    }

    // 获取HumanRelay配置
    const config = this.configManager.get(`llm.humanRelay`, {});

    // 创建客户端配置
    const clientConfig = {
      providerName: 'human-relay',
      mode,
      maxHistoryLength: config.maxHistoryLength || (mode === HumanRelayMode.MULTI ? 100 : 50),
      defaultTimeout: config.defaultTimeout || (mode === HumanRelayMode.MULTI ? 600 : 300),
      frontendConfig: config.frontendConfig || {}
    };

    // 由于HumanRelayClient已经通过依赖注入创建，这里直接返回
    // 在实际使用中，可能需要创建多个实例或根据配置动态创建
    return this.humanRelayClient;
  }

  /**
   * 获取HumanRelay支持的模型
   * @returns 模型列表
   */
  public getHumanRelayModels(): string[] {
    return ['single', 'multi'];
  }

  /**
   * 检查是否为HumanRelay提供商
   * @param provider 提供商名称
   * @returns 是否为HumanRelay
   */
  public isHumanRelayProvider(provider: string): boolean {
    return provider.toLowerCase() === 'human-relay';
  }
}