/**
 * 端点策略模块
 * 
 * 提供统一的端点构建和认证处理策略
 */

export { IEndpointStrategy } from './interfaces/endpoint-strategy.interface';
export { BaseEndpointStrategy } from './base/base-endpoint-strategy';
export { OpenAICompatibleEndpointStrategy } from './providers/openai-compatible-endpoint-strategy';
export { GeminiNativeEndpointStrategy } from './providers/gemini-native-endpoint-strategy';
export { AnthropicEndpointStrategy } from './providers/anthropic-endpoint-strategy';

export { EndpointStrategyFactory } from './factory/endpoint-strategy-factory';