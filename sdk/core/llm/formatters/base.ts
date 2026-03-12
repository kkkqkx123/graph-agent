/**
 * Formatter 抽象基类
 *
 * 定义格式转换器的通用接口和实现
 * 所有提供商的格式转换器都继承自此类
 */

import type { LLMRequest, LLMResult, LLMProfile, LLMMessage, LLMToolCall } from '@modular-agent/types';
import { logger } from '../../../utils/logger.js';
import { getErrorOrNew } from '@modular-agent/common-utils';
import type { ToolSchema } from '@modular-agent/types';
import type {
  FormatterConfig,
  BuildRequestResult,
  ParseStreamChunkResult
} from './types.js';
import { ToolCallParser, type ToolCallParseOptions } from './tool-call-parser.js';

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
    return this.deepMerge({ ...profileParams }, requestParams);
  }

  /**
   * 深度合并两个对象
   *
   * 用于合并请求参数,支持嵌套对象的深度合并
   *
   * @param target 目标对象
   * @param source 源对象
   * @returns 合并后的对象
   */
  protected deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) {
      return target;
    }

    // If target is an array, merge source into it
    if (Array.isArray(target)) {
      const sourceItems = Array.isArray(source) ? source : [source];
      return [...target, ...sourceItems];
    }

    // If source is an array (but target is not), use override strategy
    if (Array.isArray(source)) {
      return source;
    }

    // If source is not an object, override directly
    if (typeof source !== 'object') {
      return source;
    }

    // If target is not an object, initialize as empty object
    if (typeof target !== 'object' || target === null) {
      target = {};
    }

    const result = { ...target };

    for (const key of Object.keys(source)) {
      // Recursively merge all child nodes
      result[key] = this.deepMerge(result[key], source[key]);
    }

    return result;
  }

  /**
   * 构建认证头
   *
   * 根据配置选择认证方式
   *
   * @param apiKey API Key
   * @param config 格式转换器配置
   * @param nativeHeaderName 原生认证头名称 (如 'x-api-key', 'x-goog-api-key')
   * @returns 认证头键值对
   */
  protected buildAuthHeader(
    apiKey: string | undefined,
    config: FormatterConfig,
    nativeHeaderName: string
  ): Record<string, string> {
    if (!apiKey) {
      return {};
    }

    const authType = config.authType || 'native';

    if (authType === 'bearer') {
      return { 'Authorization': `Bearer ${apiKey}` };
    } else {
      return { [nativeHeaderName]: apiKey };
    }
  }

  /**
   * 构建自定义请求头
   *
   * 合并自定义请求头配置
   *
   * @param config 格式转换器配置
   * @returns 自定义请求头
   */
  protected buildCustomHeaders(config: FormatterConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    // 处理简化版自定义请求头
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }

    // 处理完整版自定义请求头
    if (config.customHeadersList && config.customHeadersList.length > 0) {
      for (const header of config.customHeadersList) {
        // 只添加启用的、有键名的请求头
        if (header.enabled !== false && header.key && header.key.trim()) {
          headers[header.key.trim()] = header.value || '';
        }
      }
    }

    return headers;
  }

  /**
   * 应用自定义请求体
   *
   * 合并自定义请求体配置
   *
   * @param baseBody 基础请求体
   * @param config 格式转换器配置
   * @returns 合并后的请求体
   */
  protected applyCustomBody(baseBody: any, config: FormatterConfig): any {
    // 如果未启用自定义请求体,直接返回
    if (config.customBodyEnabled === false) {
      return baseBody;
    }

    let result = { ...baseBody };

    // 处理简化版自定义请求体
    if (config.customBody) {
      result = this.deepMerge(result, config.customBody);
    }

    // 处理完整版自定义请求体
    if (config.customBodyConfig) {
      const customBody = config.customBodyConfig;

      if (customBody.mode === 'simple' && customBody.items) {
        // 简单模式: 遍历所有项
        for (const item of customBody.items) {
          if (item.enabled === false || !item.key || !item.key.trim()) {
            continue;
          }

          const rawKey = item.key.trim();
          let value: any;

          // 尝试解析值为 JSON
          try {
            value = JSON.parse(item.value);
          } catch {
            // 解析失败,使用原始字符串
            value = item.value;
          }

          // 处理嵌套路径键名(如 "extra_body.google")
          if (rawKey.includes('.')) {
            const parts = rawKey.split('.');
            const nestedObj: any = {};
            let current: any = nestedObj;
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i]!;
              current[part] = {};
              current = current[part];
            }
            const lastPart = parts[parts.length - 1]!;
            current[lastPart] = value;
            result = this.deepMerge(result, nestedObj);
          } else {
            result = this.deepMerge(result, { [rawKey]: value });
          }
        }
      } else if (customBody.mode === 'advanced' && customBody.json) {
        // 高级模式: 解析完整 JSON 并深度合并
        try {
          const customData = JSON.parse(customBody.json);
          result = this.deepMerge(result, customData);
        } catch (error) {
          logger.warn('Failed to parse custom body JSON', { error: getErrorOrNew(error) });
        }
      }
    }

    return result;
  }

  /**
   * 构建查询参数字符串
   *
   * @param config 格式转换器配置
   * @returns 查询参数字符串 (包含 ? 前缀, 如果有参数)
   */
  protected buildQueryString(config: FormatterConfig): string {
    if (!config.queryParams || Object.keys(config.queryParams).length === 0) {
      return '';
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(config.queryParams)) {
      params.append(key, String(value));
    }

    return `?${params.toString()}`;
  }

  /**
   * 构建流式选项
   *
   * @param config 格式转换器配置
   * @returns 流式选项对象
   */
  protected buildStreamOptions(config: FormatterConfig): any {
    if (!config.streamOptions) {
      return undefined;
    }

    const options: any = {};

    if (config.streamOptions.includeUsage) {
      options.include_usage = true;
    }

    return Object.keys(options).length > 0 ? options : undefined;
  }

  // ==================== 多格式工具调用解析方法（委托给ToolCallParser） ====================

  /**
   * 从XML格式文本中解析工具调用
   *
   * 支持格式：
   * ```xml
   * <tool_use>
   *   <tool_name>tool_name</tool_name>
   *   <parameters>
   *     <param1>value1</param1>
   *     <param2>value2</param2>
   *   </parameters>
   * </tool_use>
   * ```
   *
   * @param xmlText 包含XML工具调用的文本
   * @returns 解析出的工具调用数组（已转换为标准LLMToolCall格式）
   */
  parseXMLToolCalls(xmlText: string): LLMToolCall[] {
    return ToolCallParser.parseXMLToolCalls(xmlText);
  }

  /**
   * 从JSON格式文本中解析工具调用
   *
   * 支持格式：
   * ```
   * <<<TOOL_CALL>>>
   * {"tool": "tool_name", "parameters": {...}}
   * <<<END_TOOL_CALL>>>
   * ```
   *
   * @param text 包含JSON工具调用的文本
   * @param options 解析选项
   * @returns 解析出的工具调用数组（已转换为标准LLMToolCall格式）
   */
  parseJSONToolCalls(text: string, options?: ToolCallParseOptions): LLMToolCall[] {
    return ToolCallParser.parseJSONToolCalls(text, options);
  }

  /**
   * 从文本中尝试解析工具调用（自动检测格式）
   *
   * 按以下顺序尝试：
   * 1. XML格式
   * 2. JSON格式
   *
   * @param text 包含工具调用的文本
   * @param options 解析选项
   * @returns 解析出的工具调用数组
   */
  parseToolCallsFromText(text: string, options?: ToolCallParseOptions): LLMToolCall[] {
    return ToolCallParser.parseFromText(text, options);
  }
}
