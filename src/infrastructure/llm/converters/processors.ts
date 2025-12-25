/**
 * 处理器接口定义
 *
 * 提供工具和内容处理的标准化接口
 */

import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { ConversionContext } from './base';

/**
 * 工具处理器接口
 */
export interface IToolProcessor {
  /**
   * 验证工具定义
   */
  validateTools(tools: any[]): string[];

  /**
   * 转换工具格式
   */
  convertTools(tools: any[], context: ConversionContext): any[];

  /**
   * 处理工具选择策略
   */
  processToolChoice(toolChoice: any, context: ConversionContext): any;

  /**
   * 从响应中提取工具调用
   */
  extractToolCalls(response: Record<string, any>, context: ConversionContext): Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * 内容处理器接口
 */
export interface IContentProcessor {
  /**
   * 处理内容格式
   */
  processContent(content: string | Array<string | Record<string, any>>, context?: ConversionContext): Array<Record<string, any>>;

  /**
   * 处理图像内容
   */
  processImageContent(imageItem: Record<string, any>, context?: ConversionContext): Record<string, any> | null;

  /**
   * 检查是否为支持的图像格式
   */
  isSupportedImageFormat(mediaType: string): boolean;

  /**
   * 从内容中提取文本
   */
  extractTextFromContent(content: Array<Record<string, any>>): string;
}

/**
 * 基础工具处理器
 */
export abstract class BaseToolProcessor implements IToolProcessor {
  abstract convertTools(tools: any[], context: ConversionContext): any[];
  abstract processToolChoice(toolChoice: any, context: ConversionContext): any;
  abstract extractToolCalls(response: Record<string, any>, context: ConversionContext): Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;

  /**
   * 通用工具验证逻辑
   */
  validateTools(tools: any[]): string[] {
    const errors: string[] = [];

    if (!Array.isArray(tools)) {
      errors.push('工具必须是数组格式');
      return errors;
    }

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      if (typeof tool !== 'object') {
        errors.push(`工具项 ${i} 必须是对象`);
        continue;
      }

      if (!tool['type']) {
        errors.push(`工具项 ${i} 缺少type字段`);
      }

      if (tool['type'] === 'function' && !tool['function']) {
        errors.push(`函数工具项 ${i} 缺少function字段`);
      }
    }

    return errors;
  }
}

/**
 * 基础内容处理器
 */
export abstract class BaseContentProcessor implements IContentProcessor {
  abstract processImageContent(imageItem: Record<string, any>, context?: ConversionContext): Record<string, any> | null;
  abstract isSupportedImageFormat(mediaType: string): boolean;

  /**
   * 通用内容处理逻辑
   */
  processContent(content: string | Array<string | Record<string, any>>, context?: ConversionContext): Array<Record<string, any>> {
    if (typeof content === 'string') {
      return [{ type: 'text', text: content }];
    } else if (Array.isArray(content)) {
      const processed: Array<Record<string, any>> = [];
      for (const item of content) {
        if (typeof item === 'string') {
          processed.push({ type: 'text', text: item });
        } else if (typeof item === 'object') {
          processed.push(item);
        }
      }
      return processed;
    } else {
      return [{ type: 'text', text: String(content) }];
    }
  }

  /**
   * 通用文本提取逻辑
   */
  extractTextFromContent(content: Array<Record<string, any>>): string {
    const textParts: string[] = [];
    for (const item of content) {
      if (item['type'] === 'text') {
        textParts.push(item['text'] || '');
      }
    }
    return textParts.join(' ');
  }
}

/**
 * OpenAI工具处理器
 */
export class OpenAIToolProcessor extends BaseToolProcessor {
  convertTools(tools: any[], context: ConversionContext): any[] {
    // OpenAI工具格式已经是标准格式，直接返回
    return tools;
  }

  processToolChoice(toolChoice: any, context: ConversionContext): any {
    // OpenAI支持的工具选择策略
    if (toolChoice === 'required') {
      return 'required';
    } else if (toolChoice === 'auto') {
      return 'auto';
    } else if (toolChoice === 'none') {
      return 'none';
    } else if (typeof toolChoice === 'object') {
      return toolChoice;
    } else {
      return 'auto';
    }
  }

  extractToolCalls(response: Record<string, any>, context: ConversionContext): Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }> {
    const choices = response['choices'] || [];
    if (choices.length === 0) {
      return [];
    }

    const message = choices[0]['message'] || {};
    return message['tool_calls'] || [];
  }
}

/**
 * OpenAI内容处理器
 */
export class OpenAIContentProcessor extends BaseContentProcessor {
  processImageContent(imageItem: Record<string, any>, context?: ConversionContext): Record<string, any> | null {
    const source = imageItem['source'] || {};

    if (!source || typeof source !== 'object') {
      return null;
    }

    const mediaType = source['media_type'] || '';
    const imageData = source['data'] || '';

    if (!this.isSupportedImageFormat(mediaType)) {
      return null;
    }

    if (!imageData) {
      return null;
    }

    return {
      type: 'image',
      source: {
        type: source['type'] || 'base64',
        media_type: mediaType,
        data: imageData
      }
    };
  }

