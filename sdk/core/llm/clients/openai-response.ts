/**
 * OpenAI Response客户端实现
 *
 * 实现OpenAI Response API调用，使用/responses端点
 * 支持reasoning_effort、previous_response_id等特殊参数
 * 支持流式和非流式调用
 */

import { BaseLLMClient } from '../base-client.js';
import { OpenAIResponseFormatter } from '../formatters/index.js';
import type { LLMProfile } from '@modular-agent/types';

/**
 * OpenAI Response客户端
 */
export class OpenAIResponseClient extends BaseLLMClient {
  constructor(profile: LLMProfile) {
    super(profile, new OpenAIResponseFormatter());
  }
}
