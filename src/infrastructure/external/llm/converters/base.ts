/**
 * 转换器基础类和接口定义
 *
 * 提供转换器系统的核心抽象和基础实现
 */

import { LLMMessage } from '../../../../domain/llm/entities/llm-request';
import { IToolProcessor, IContentProcessor } from './processors';

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
    messages: LLMMessage[],
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
    messages: LLMMessage[],
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
  protected toolProcessor: IToolProcessor;
  protected contentProcessor: IContentProcessor;

  constructor(
    protected name: string,
    toolProcessor?: IToolProcessor,
    contentProcessor?: IContentProcessor
  ) {
    this.logger = this.getLogger();
    this.toolProcessor = toolProcessor || this.createDefaultToolProcessor();
    this.contentProcessor = contentProcessor || this.createDefaultContentProcessor();
  }

  /**
   * 创建默认工具处理器
   */
  protected createDefaultToolProcessor(): IToolProcessor {
    return {
      validateTools: (tools: any[]) => {
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
      },
      convertTools: (tools: any[], context: ConversionContext) => tools,
      processToolChoice: (toolChoice: any, context: ConversionContext) => toolChoice,
      extractToolCalls: (response: Record<string, any>, context: ConversionContext) => []
    };
  }

  /**
   * 创建默认内容处理器
   */
  protected createDefaultContentProcessor(): IContentProcessor {
    return {
      processContent: (content: string | Array<string | Record<string, any>>, context?: ConversionContext) => this.processContent(content, context),
      processImageContent: (imageItem: Record<string, any>, context?: ConversionContext) => this.processImageContent(imageItem, context),
      isSupportedImageFormat: (mediaType: string) => this.isSupportedImageFormat(mediaType),
      extractTextFromContent: (content: Array<Record<string, any>>) => this.extractTextFromContent(content)
    };
  }

  getName(): string {
    return this.name;
  }

  abstract convertRequest(
    messages: LLMMessage[],
    parameters: Record<string, any>
  ): Record<string, any>;

  abstract convertResponse(response: Record<string, any>): any;

  abstract convertStreamResponse(events: Record<string, any>[]): any;

  validateRequest(
    messages: LLMMessage[],
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
    return this.contentProcessor.processContent(content, context);
  }

  protected extractTextFromContent(content: Array<Record<string, any>>): string {
    return this.contentProcessor.extractTextFromContent(content);
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

      const contentType = item['type'];
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

  /**
   * 处理多模态内容
   */
  protected processMultimodalContent(
    content: Array<Record<string, any>>,
    context?: ConversionContext
  ): Array<Record<string, any>> {
    const processed: Array<Record<string, any>> = [];

    for (const item of content) {
      if (item['type'] === 'text') {
        processed.push(item);
      } else if (item['type'] === 'image') {
        const processedImage = this.processImageContent(item, context);
        if (processedImage) {
          processed.push(processedImage);
        }
      }
    }

    return processed;
  }

  /**
   * 处理图像内容
   */
  protected processImageContent(
    imageItem: Record<string, any>,
    context?: ConversionContext
  ): Record<string, any> | null {
    return this.contentProcessor.processImageContent(imageItem, context);
  }

  /**
   * 检查是否为支持的图像格式
   */
  protected isSupportedImageFormat(mediaType: string): boolean {
    return this.contentProcessor.isSupportedImageFormat(mediaType);
  }

  /**
   * 获取可选参数列表
   */
  protected getOptionalParameters(): string[] {
    return [
      'temperature', 'top_p', 'n', 'stream', 'stop',
      'max_tokens', 'presence_penalty', 'frequency_penalty'
    ];
  }

  /**
   * 处理特殊参数
   */
  protected handleSpecialParameters(
    requestData: Record<string, any>,
    parameters: Record<string, any>,
    context: ConversionContext
  ): void {
    // 子类可以重写此方法来处理特殊参数
  }

  /**
   * 处理工具配置
   */
  protected handleToolsConfiguration(
    requestData: Record<string, any>,
    parameters: Record<string, any>,
    context: ConversionContext
  ): void {
    if ('tools' in parameters) {
      const tools = parameters['tools'];
      if (Array.isArray(tools)) {
        const toolErrors = this.toolProcessor.validateTools(tools);
        if (toolErrors.length === 0) {
          requestData['tools'] = this.toolProcessor.convertTools(tools, context);
          
          if ('tool_choice' in parameters) {
            requestData['tool_choice'] = this.toolProcessor.processToolChoice(parameters['tool_choice'], context);
          }
        }
      }
    }
  }


  /**
   * 转换工具格式
   */
  protected convertTools(
    tools: any[],
    context: ConversionContext
  ): any[] {
    // 默认返回原格式，子类可以重写
    return tools;
  }

  /**
   * 处理工具选择策略
   */
  protected processToolChoice(
    toolChoice: any,
    context: ConversionContext
  ): any {
    // 默认返回原值，子类可以重写
    return toolChoice;
  }

  /**
   * 构建响应元数据
   */
  protected buildResponseMetadata(
    response: Record<string, any>,
    choice: Record<string, any>,
    context: ConversionContext
  ): Record<string, any> {
    return {
      finish_reason: choice['finish_reason'],
      usage: response['usage'] || {},
      model: response['model'] || '',
      id: response['id'] || '',
      created: response['created']
    };
  }

  /**
   * 提取工具调用
   */
  protected extractToolCalls(
    response: Record<string, any>,
    context: ConversionContext
  ): Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }> {
    return this.toolProcessor.extractToolCalls(response, context);
  }

  /**
   * 验证响应格式
   */
  protected validateResponse(response: Record<string, any>): string[] {
    const errors: string[] = [];

    if (!response || typeof response !== 'object') {
      errors.push('响应必须是对象格式');
      return errors;
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