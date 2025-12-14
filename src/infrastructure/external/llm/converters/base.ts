/**
 * 转换器基础类和接口定义
 * 
 * 提供转换器系统的核心抽象和基础实现
 */

import { IBaseMessage } from '@/domain';

/**
 * 消息角色枚举
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool'
}

/**
 * 转换上下文
 */
export class ConversionContext {
  errors: string[] = [];
  warnings: string[] = [];

  constructor(
    public providerName: string,
    public conversionType: string,
    public parameters: Record<string, any>
  ) {}

  addError(error: string): void {
    this.errors.push(error);
  }

  addWarning(warning: string): void {
    this.warnings.push(warning);
  }

  getParameter(key: string, defaultValue?: any): any {
    return this.parameters[key] ?? defaultValue;
  }
}

/**
 * 提供商接口
 */
export interface IProvider {
  /**
   * 获取提供商名称
   */
  getName(): string;

  /**
   * 转换请求格式
   */
  convertRequest(
    messages: IBaseMessage[],
    parameters: Record<string, any>
  ): Record<string, any>;

  /**
   * 转换响应格式
   */
  convertResponse(response: Record<string, any>): any;

  /**
   * 转换流式响应格式
   */
  convertStreamResponse(events: Record<string, any>[]): any;

  /**
   * 验证请求参数
   */
  validateRequest(
    messages: IBaseMessage[],
    parameters: Record<string, any>
  ): string[];

  /**
   * 获取支持的模型列表
   */
  getSupportedModels(): string[];
}

/**
 * 转换器接口
 */
export interface IConverter {
  /**
   * 检查是否可以转换
   */
  canConvert(sourceType: any, targetType: any): boolean;

  /**
   * 执行转换
   */
  convert(source: any, context: ConversionContext): any;
}

/**
 * 提供商基类
 */
export abstract class BaseProvider implements IProvider {
  protected logger: any;

  constructor(protected name: string) {
    this.logger = this.getLogger();
  }

  getName(): string {
    return this.name;
  }

  validateRequest(
    messages: IBaseMessage[],
    parameters: Record<string, any>
  ): string[] {
    const errors: string[] = [];

    if (!messages || messages.length === 0) {
      errors.push('消息列表不能为空');
    }

    if (!parameters || typeof parameters !== 'object') {
      errors.push('参数必须是对象格式');
    }

    return errors;
  }

  getSupportedModels(): string[] {
    return [this.getDefaultModel()];
  }

  getDefaultModel(): string {
    return 'default';
  }

  protected createContext(
    conversionType: string,
    parameters: Record<string, any>
  ): ConversionContext {
    return new ConversionContext(this.name, conversionType, parameters);
  }

  protected processContent(
    content: string | Array<string | Record<string, any>>,
    context?: ConversionContext
  ): Array<Record<string, any>> {
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

  protected extractTextFromContent(content: Array<Record<string, any>>): string {
    const textParts: string[] = [];
    for (const item of content) {
      if (item.type === 'text') {
        textParts.push(item.text || '');
      }
    }
    return textParts.join(' ');
  }

  protected validateContent(content: Array<Record<string, any>>): string[] {
    const errors: string[] = [];

    if (!Array.isArray(content)) {
      errors.push('内容必须是数组格式');
      return errors;
    }

    for (let i = 0; i < content.length; i++) {
      const item = content[i];
      if (typeof item !== 'object') {
        errors.push(`内容项 ${i} 必须是对象`);
        continue;
      }

      const contentType = item.type;
      if (!contentType) {
        errors.push(`内容项 ${i} 缺少type字段`);
        continue;
      }

      if (contentType === 'text' && !('text' in item)) {
        errors.push(`文本内容项 ${i} 缺少text字段`);
      } else if (contentType === 'image' && !('source' in item)) {
        errors.push(`图像内容项 ${i} 缺少source字段`);
      }
    }

    return errors;
  }

  private getLogger(): any {
    try {
      // 尝试使用依赖注入获取日志器
      // return getLogger(__name__);
      return console; // 临时使用console
    } catch (error) {
      return console;
    }
  }
}