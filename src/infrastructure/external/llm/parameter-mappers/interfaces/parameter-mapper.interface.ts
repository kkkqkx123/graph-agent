import { LLMRequest } from '../../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../../domain/llm/entities/llm-response';
import { ProviderConfig } from './provider-config.interface';
import { ParameterDefinition } from './parameter-definition.interface';

// 重新导出以保持向后兼容性
export { ParameterDefinition, ProviderConfig };

/**
 * 提供商请求接口
 */
export interface ProviderRequest {
  [key: string]: any;
}

/**
 * 提供商响应接口
 */
export interface ProviderResponse {
  [key: string]: any;
}

/**
 * 参数映射器接口
 * 
 * 负责将标准 LLM 请求转换为特定提供商的请求格式，并将提供商响应转换回标准格式
 */
export interface IParameterMapper {
  /**
   * 将标准 LLM 请求映射为提供商请求格式
   * @param request 标准 LLM 请求
   * @param providerConfig 提供商配置
   * @returns 提供商请求
   */
  mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest;

  /**
   * 将提供商响应映射为标准 LLM 响应格式
   * @param response 提供商响应
   * @param originalRequest 原始请求
   * @returns 标准 LLM 响应
   */
  mapFromResponse(response: ProviderResponse, originalRequest: LLMRequest): LLMResponse;

  /**
   * 获取支持的参数定义列表
   * @returns 参数定义列表
   */
  getSupportedParameters(): ParameterDefinition[];

  /**
   * 验证请求参数
   * @param request 请求
   * @returns 验证结果
   */
  validateRequest(request: LLMRequest): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };

  /**
   * 获取映射器名称
   * @returns 映射器名称
   */
  getName(): string;

  /**
   * 获取映射器版本
   * @returns 映射器版本
   */
  getVersion(): string;
}
