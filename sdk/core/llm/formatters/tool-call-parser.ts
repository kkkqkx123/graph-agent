/**
 * 工具调用解析器
 *
 * 负责从不同格式（XML、JSON、原生）的文本中解析工具调用
 * 独立于Formatter，可被多个Formatter复用
 */

import type { LLMToolCall } from '@modular-agent/types';

/**
 * XML工具调用格式
 */
export interface XMLToolCall {
  /** 工具名称 */
  name: string;
  /** 工具参数 */
  args: Record<string, any>;
}

/**
 * JSON工具调用格式
 */
export interface JSONToolCall {
  /** 工具名称 */
  tool: string;
  /** 工具参数 */
  parameters: Record<string, any>;
}

/**
 * 工具调用解析选项
 */
export interface ToolCallParseOptions {
  /** 是否允许解析部分工具调用（流式场景） */
  allowPartial?: boolean;
  /** 自定义工具调用起始标记（JSON格式） */
  toolCallStartMarker?: string;
  /** 自定义工具调用结束标记（JSON格式） */
  toolCallEndMarker?: string;
}

/**
 * 工具调用解析器类
 *
 * 提供静态方法用于解析不同格式的工具调用
 * 支持XML、JSON和原生格式
 */
export class ToolCallParser {
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
  static parseXMLToolCalls(xmlText: string): LLMToolCall[] {
    const results: LLMToolCall[] = [];

    // 使用正则匹配所有 <tool_use>...</tool_use> 块
    const toolUseRegex = /<tool_use>([\s\S]*?)<\/tool_use>/g;
    let match;

    while ((match = toolUseRegex.exec(xmlText)) !== null) {
      try {
        const toolUseContent = match[1];

        // 提取工具名称
        const nameMatch = toolUseContent?.match(/<tool_name>([\s\S]*?)<\/tool_name>/);
        if (!nameMatch || !nameMatch[1]) continue;

        const toolName = nameMatch[1].trim();
        if (!toolName) continue;

        // 提取参数部分
        const paramsMatch = toolUseContent?.match(/<parameters>([\s\S]*?)<\/parameters>/);
        let args: Record<string, any> = {};

        if (paramsMatch && paramsMatch[1] !== undefined) {
          args = this.parseXMLParameters(paramsMatch[1]);
        }

        results.push({
          id: this.generateToolCallId(),
          type: 'function',
          function: {
            name: toolName,
            arguments: JSON.stringify(args)
          }
        });
      } catch (error) {
        // 解析失败，跳过这个块
        console.warn('Failed to parse XML tool call block:', error);
      }
    }

    return results;
  }

  /**
   * 解析XML参数内容
   * 递归处理嵌套结构和数组
   *
   * @param paramsContent 参数XML内容
   * @returns 解析后的参数对象
   */
  private static parseXMLParameters(paramsContent: string): Record<string, any> {
    const result: Record<string, any> = {};

    // 匹配所有顶级标签
    const tagRegex = /<([\w_]+)>([\s\S]*?)<\/\1>/g;
    let match;

    while ((match = tagRegex.exec(paramsContent)) !== null) {
      const tagName = match[1];
      const tagContent = match[2]?.trim() ?? '';

      if (!tagName) continue;

      // 检查是否包含嵌套标签
      if (/<[\w_]+>/.test(tagContent)) {
        // 检查是否是数组格式（多个<item>标签）
        if (tagName === 'item' || tagContent.includes('<item>')) {
          result[tagName] = this.parseXMLArray(tagContent);
        } else {
          result[tagName] = this.parseXMLParameters(tagContent);
        }
      } else {
        // 尝试解析为JSON（数字、布尔值等）
        result[tagName] = this.parseXMLValue(tagContent);
      }
    }

    return result;
  }

