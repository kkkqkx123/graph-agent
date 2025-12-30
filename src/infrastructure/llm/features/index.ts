/**
 * 功能注册系统模块
 *
 * 提供统一的功能注册和管理机制，用于处理提供商特有功能
 */

import { FeatureRegistry } from './feature-registry';
import { GeminiThinkingBudgetFeature } from './gemini-thinking-budget-feature';
import { GeminiCachedContentFeature } from './gemini-cached-content-feature';
import { OpenAIResponseFormatFeature } from './openai-response-format-feature';
import { AnthropicSystemMessageFeature } from './anthropic-system-message-feature';

export { IFeature } from './feature.interface';
export { FeatureRegistry } from './feature-registry';
export { GeminiThinkingBudgetFeature } from './gemini-thinking-budget-feature';
export { GeminiCachedContentFeature } from './gemini-cached-content-feature';
export { OpenAIResponseFormatFeature } from './openai-response-format-feature';
export { AnthropicSystemMessageFeature } from './anthropic-system-message-feature';

/**
 * 创建并初始化功能注册表
 * @returns 初始化后的功能注册表
 */
export function createFeatureRegistry(): FeatureRegistry {
  const registry = new FeatureRegistry();
  registry.registerFeature(new GeminiThinkingBudgetFeature());
  registry.registerFeature(new GeminiCachedContentFeature());
  registry.registerFeature(new OpenAIResponseFormatFeature());
  registry.registerFeature(new AnthropicSystemMessageFeature());
  return registry;
}