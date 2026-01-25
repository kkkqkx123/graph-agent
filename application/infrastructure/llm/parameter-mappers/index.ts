/**
 * 参数映射器模块
 *
 * 提供统一的参数映射接口和实现，用于将标准 LLM 请求转换为特定提供商的请求格式
 * 使用 zod 进行参数验证，移除硬编码的默认值
 */

export {
  BaseParameterMapper,
  ProviderRequest,
  ProviderResponse,
  BaseParameterSchema,
  ParameterValidationResult,
} from './base-parameter-mapper';
export {
  ProviderConfig,
  ApiType,
  ProviderConfigBuilder,
} from './interfaces/provider-config.interface';
export { FeatureSupport, BaseFeatureSupport } from './interfaces/feature-support.interface';

export { OpenAIParameterMapper } from './openai-parameter-mapper';
export { AnthropicParameterMapper } from './anthropic-parameter-mapper';
export { GeminiParameterMapper } from './gemini-parameter-mapper';
export { MockParameterMapper } from './mock-parameter-mapper';
