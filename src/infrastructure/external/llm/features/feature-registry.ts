import { IFeature } from './feature.interface';

/**
 * 功能注册表
 * 
 * 管理所有可用的功能特性
 */
export class FeatureRegistry {
  private features = new Map<string, IFeature>();
  private providerFeatures = new Map<string, Set<string>>();

  /**
   * 注册功能
   * @param feature 功能实例
   */
  registerFeature(feature: IFeature): void {
    this.features.set(feature.name, feature);
  }

  /**
   * 获取功能
   * @param name 功能名称
   * @returns 功能实例或 undefined
   */
  getFeature(name: string): IFeature | undefined {
    return this.features.get(name);
  }

  /**
   * 获取提供商支持的功能列表
   * @param provider 提供商名称
   * @returns 功能名称列表
   */
  getSupportedFeatures(provider: string): string[] {
    const supported: string[] = [];

    for (const [name, feature] of this.features) {
      if (feature.isSupported(provider)) {
        supported.push(name);
      }
    }

    return supported;
  }

  /**
   * 检查功能是否支持指定提供商
   * @param featureName 功能名称
   * @param provider 提供商名称
   * @returns 是否支持
   */
  isFeatureSupported(featureName: string, provider: string): boolean {
    const feature = this.features.get(featureName);
    return feature ? feature.isSupported(provider) : false;
  }

  /**
   * 应用所有支持的功能到请求中
   * @param request 请求对象
   * @param provider 提供商名称
   * @param config 配置对象
   * @returns 处理后的请求对象
   */
  applyFeatures(request: any, provider: string, config: any): any {
    let enhancedRequest = { ...request };

    for (const [name, feature] of this.features) {
      if (feature.isSupported(provider)) {
        // 验证功能配置
        const validation = feature.validateConfig(config);
        if (validation.isValid) {
          enhancedRequest = feature.applyToRequest(enhancedRequest, config);
        }
      }
    }

    return enhancedRequest;
  }

  /**
   * 从响应中提取所有功能相关数据
   * @param response 响应对象
   * @param provider 提供商名称
   * @returns 提取的功能数据
   */
  extractFeaturesData(response: any, provider: string): Record<string, any> {
    const extractedData: Record<string, any> = {};

    for (const [name, feature] of this.features) {
      if (feature.isSupported(provider)) {
        const data = feature.extractFromResponse(response);
        if (data !== undefined && data !== null) {
          extractedData[name] = data;
        }
      }
    }

    return extractedData;
  }

  /**
   * 获取所有已注册的功能名称
   * @returns 功能名称列表
   */
  getAllFeatures(): string[] {
    return Array.from(this.features.keys());
  }

  /**
   * 注销功能
   * @param name 功能名称
   */
  unregisterFeature(name: string): void {
    this.features.delete(name);
  }

  /**
   * 清除所有功能
   */
  clear(): void {
    this.features.clear();
    this.providerFeatures.clear();
  }

  /**
   * 获取功能信息
   * @param name 功能名称
   * @returns 功能信息
   */
  getFeatureInfo(name: string): {
    name: string;
    version: string;
    description: string;
    requiredParameters: string[];
    optionalParameters: string[];
  } | undefined {
    const feature = this.features.get(name);
    if (!feature) {
      return undefined;
    }

    return {
      name: feature.name,
      version: feature.version,
      description: feature.description,
      requiredParameters: feature.getRequiredParameters(),
      optionalParameters: feature.getOptionalParameters()
    };
  }

  /**
   * 获取所有功能信息
   * @returns 所有功能信息列表
   */
  getAllFeaturesInfo(): Array<{
    name: string;
    version: string;
    description: string;
    requiredParameters: string[];
    optionalParameters: string[];
  }> {
    const info: Array<{
      name: string;
      version: string;
      description: string;
      requiredParameters: string[];
      optionalParameters: string[];
    }> = [];

    for (const feature of this.features.values()) {
      info.push({
        name: feature.name,
        version: feature.version,
        description: feature.description,
        requiredParameters: feature.getRequiredParameters(),
        optionalParameters: feature.getOptionalParameters()
      });
    }

    return info;
  }
}