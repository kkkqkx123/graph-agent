/**
 * 转换器工厂
 * 
 * 提供转换器的创建和注册功能
 */

import { MessageConverter } from './message-converter';
import { IProvider } from './base';

/**
 * 转换器工厂类
 */
export class ConverterFactory {
  private static instance: ConverterFactory;
  private providers: Map<string, new () => IProvider> = new Map();
  private messageConverter: MessageConverter | null = null;

  private constructor() {
    this.registerDefaultProviders();
  }

  /**
   * 获取工厂实例（单例模式）
   */
  public static getInstance(): ConverterFactory {
    if (!ConverterFactory.instance) {
      ConverterFactory.instance = new ConverterFactory();
    }
    return ConverterFactory.instance;
  }

  /**
   * 注册默认提供商
   */
  private registerDefaultProviders(): void {
    try {
      // 动态导入提供商实现
      import('./providers/openai-provider').then(module => {
        this.registerProvider('openai', module.OpenAIProvider);
      }).catch(error => {
        console.warn('无法加载OpenAI提供商:', error);
      });

      import('./providers/anthropic-provider').then(module => {
        this.registerProvider('anthropic', module.AnthropicProvider);
      }).catch(error => {
        console.warn('无法加载Anthropic提供商:', error);
      });

      import('./providers/gemini-provider').then(module => {
        this.registerProvider('gemini', module.GeminiProvider);
      }).catch(error => {
        console.warn('无法加载Gemini提供商:', error);
      });

      import('./providers/openai-responses-provider').then(module => {
        this.registerProvider('openai-responses', module.OpenAIResponsesProvider);
      }).catch(error => {
        console.warn('无法加载OpenAI Responses提供商:', error);
      });
    } catch (error) {
      // 如果提供商模块不存在，跳过注册
      console.warn('无法加载默认提供商:', error);
    }
  }

  /**
   * 注册提供商
   */
  public registerProvider(name: string, providerClass: new () => IProvider): void {
    if (this.providers.has(name)) {
      throw new Error(`提供商 ${name} 已经注册`);
    }
    
    this.providers.set(name, providerClass);
    
    // 如果消息转换器已创建，更新其提供商注册
    if (this.messageConverter) {
      const providerInstance = new providerClass();
      this.messageConverter.registerProvider(name, providerInstance);
    }
  }

  /**
   * 移除提供商
   */
  public unregisterProvider(name: string): void {
    this.providers.delete(name);
    
    // 如果消息转换器已创建，更新其提供商注册
    if (this.messageConverter) {
      this.messageConverter.unregisterProvider(name);
    }
  }

  /**
   * 创建提供商实例
   */
  public createProvider(name: string): IProvider | null {
    const ProviderClass = this.providers.get(name);
    if (!ProviderClass) {
      return null;
    }

    try {
      return new ProviderClass();
    } catch (error) {
      console.error(`创建提供商 ${name} 失败:`, error);
      return null;
    }
  }

  /**
   * 获取消息转换器
   */
  public getMessageConverter(): MessageConverter {
    if (!this.messageConverter) {
      this.messageConverter = new MessageConverter();
      this.initializeMessageConverter();
    }
    return this.messageConverter;
  }

  /**
   * 初始化消息转换器
   */
  private initializeMessageConverter(): void {
    if (!this.messageConverter) return;

    // 注册所有已注册的提供商
    for (const [name, ProviderClass] of this.providers.entries()) {
      try {
        const providerInstance = new ProviderClass();
        this.messageConverter!.registerProvider(name, providerInstance);
      } catch (error) {
        console.error(`初始化提供商 ${name} 失败:`, error);
      }
    }
  }

  /**
   * 获取所有已注册的提供商名称
   */
  public getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 检查提供商是否已注册
   */
  public hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * 获取提供商类
   */
  public getProviderClass(name: string): (new () => IProvider) | null {
    return this.providers.get(name) || null;
  }

  /**
   * 重置工厂（主要用于测试）
   */
  public reset(): void {
    this.providers.clear();
    this.messageConverter = null;
    // 不重新注册默认提供商，避免重复注册警告
  }
}

/**
 * 便捷函数：获取消息转换器
 */
export function getMessageConverter(): MessageConverter {
  return ConverterFactory.getInstance().getMessageConverter();
}

/**
 * 便捷函数：创建提供商
 */
export function createProvider(name: string): IProvider | null {
  return ConverterFactory.getInstance().createProvider(name);
}

/**
 * 便捷函数：注册提供商
 */
export function registerProvider(name: string, providerClass: new () => IProvider): void {
  ConverterFactory.getInstance().registerProvider(name, providerClass);
}

/**
 * 便捷函数：移除提供商
 */
export function unregisterProvider(name: string): void {
  ConverterFactory.getInstance().unregisterProvider(name);
}

/**
 * 便捷函数：获取已注册的提供商列表
 */
export function getRegisteredProviders(): string[] {
  return ConverterFactory.getInstance().getRegisteredProviders();
}