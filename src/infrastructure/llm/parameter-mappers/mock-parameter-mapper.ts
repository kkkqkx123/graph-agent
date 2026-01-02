import { z } from 'zod';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { BaseParameterMapper, ProviderRequest, ProviderResponse, BaseParameterSchema } from './base-parameter-mapper';
import { ProviderConfig } from './interfaces/provider-config.interface';

/**
 * Mock 参数 Schema
 * Mock mapper 使用基础 schema，因为它是用于测试的简单实现
 */
const MockParameterSchema = BaseParameterSchema;

/**
 * Mock 参数映射器
 *
 * 用于测试和模拟场景
 * 使用 zod 进行参数验证，移除硬编码的默认值
 */
export class MockParameterMapper extends BaseParameterMapper {
  constructor() {
    super('MockParameterMapper', '2.0.0', MockParameterSchema);
  }

  /**
   * 将标准 LLM 请求映射为 Mock 请求格式
   */
  mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest {
    // Mock 客户端直接返回请求，不需要转换
    const mockRequest: ProviderRequest = {
      model: request.model,
      messages: request.messages
    };

    // 仅在值存在时添加可选参数
    this.addOptionalParam(mockRequest, 'temperature', request.temperature);
    this.addOptionalParam(mockRequest, 'max_tokens', request.maxTokens);
    this.addOptionalParam(mockRequest, 'stream', request.stream);

    return mockRequest;
  }

  /**
   * 将 Mock 响应映射为标准 LLM 响应格式
   */
  mapFromResponse(response: ProviderResponse, originalRequest: LLMRequest): LLMResponse {
    // Mock 客户端直接返回响应，不需要转换
    return response as LLMResponse;
  }
}