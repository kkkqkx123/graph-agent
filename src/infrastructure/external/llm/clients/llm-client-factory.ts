import { injectable, inject } from 'inversify';
import { ILLMClient } from '../../../../domain/llm/interfaces/llm-client.interface';
import { OpenAIChatClient } from './openai-chat-client';
import { OpenAIResponseClient } from './openai-response-client';
import { AnthropicClient } from './anthropic-client';
import { GeminiClient } from './gemini-client';
import { GeminiOpenAIClient } from './gemini-openai-client';
import { MockClient } from './mock-client';
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
    @inject(LLM_DI_IDENTIFIERS.ConfigManager) private configManager: any
  ) { }

  /**
   * 创建LLM客户端
   * @param provider 提供商名称
   * @param model 模型名称（可选）
   * @returns LLM客户端实例
   */
  createClient(provider: string, model?: string): ILLMClient {
    const normalizedProvider = provider.toLowerCase();

    switch (normalizedProvider) {
      case 'openai':
        return this.selectOpenAIClient(model);

      case 'anthropic':
        return this.anthropicClient;

      case 'gemini':
      case 'google':
        return this.selectGeminiClient(model);

      case 'mock':
        return this.mockClient;

      default:
        throw new Error(`不支持的LLM提供商: ${provider}`);
    }
  }

  /**
   * 根据模型选择OpenAI客户端
   * @param model 模型名称
   * @returns OpenAI客户端实例
   */
  private selectOpenAIClient(model?: string): ILLMClient {
    if (model && this.isResponseModel(model)) {
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
  private selectGeminiClient(model?: string): ILLMClient {
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
    return ['openai', 'anthropic', 'gemini', 'mock'];
  }

  /**
   * 获取提供商支持的模型
   * @param provider 提供商名称
   * @returns 模型列表
   */
  async getSupportedModels(provider: string): Promise<string[]> {
    const client = this.createClient(provider);
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
      const models = await this.getSupportedModels(provider);
      return models.includes(model);
    } catch {
      return false;
    }
  }

  /**
   * 获取客户端信息
   * @param provider 提供商名称
   * @returns 客户端信息
   */
  async getClientInfo(provider: string): Promise<{
    name: string;
    version: string;
    supportedModels: string[];
    features: string[];
  }> {
    const client = this.createClient(provider);

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
  private getClientFeatures(client: ILLMClient): string[] {
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
   * @param providers 提供商列表
   * @returns 客户端映射
   */
  createClients(providers: string[]): Record<string, ILLMClient> {
    const clients: Record<string, ILLMClient> = {};

    for (const provider of providers) {
      try {
        clients[provider] = this.createClient(provider);
      } catch (error) {
        console.warn(`创建客户端失败: ${provider}`, error);
      }
    }

    return clients;
  }

  /**
   * 健康检查所有客户端
   * @returns 健康检查结果
   */
  async healthCheckAll(): Promise<Record<string, any>> {
    const providers = this.getSupportedProviders();
    const results: Record<string, any> = {};

    for (const provider of providers) {
      try {
        const client = this.createClient(provider);
        results[provider] = await client.healthCheck();
      } catch (error) {
        results[provider] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    return results;
  }
}