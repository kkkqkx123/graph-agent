/**
 * Formatter 抽象基类
 *
 * 定义格式转换器的通用接口和实现
 * 所有提供商的格式转换器都继承自此类
 */

import type { LLMRequest, LLMResult, LLMProfile, LLMMessage, LLMToolCall } from '@modular-agent/types';
import type { ToolSchema } from '@modular-agent/types';
import type {
  HttpRequestOptions,
  StreamChunk,
  FormatterConfig,
  BuildRequestResult,
  ParseResponseResult,
  ParseStreamChunkResult
} from './types.js';

/**
 * 格式转换器抽象基类
 *
 * 职责：
 * 1. 将统一的 LLMRequest 转换为特定提供商的 HTTP 请求格式
 * 2. 将特定提供商的 HTTP 响应转换为统一的 LLMResult
 * 3. 处理流式响应的解析
 *
 * 设计原则：
 * - 单一职责：只负责格式转换，不负责网络请求
 * - 可扩展：子类只需实现特定提供商的转换逻辑
 * - 可测试：纯函数，易于单元测试
 */
export abstract class BaseFormatter {
  /**
   * 获取支持的提供商类型
   */
  abstract getSupportedProvider(): string;

  /**
   * 构建 HTTP 请求
   *
   * @param request 统一的 LLM 请求
   * @param config 格式转换器配置
   * @returns HTTP 请求选项
   */
  abstract buildRequest(request: LLMRequest, config: FormatterConfig): BuildRequestResult;

  /**
   * 解析非流式响应
   *
   * @param data 原始响应数据
   * @param config 格式转换器配置
   * @returns LLM 结果
   */
  abstract parseResponse(data: any, config: FormatterConfig): LLMResult;

  /**
   * 解析流式响应块
   *
   * @param data 原始流式数据
   * @param config 格式转换器配置
   * @returns 流式块解析结果
   */
  abstract parseStreamChunk(data: any, config: FormatterConfig): ParseStreamChunkResult;

  /**
   * 解析流式响应行
   *
   * 默认实现：处理 SSE 格式（data: {...}）
   * 子类可以重写以支持其他格式
   *
   * @param line 流式响应的一行文本
   * @param config 格式转换器配置
   * @returns 流式块解析结果
   */
  parseStreamLine(line: string, config: FormatterConfig): ParseStreamChunkResult {
    // 跳过空行
    if (!line) {
      return { chunk: { done: false }, valid: false };
    }

    // 跳过结束标记（OpenAI 格式）
    if (line === 'data: [DONE]') {
      return { chunk: { done: true }, valid: false };
    }

    // 解析 data: 前缀
    if (!line.startsWith('data: ')) {
      return { chunk: { done: false }, valid: false };
    }

    const dataStr = line.slice(6);
    try {
      const data = JSON.parse(dataStr);
      return this.parseStreamChunk(data, config);
    } catch (e) {
      // 跳过无效 JSON
      return { chunk: { done: false }, valid: false };
    }
  }

  /**
   * 验证配置
   *
   * @param config 格式转换器配置
   * @returns 是否有效
   */
  validateConfig(config: FormatterConfig): boolean {
    if (!config.profile) {
      return false;
    }
    if (!config.profile.model) {
      return false;
    }
    return true;
  }

  /**
   * 转换工具定义为特定提供商格式
   *
   * @param tools 工具定义数组
   * @returns 特定提供商的工具格式
   */
  abstract convertTools(tools: ToolSchema[]): any;

  /**
   * 转换消息为特定提供商格式
   *
   * @param messages 消息数组
   * @returns 特定提供商的消息格式
   */
  abstract convertMessages(messages: LLMMessage[]): any;

  /**
   * 解析工具调用
   *
   * @param data 特定提供商的工具调用数据
   * @returns 统一的工具调用格式
   */
  abstract parseToolCalls(data: any): LLMToolCall[];

  /**
   * 提取系统消息
   *
   * @param messages 消息数组
   * @returns 系统消息和过滤后的消息
   */
  protected extractSystemMessage(messages: LLMMessage[]): {
    systemMessage: LLMMessage | null;
    filteredMessages: LLMMessage[];
  } {
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const filteredMessages = messages.filter(msg => msg.role !== 'system');

    return {
      systemMessage: systemMessages.length > 0 ? systemMessages[systemMessages.length - 1]! : null,
      filteredMessages
    };
  }

  /**
   * 查找最后一组用户消息的索引
   *
   * 用于动态上下文消息的插入位置
   *
   * @param messages 消息数组
   * @returns 最后一组用户消息的起始索引
   */
  protected findLastUserMessageGroupIndex(messages: LLMMessage[]): number {
    // 从后向前查找最后一组连续的用户消息
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === 'user') {
        // 继续向前查找这组用户消息的起始位置
        while (i > 0 && messages[i - 1]!.role === 'user') {
          i--;
        }
        return i;
      }
    }
    return -1;
  }

  /**
   * 清理内部字段
   *
   * 移除消息中不应发送给 API 的内部字段
   *
   * @param messages 消息数组
   * @returns 清理后的消息数组
   */
  protected cleanInternalFields(messages: LLMMessage[]): LLMMessage[] {
    return messages.map(msg => {
      const cleaned: LLMMessage = {
        role: msg.role,
        content: msg.content
      };

      // 保留工具调用相关字段
      if (msg.toolCalls) {
        cleaned.toolCalls = msg.toolCalls;
      }
      if (msg.toolCallId) {
        cleaned.toolCallId = msg.toolCallId;
      }

      return cleaned;
    });
  }

  /**
   * 合并请求参数
   *
   * @param profileParams Profile 中的参数
   * @param requestParams 请求中的参数
   * @returns 合并后的参数
   */
  protected mergeParameters(
    profileParams: Record<string, any> = {},
    requestParams: Record<string, any> = {}
  ): Record<string, any> {
    return {
      ...profileParams,
      ...requestParams
    };
  }
}
