/**
 * LLM客户端工厂
 *
 * 负责创建不同provider的客户端实例
 * 使用工厂模式创建客户端，缓存客户端实例以提高性能
 */

import type { LLMClient, LLMProfile } from '../../types/llm';
import { LLMProvider } from '../../types/llm';
import { OpenAIChatClient } from './clients/openai-chat';
import { OpenAIResponseClient } from './clients/openai-response';
import { AnthropicClient } from './clients/anthropic';
import { GeminiNativeClient } from './clients/gemini-native';
import { GeminiOpenAIClient } from './clients/gemini-openai';
// import { HumanRelayClient } from './clients/human-relay'; // TODO: 实现HumanRelayClient
import { ConfigurationError } from '../../types/errors';

/**
 * 客户端工厂类
 */
export class ClientFactory {
  private clientCache: Map<string, LLMClient> = new Map();

  /**
   * 创建LLM客户端
   * 
   * @param profile LLM Profile配置
   * @returns LLM客户端实例
   */
  createClient(profile: LLMProfile): LLMClient {
    const cacheKey = this.getCacheKey(profile);

    // 检查缓存
    const cachedClient = this.clientCache.get(cacheKey);
    if (cachedClient) {
      return cachedClient;
    }

    // 创建新客户端
    const client = this.createClientByProvider(profile);

    // 缓存客户端
    this.clientCache.set(cacheKey, client);

    return client;
  }

  /**
   * 根据provider创建对应的客户端
   */
  private createClientByProvider(profile: LLMProfile): LLMClient {
    switch (profile.provider) {
      case LLMProvider.OPENAI_CHAT:
        return new OpenAIChatClient(profile);

      case LLMProvider.OPENAI_RESPONSE:
        return new OpenAIResponseClient(profile);

      case LLMProvider.ANTHROPIC:
        return new AnthropicClient(profile);

      case LLMProvider.GEMINI_NATIVE:
        return new GeminiNativeClient(profile);

      case LLMProvider.GEMINI_OPENAI:
        return new GeminiOpenAIClient(profile);

      case LLMProvider.HUMAN_RELAY:
        // TODO: 实现HumanRelayClient
        throw new ConfigurationError(
          `HumanRelayClient 尚未实现`,
          'provider',
          { provider: profile.provider }
        );

      default:
        throw new ConfigurationError(
          `不支持的LLM提供商: ${profile.provider}`,
          'provider',
          { 
            provider: profile.provider,
            model: profile.model,
            supportedProviders: Object.values(LLMProvider)
          }
        );
    }
  }

  /**
   * 获取缓存的客户端
   * 
   * @param profileId Profile ID
   * @returns LLM客户端实例或undefined
   */
  getClient(profileId: string): LLMClient | undefined {
    for (const [key, client] of this.clientCache.entries()) {
      if (key.startsWith(profileId)) {
        return client;
      }
    }
    return undefined;
  }

  /**
   * 清除客户端缓存
   */
  clearCache(): void {
    this.clientCache.clear();
  }

  /**
   * 清除指定Profile的客户端缓存
   * 
   * @param profileId Profile ID
   */
  clearClientCache(profileId: string): void {
    for (const key of this.clientCache.keys()) {
      if (key.startsWith(profileId)) {
        this.clientCache.delete(key);
      }
    }
  }

  /**
   * 获取缓存键
   *
   * 使用Profile ID作为唯一缓存键，因为ID本身已保证唯一性
   */
  private getCacheKey(profile: LLMProfile): string {
    return profile.id;
  }

  /**
   * 获取缓存统计信息
   *
   * @returns 缓存统计
   */
  getCacheStats(): {
    totalClients: number;
    clientsByProvider: Record<string, number>;
  } {
    const clientsByProvider: Record<string, number> = {};

    for (const [key, client] of this.clientCache.entries()) {
      // 从缓存的客户端实例中获取provider信息
      const provider = (client as any).profile?.provider || 'unknown';
      clientsByProvider[provider] = (clientsByProvider[provider] || 0) + 1;
    }

    return {
      totalClients: this.clientCache.size,
      clientsByProvider
    };
  }
}