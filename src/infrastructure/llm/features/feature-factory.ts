import { IFeature } from './feature.interface';
import { FeatureRegistry } from './feature-registry';
import { GeminiThinkingBudgetFeature } from './gemini-thinking-budget-feature';
import { GeminiCachedContentFeature } from './gemini-cached-content-feature';
import { OpenAIResponseFormatFeature } from './openai-response-format-feature';
import { AnthropicSystemMessageFeature } from './anthropic-system-message-feature';

/**
 * 功能工厂
 * 
 * 负责创建和管理功能实例
 */
export class FeatureFactory {
  private static registry = new FeatureRegistry();
  private static initialized = false;

  /**
   * 初始化默认功能
   */
  private static initialize(): void {
    if (FeatureFactory.initialized) {
      return;
    }

    // 注册默认功能
    FeatureFactory.registry.registerFeature(new GeminiThinkingBudgetFeature());
    FeatureFactory.registry.registerFeature(new GeminiCachedContentFeature());
    FeatureFactory.registry.registerFeature(new OpenAIResponseFormatFeature());
    FeatureFactory.registry.registerFeature(new AnthropicSystemMessageFeature());

    FeatureFactory.initialized = true;
  }

  /**
   * 获取功能注册表
   * @returns 功能注册表实例
   */
  static getRegistry(): FeatureRegistry {
    FeatureFactory.initialize();
    return FeatureFactory.registry;
  }

  /**
   * 获取功能
   * @param name 功能名称
   * @returns 功能实例
   */
  static getFeature(name: string): IFeature | undefined {
    FeatureFactory.initialize();
    return FeatureFactory.registry.getFeature(name);
  }

  /**
   * 注册功能
   * @param feature 功能实例
   */
  static registerFeature(feature: IFeature): void {
    FeatureFactory.initialize();
    FeatureFactory.registry.registerFeature(feature);
  }

  /**
   * 获取提供商支持的功能列表
   * @param provider 提供商名称
   * @returns 功能名称列表
   */
  static getSupportedFeatures(provider: string): string[] {
    FeatureFactory.initialize();
    return FeatureFactory.registry.getSupportedFeatures(provider);
  }

  /**
   * 应用所有支持的功能到请求中
   * @param request 请求对象
   * @param provider 提供商名称
   * @param config 配置对象
   * @returns 处理后的请求对象
   */
  static applyFeatures(request: any, provider: string, config: any): any {
    FeatureFactory.initialize();
    return FeatureFactory.registry.applyFeatures(request, provider, config);
  }

  /**
   * 从响应中提取所有功能相关数据
   * @param response 响应对象
   * @param provider 提供商名称
   * @returns 提取的功能数据
   */
  static extractFeaturesData(response: any, provider: string): Record<string, any> {
    FeatureFactory.initialize();
    return FeatureFactory.registry.extractFeaturesData(response, provider);
  }

  /**
   * 检查功能是否支持指定提供商
   * @param featureName 功能名称
   * @param provider 提供商名称
   * @returns 是否支持
   */
  static isFeatureSupported(featureName: string, provider: string): boolean {
    FeatureFactory.initialize();
    return FeatureFactory.registry.isFeatureSupported(featureName, provider);
  }

  /**
   * 获取所有已注册的功能名称
   * @returns 功能名称列表
   */
  static getAllFeatures(): string[] {
    FeatureFactory.initialize();
    return FeatureFactory.registry.getAllFeatures();
  }

  /**
   * 获取功能信息
   * @param name 功能名称
   * @returns 功能信息
   */
  static getFeatureInfo(name: string) {
    FeatureFactory.initialize();
    return FeatureFactory.registry.getFeatureInfo(name);
  }

  /**
   * 获取所有功能信息
   * @returns 所有功能信息列表
   */
  static getAllFeaturesInfo() {
    FeatureFactory.initialize();
    return FeatureFactory.registry.getAllFeaturesInfo();
  }

  /**
   * 清除所有功能
   */
  static clear(): void {
    FeatureFactory.registry.clear();
    FeatureFactory.initialized = false;
  }

  /**
   * 重新初始化工厂
   */
  static reinitialize(): void {
    FeatureFactory.clear();
    FeatureFactory.initialize();
  }
}