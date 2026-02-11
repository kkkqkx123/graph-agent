/**
 * SDK Core LLM模块
 *
 * 提供统一的LLM调用接口，支持多种LLM提供商
 */

// SDK级别核心类
export { LLMWrapper } from './wrapper';
export { ProfileManager } from './profile-manager';

// 基础设施（从common-utils导入）
export { ClientFactory } from '@modular-agent/common-utils';
export { BaseLLMClient } from '@modular-agent/common-utils';
export { MessageStream } from '@modular-agent/common-utils';

// 事件类型（从common-utils导入）
export {
  MessageStreamEventType,
  type MessageStreamEvent,
  type MessageStreamConnectEvent,
  type MessageStreamStreamEvent,
  type MessageStreamTextEvent,
  type MessageStreamToolCallEvent,
  type MessageStreamMessageEvent,
  type MessageStreamFinalMessageEvent,
  type MessageStreamErrorEvent,
  type MessageStreamAbortEvent,
  type MessageStreamEndEvent
} from '@modular-agent/common-utils';

// OpenAI客户端（从common-utils导入）
export { OpenAIChatClient } from '@modular-agent/common-utils';
export { OpenAIResponseClient } from '@modular-agent/common-utils';

// Anthropic客户端（从common-utils导入）
export { AnthropicClient } from '@modular-agent/common-utils';

// Gemini客户端（从common-utils导入）
export { GeminiNativeClient } from '@modular-agent/common-utils';
export { GeminiOpenAIClient } from '@modular-agent/common-utils';