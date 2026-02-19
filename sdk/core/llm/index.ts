/**
 * SDK Core LLM模块
 *
 * 提供统一的LLM调用接口，支持多种LLM提供商
 */

// SDK级别核心类
export { LLMWrapper } from './wrapper.js';
export { ProfileManager } from './profile-manager.js';

// 基础设施
export { ClientFactory } from './client-factory.js';
export { BaseLLMClient } from './base-client.js';
export { MessageStream } from './message-stream.js';

// 事件类型
export {
  MessageStreamEventType,
  type MessageStreamEvent,
  type MessageStreamStreamEvent,
  type MessageStreamTextEvent,
  type MessageStreamInputJsonEvent,
  type MessageStreamMessageEvent,
  type MessageStreamFinalMessageEvent,
  type MessageStreamErrorEvent,
  type MessageStreamAbortEvent,
  type MessageStreamEndEvent
} from './message-stream-events.js';

// 工具函数
export * from './message-helper.js';

// OpenAI客户端
export { OpenAIChatClient } from './clients/openai-chat.js';
export { OpenAIResponseClient } from './clients/openai-response.js';

// Anthropic客户端
export { AnthropicClient } from './clients/anthropic.js';

// Gemini客户端
export { GeminiNativeClient } from './clients/gemini-native.js';
export { GeminiOpenAIClient } from './clients/gemini-openai.js';