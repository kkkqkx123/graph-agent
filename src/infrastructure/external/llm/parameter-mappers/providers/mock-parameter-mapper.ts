import { LLMRequest } from '../../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../../domain/llm/entities/llm-response';
import { BaseParameterMapper } from '../base-parameter-mapper';
import { ProviderConfig, ProviderRequest, ProviderResponse } from '../interfaces/parameter-mapper.interface';

/**
 * Mock 参数映射器
 * 
 * 用于测试和模拟场景
 */
export class MockParameterMapper extends BaseParameterMapper {
  constructor() {
    super('MockParameterMapper', '1.0.0');
  }

  /**
    * 将标准 LLM 请求映射为 Mock 请求格式
    */
  mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest {
    // Mock 客户端直接返回请求，不需要转换
    return {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
      stream: request.stream || false
    };
  }

  /**
    * 将 Mock 响应映射为标准 LLM 响应格式
    */
  mapFromResponse(response: ProviderResponse, originalRequest: LLMRequest): LLMResponse {
    // Mock 客户端直接返回响应，不需要转换
    return response as LLMResponse;
  }
}