import { IFeature } from './feature.interface';

/**
 * 功能注册表
 *
 * 管理所有可用的功能特性
 */
export class FeatureRegistry {
  private features: IFeature[] = [];

  /**
   * 注册功能
   * @param feature 功能实例
   */
  registerFeature(feature: IFeature): void {
    this.features.push(feature);
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

    for (const feature of this.features) {
      if (feature.isSupported(provider)) {
        enhancedRequest = feature.applyToRequest(enhancedRequest, config);
      }
    }

    return enhancedRequest;
  }
}