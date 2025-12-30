/**
 * 功能接口
 *
 * 定义提供商特有功能的处理方式
 */
export interface IFeature {
  /**
   * 检查功能是否支持指定的提供商
   * @param provider 提供商名称
   * @returns 是否支持
   */
  isSupported(provider: string): boolean;

  /**
   * 将功能应用到请求中
   * @param request 请求对象
   * @param config 配置对象
   * @returns 处理后的请求对象
   */
  applyToRequest(request: any, config: any): any;
}