  isSupportedImageFormat(mediaType: string): boolean {
    const supportedFormats = new Set([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]);
    return supportedFormats.has(mediaType);
  }
}

/**
 * Anthropic工具处理器
 */
export class AnthropicToolProcessor extends BaseToolProcessor {
  convertTools(tools: any[], context: ConversionContext): any[] {
    const anthropicTools: any[] = [];

    for (const tool of tools) {
      if (tool['type'] === 'function') {
        const functionDef = tool['function'] || {};
        const anthropicTool = {
          name: functionDef['name'] || '',
          description: functionDef['description'] || '',
          input_schema: functionDef['parameters'] || {}
        };
        anthropicTools.push(anthropicTool);
      }
    }

    return anthropicTools;
  }

  processToolChoice(toolChoice: any, context: ConversionContext): any {
    if (toolChoice === 'auto') {
      return { type: 'auto' };
    } else if (toolChoice === 'any') {
      return { type: 'any' };
    } else if (typeof toolChoice === 'object' && 'name' in toolChoice) {
      return { type: 'tool', name: toolChoice['name'] };
    } else {
      return { type: 'auto' };
    }
  }

  extractToolCalls(response: Record<string, any>, context: ConversionContext): Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }> {
    const content = response['content'] || [];
    const toolCalls: any[] = [];

    for (const item of content) {
      if (item['type'] === 'tool_use') {
        const toolCall = {
          id: item['id'] || '',
          type: 'function',
          function: {
            name: item['name'] || '',
            arguments: JSON.stringify(item['input'] || {})
          }
        };
        toolCalls.push(toolCall);
      }
    }

    return toolCalls;
  }
}

/**
 * Anthropic内容处理器
 */
export class AnthropicContentProcessor extends BaseContentProcessor {
  processImageContent(imageItem: Record<string, any>, context?: ConversionContext): Record<string, any> | null {
    const source = imageItem['source'] || {};

    if (!source || typeof source !== 'object') {
      return null;
    }

    const mediaType = source['media_type'] || '';
    const imageData = source['data'] || '';

    if (!this.isSupportedImageFormat(mediaType)) {
      return null;
    }

    if (!imageData) {
      return null;
    }

    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: imageData
      }
    };
  }

  isSupportedImageFormat(mediaType: string): boolean {
    const supportedFormats = new Set([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif'
    ]);
    return supportedFormats.has(mediaType);
  }
}

/**
 * Gemini工具处理器
 */
export class GeminiToolProcessor extends BaseToolProcessor {
  convertTools(tools: any[], context: ConversionContext): any[] {
    const geminiTools: any[] = [];

    for (const tool of tools) {
      if (tool['type'] === 'function') {
        const functionDef = tool['function'] || {};
        const geminiTool = {
          functionDeclarations: [{
            name: functionDef['name'] || '',
            description: functionDef['description'] || '',
            parameters: functionDef['parameters'] || {}
          }]
        };
        geminiTools.push(geminiTool);
      }
    }

    return geminiTools;
  }

  processToolChoice(toolChoice: any, context: ConversionContext): Record<string, any> {
    if (toolChoice === 'auto') {
      return { mode: 'AUTO' };
    } else if (toolChoice === 'any') {
      return { mode: 'ANY' };
    } else if (toolChoice === 'none') {
      return { mode: 'NONE' };
    } else if (typeof toolChoice === 'object' && 'name' in toolChoice) {
      return {
        mode: 'ANY',
        allowedFunctionNames: [toolChoice['name']]
      };
    } else {
      return { mode: 'AUTO' };
    }
  }

  extractToolCalls(response: Record<string, any>, context: ConversionContext): Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }> {
    const candidates = response['candidates'] || [];
    const toolCalls: any[] = [];

    for (const candidate of candidates) {
      const content = candidate.content || {};
      const parts = content.parts || [];

      for (const part of parts) {
        if ('functionCall' in part) {
          const functionCall = part.functionCall;
          const toolCall = {
            id: `call_${functionCall.name || ''}_${toolCalls.length}`,
            type: 'function',
            function: {
              name: functionCall.name || '',
              arguments: JSON.stringify(functionCall.args || {})
            }
          };
          toolCalls.push(toolCall);
        }
      }
    }

    return toolCalls;
  }
}

/**
 * Gemini内容处理器
 */
export class GeminiContentProcessor extends BaseContentProcessor {
  processImageContent(imageItem: Record<string, any>, context?: ConversionContext): Record<string, any> | null {
    const source = imageItem['source'] || {};

    if (!source || typeof source !== 'object') {
      return null;
    }

    const mediaType = source['media_type'] || '';
    const imageData = source['data'] || '';

    if (!this.isSupportedImageFormat(mediaType)) {
      return null;
    }

    if (!imageData) {
      return null;
    }

    return {
      inline_data: {
        mime_type: mediaType,
        data: imageData
      }
    };
  }

  isSupportedImageFormat(mediaType: string): boolean {
    const supportedFormats = new Set([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif'
    ]);
    return supportedFormats.has(mediaType);
  }
}