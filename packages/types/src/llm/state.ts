/**
 * LLM状态类型定义
 */

/**
 * LLM提供商
 */
export type LLMProvider =
  /** OpenAI Chat API */
  'OPENAI_CHAT' |
  /** OpenAI Response API */
  'OPENAI_RESPONSE' |
  /** Anthropic */
  'ANTHROPIC' |
  /** Gemini Native API */
  'GEMINI_NATIVE' |
  /** Gemini OpenAI Compatible API */
  'GEMINI_OPENAI' |
  /** 人工中继 */
  'HUMAN_RELAY';