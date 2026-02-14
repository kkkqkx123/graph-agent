/**
 * LLM请求类型定义
 */

import type { ID } from '../common';
import type { Message } from '../message';
import type { ToolSchema } from '../tool';

/**
 * LLM请求类型
 */
export interface LLMRequest {
  /** 引用的LLM Profile ID（可选，如果不提供则使用默认配置） */
  profileId?: ID;
  /** 消息数组 */
  messages: Message[];
  /** 请求参数对象（覆盖Profile中的parameters） */
  parameters?: Record<string, any>;
  /** 可用的工具定义 */
  tools?: ToolSchema[];
  /** 是否流式传输 */
  stream?: boolean;
  /** AbortSignal 用于中断请求 */
  signal?: AbortSignal;
}