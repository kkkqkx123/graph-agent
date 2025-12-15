/**
 * 功能注册系统模块
 * 
 * 提供统一的功能注册和管理机制，用于处理提供商特有功能
 */

export { IFeature } from './feature.interface';
export { FeatureRegistry } from './feature-registry';
export { GeminiThinkingBudgetFeature } from './providers/gemini-thinking-budget-feature';
export { GeminiCachedContentFeature } from './providers/gemini-cached-content-feature';
export { OpenAIResponseFormatFeature } from './providers/openai-response-format-feature';
export { AnthropicSystemMessageFeature } from './providers/anthropic-system-message-feature';

export { FeatureFactory } from './feature-factory';