  /**
   * 解析XML数组（<item>标签）
   *
   * @param arrayContent 数组内容
   * @returns 解析后的数组
   */
  private static parseXMLArray(arrayContent: string): any[] {
    const items: any[] = [];

    // 匹配所有<item>标签
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(arrayContent)) !== null) {
      const itemContent = match[1]?.trim() ?? '';

      if (/<[\w_]+>/.test(itemContent)) {
        // 嵌套对象
        items.push(this.parseXMLParameters(itemContent));
      } else {
        // 简单值
        items.push(this.parseXMLValue(itemContent));
      }
    }

    return items;
  }

  /**
   * 解析XML值（尝试转换为适当的类型）
   *
   * @param value 字符串值
   * @returns 转换后的值
   */
  private static parseXMLValue(value: string): any {
    const trimmed = value.trim();

    // 尝试解析为数字
    if (/^-?\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }
    if (/^-?\d+\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // 尝试解析为布尔值
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // 尝试解析为null
    if (trimmed === 'null') return null;

    // 返回字符串
    return trimmed;
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
  static parseJSONToolCalls(
    text: string,
    options: ToolCallParseOptions = {}
  ): LLMToolCall[] {
    const results: LLMToolCall[] = [];

    const startMarker = options.toolCallStartMarker || '<<<TOOL_CALL>>>';
    const endMarker = options.toolCallEndMarker || '<<<END_TOOL_CALL>>>';

    // 转义正则特殊字符
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 匹配工具调用边界
    const toolCallRegex = new RegExp(
      `${escapeRegExp(startMarker)}\\s*([\\s\\S]*?)\\s*${escapeRegExp(endMarker)}`,
      'g'
    );

    let match;
    while ((match = toolCallRegex.exec(text)) !== null) {
      try {
        const jsonStrRaw = match[1];
        if (!jsonStrRaw) continue;
        const jsonStr = jsonStrRaw.trim();
        if (!jsonStr) continue;
        
        const parsed = JSON.parse(jsonStr);

        // 验证并转换格式
        const toolCall = this.convertToStandardToolCall(parsed);
        if (toolCall) {
          results.push(toolCall);
        }
      } catch (error) {
        console.warn('Failed to parse JSON tool call:', error);
      }
    }

    return results;
  }

  /**
   * 将各种格式的工具调用转换为标准格式
   *
   * @param parsed 解析后的对象
   * @returns 标准LLMToolCall格式，如果无效则返回null
   */
  private static convertToStandardToolCall(parsed: any): LLMToolCall | null {
    // 格式1: { tool: "name", parameters: {...} }
    if (parsed.tool && typeof parsed.tool === 'string') {
      return {
        id: this.generateToolCallId(),
        type: 'function',
        function: {
          name: parsed.tool,
          arguments: JSON.stringify(parsed.parameters || {})
        }
      };
    }

    // 格式2: { name: "name", arguments: "..." | {...} }
    if (parsed.name && typeof parsed.name === 'string') {
      const args = typeof parsed.arguments === 'string'
        ? parsed.arguments
        : JSON.stringify(parsed.arguments || {});

      return {
        id: this.generateToolCallId(),
        type: 'function',
        function: {
          name: parsed.name,
          arguments: args
        }
      };
    }

    // 格式3: { function: { name: "...", arguments: "..." } }
    if (parsed.function && typeof parsed.function === 'object') {
      const func = parsed.function;
      if (func.name) {
        const args = typeof func.arguments === 'string'
          ? func.arguments
          : JSON.stringify(func.arguments || {});

        return {
          id: parsed.id || this.generateToolCallId(),
          type: parsed.type || 'function',
          function: {
            name: func.name,
            arguments: args
          }
        };
      }
    }

    return null;
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
  static parseFromText(text: string, options?: ToolCallParseOptions): LLMToolCall[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // 尝试XML格式
    if (text.includes('<tool_use>')) {
      const xmlCalls = this.parseXMLToolCalls(text);
      if (xmlCalls.length > 0) {
        return xmlCalls;
      }
    }

    // 尝试JSON格式
    if (text.includes('<<<TOOL_CALL>>>')) {
      const jsonCalls = this.parseJSONToolCalls(text, options);
      if (jsonCalls.length > 0) {
        return jsonCalls;
      }
    }

    return [];
  }

  /**
   * 生成工具调用ID
   *
   * @returns 唯一的工具调用ID
   */
  private static generateToolCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查文本是否包含XML格式的工具调用
   *
   * @param text 文本内容
   * @returns 是否包含XML工具调用
   */
  static hasXMLToolCalls(text: string): boolean {
    return text.includes('<tool_use>');
  }

  /**
   * 检查文本是否包含JSON格式的工具调用
   *
   * @param text 文本内容
   * @returns 是否包含JSON工具调用
   */
  static hasJSONToolCalls(text: string): boolean {
    return text.includes('<<<TOOL_CALL>>>');
  }

  /**
   * 转义正则表达式特殊字符
   *
   * @param str 输入字符串
   * @returns 转义后的字符串
   */
  static escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// 默认导出
export default ToolCallParser;
