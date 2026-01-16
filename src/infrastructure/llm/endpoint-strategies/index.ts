/**
 * 端点策略模块
 *
 * 提供统一的端点构建和认证处理策略
 * 使用 Zod 进行配置验证
 */

// 基础策略和 Schema
export {
  BaseEndpointStrategy,
  BaseEndpointConfigSchema,
  BaseEndpointConfig,
} from './base-endpoint-strategy';

// 策略实现
export {
  OpenAICompatibleEndpointStrategy,
  OpenAICompatibleEndpointConfig,
} from './openai-compatible-endpoint-strategy';
export {
  GeminiNativeEndpointStrategy,
  GeminiNativeEndpointConfig,
} from './gemini-native-endpoint-strategy';
export { AnthropicEndpointStrategy, AnthropicEndpointConfig } from './anthropic-endpoint-strategy';
export {
  OpenAIResponsesEndpointStrategy,
  OpenAIResponsesEndpointConfig,
} from './openai-responses-endpoint-strategy';
export { MockEndpointStrategy, MockEndpointConfig } from './mock-endpoint-strategy';
