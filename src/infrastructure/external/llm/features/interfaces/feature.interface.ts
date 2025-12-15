/**
 * 功能接口
 * 
 * 定义提供商特有功能的处理方式
 */
export interface IFeature {
  /**
   * 功能名称
   */
  name: string;

  /**
   * 功能版本
   */
  version: string;

  /**
   * 功能描述
   */
  description: string;

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

  /**
   * 从响应中提取功能相关数据
   * @param response 响应对象
   * @returns 提取的功能数据
   */
  extractFromResponse(response: any): any;

  /**
   * 验证功能配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validateConfig(config: any): {
    isValid: boolean;
    errors: string[];
  };

  /**
   * 获取功能所需的参数定义
   * @returns 参数定义列表
   */
  getRequiredParameters(): string[];

  /**
   * 获取功能可选的参数定义
   * @returns 参数定义列表
   */
  getOptionalParameters(): string[];
}