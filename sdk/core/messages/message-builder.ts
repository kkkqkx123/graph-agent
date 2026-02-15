/**
 * 消息构建器
 * 提供统一的消息构建接口
 */

import type { LLMMessage, LLMToolCall, MessageRole } from '@modular-agent/types';
import type { ToolExecutionResult } from '@modular-agent/types';

/**
 * 消息构建器类
 * 
 * 职责：
 * - 统一消息构建接口
 * - 提供各种消息类型的构建方法
 */
export class MessageBuilder {
  /**
   * 构建用户消息
   * @param content 消息内容
   * @returns 用户消息
   */
  static buildUserMessage(content: string): LLMMessage {
    return {
      role: 'user' as MessageRole.USER,
      content
    };
  }

  /**
   * 构建助手消息
   * @param content 消息内容
   * @param toolCalls 工具调用数组（可选）
   * @param thinking 思考内容（可选）
   * @returns 助手消息
   */
  static buildAssistantMessage(
    content: string,
    toolCalls?: LLMToolCall[],
    thinking?: string
  ): LLMMessage {
    const message: LLMMessage = {
      role: 'assistant' as MessageRole.ASSISTANT,
      content
    };

    if (toolCalls && toolCalls.length > 0) {
      message.toolCalls = toolCalls;
    }

    if (thinking) {
      message.thinking = thinking;
    }

    return message;
  }

  /**
   * 构建工具结果消息
   * @param toolCallId 工具调用ID
   * @param result 工具执行结果
   * @returns 工具结果消息
   */
  static buildToolMessage(
    toolCallId: string,
    result: ToolExecutionResult
  ): LLMMessage {
    const content = result.success
      ? JSON.stringify(result.result)
      : JSON.stringify({ error: result.error });

    return {
      role: 'tool' as MessageRole.TOOL,
      content,
      toolCallId
    };
  }

  /**
   * 构建系统消息
   * @param content 消息内容
   * @returns 系统消息
   */
  static buildSystemMessage(content: string): LLMMessage {
    return {
      role: 'system' as MessageRole.SYSTEM,
      content
    };
  }

  /**
   * 构建工具描述消息
   * @param descriptionText 工具描述文本
   * @returns 工具描述消息，如果描述为空则返回null
   */
  static buildToolDescriptionMessage(descriptionText: string): LLMMessage | null {
    if (!descriptionText) {
      return null;
    }

    return {
      role: 'system' as MessageRole.SYSTEM,
      content: descriptionText
    };
  }
}