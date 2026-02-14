/**
 * LLM状态类型定义
 */

/**
 * LLM提供商枚举
 */
export enum LLMProvider {
  /** OpenAI Chat API */
  OPENAI_CHAT = 'OPENAI_CHAT',
  /** OpenAI Response API */
  OPENAI_RESPONSE = 'OPENAI_RESPONSE',
  /** Anthropic */
  ANTHROPIC = 'ANTHROPIC',
  /** Gemini Native API */
  GEMINI_NATIVE = 'GEMINI_NATIVE',
  /** Gemini OpenAI Compatible API */
  GEMINI_OPENAI = 'GEMINI_OPENAI',
  /** 人工中继 */
  HUMAN_RELAY = 'HUMAN_RELAY'
}