/**
 * 模板处理器
 * 
 * 负责处理模板定义和编排逻辑
 * 与 PromptBuilder 分离，专注于模板处理
 */

import { injectable, inject } from 'inversify';
import { PromptService } from '../../../application/prompts/services/prompt-service';

/**
 * 模板处理结果
 */
export interface TemplateProcessResult {
  /** 处理后的内容 */
  content: string;
  /** 使用的变量 */
  variables: Record<string, unknown>;
  /** 消息结构（如果模板定义了消息） */
  messages?: Array<{ role: string; content: string }>;
}

/**
 * 模板处理器
 */
@injectable()
export class TemplateProcessor {
  constructor(
    @inject('PromptService') private promptService: PromptService
  ) {}

  /**
   * 处理模板
   * @param category 模板类别
   * @param name 模板名称
   * @param variables 模板变量
   * @param options 模板选项
   * @returns 处理结果
   */
  async processTemplate(
    category: string,
    name: string,
    variables: Record<string, unknown> = {},
    options: Record<string, unknown> = {}
  ): Promise<TemplateProcessResult> {
    const templateData = await this.promptService.loadPromptContent(category, name);
    
    if (typeof templateData !== 'object' || templateData === null) {
      throw new Error(`模板 ${category}.${name} 格式不正确`);
    }

    // 检查是否为模板定义文件
    if (this.isTemplateDefinition(templateData)) {
      return this.processTemplateDefinition(templateData, variables, options);
    }
    
    // 检查是否为具体提示词文件
    if (this.isPromptContent(templateData)) {
      return this.processPromptContent(templateData, variables);
    }
    
    throw new Error(`不支持的模板格式: ${category}.${name}`);
  }

  /**
   * 检查是否为模板定义
   */
  private isTemplateDefinition(data: any): boolean {
    return data.template && data.template.messages;
  }

  /**
   * 检查是否为具体提示词内容
   */
  private isPromptContent(data: any): boolean {
    return data.content && typeof data.content === 'object';
  }

  /**
   * 处理模板定义
   */
  private async processTemplateDefinition(
    templateData: any,
    variables: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<TemplateProcessResult> {
    const { template, parts, variables: templateVariables } = templateData;
    
    // 验证必需的变量
    this.validateTemplateVariables(templateVariables, variables);
    
    // 应用模板选项
    const processedVariables = this.applyTemplateOptions(templateData, variables, options);
    
    // 加载和组合部分
    const combinedContent = await this.loadAndCombineParts(parts, processedVariables);
    
    // 渲染模板
    const renderedContent = this.renderTemplate(template.messages, combinedContent);
    
    return {
      content: renderedContent,
      variables: processedVariables,
      messages: template.messages
    };
  }

  /**
   * 处理具体提示词内容
   */
  private processPromptContent(
    promptData: any,
    variables: Record<string, unknown>
  ): TemplateProcessResult {
    const { content } = promptData;
    
    // 如果是简单的内容，直接返回
    if (typeof content === 'string') {
      const renderedContent = this.renderTemplate([{ role: 'user', content }], variables);
      return {
        content: renderedContent,
        variables
      };
    }
    
    // 如果是复合内容，处理模板编排
    if (typeof content === 'object') {
      const combinedContent = this.combinePromptParts(content, variables);
      return {
        content: combinedContent,
        variables
      };
    }
    
    throw new Error('不支持的提示词内容格式');
  }

  /**
   * 验证模板变量
   */
  private validateTemplateVariables(
    templateVariables: any,
    providedVariables: Record<string, unknown>
  ): void {
    if (!templateVariables) return;
    
    for (const [key, config] of Object.entries(templateVariables)) {
      const configObj = config as any;
      if (configObj.required && !(key in providedVariables)) {
        throw new Error(`模板缺少必需的变量: ${key}`);
      }
    }
  }

  /**
   * 应用模板选项
   */
  private applyTemplateOptions(
    templateData: any,
    variables: Record<string, unknown>,
    options: Record<string, unknown>
  ): Record<string, unknown> {
    const processedVariables = { ...variables };
    
    if (templateData.options) {
      for (const [key, config] of Object.entries(templateData.options)) {
        const configObj = config as any;
        if (options[key] !== undefined) {
          processedVariables[key] = options[key];
        } else if (configObj.default !== undefined) {
          processedVariables[key] = configObj.default;
        }
      }
    }
    
    return processedVariables;
  }

  /**
   * 加载和组合部分
   */
  private async loadAndCombineParts(
    parts: any,
    variables: Record<string, unknown>
  ): Promise<Record<string, string>> {
    const combined: Record<string, string> = {};
    
    if (!parts) return combined;
    
    for (const [partName, partConfig] of Object.entries(parts)) {
      const configObj = partConfig as any;
      
      // 获取部分名称
      const partCategory = configObj.category;
      const partNameVar = variables[`${partName}_name`] as string;
      
      if (!partNameVar && configObj.required) {
        throw new Error(`缺少必需的提示词部分: ${partName}`);
      }
      
      if (partNameVar) {
        // 加载具体提示词内容
        const partContent = await this.promptService.loadPromptContent(partCategory, partNameVar);
        
        if (typeof partContent === 'object' && partContent !== null && 'content' in partContent) {
          const contentObj = partContent as any;
          combined[partName] = contentObj.content.text || contentObj.content;
        } else if (typeof partContent === 'string') {
          combined[partName] = partContent;
        }
      }
    }
    
    return combined;
  }

  /**
   * 组合提示词部分
   */
  private combinePromptParts(
    content: Record<string, string>,
    variables: Record<string, unknown>
  ): string {
    const parts: string[] = [];
    
    // 按顺序组合部分
    const orderedParts = Object.entries(content)
      .sort(([keyA], [keyB]) => {
        const orderA = parseInt((keyA.split('_')[0] || '0')) || 0;
        const orderB = parseInt((keyB.split('_')[0] || '0')) || 0;
        return orderA - orderB;
      });
    
    for (const [, contentValue] of orderedParts) {
      if (typeof contentValue === 'string') {
        parts.push(contentValue);
      }
    }
    
    const combined = parts.join('\n\n');
    return this.renderTemplate([{ role: 'user', content: combined }], variables);
  }

  /**
   * 渲染模板
   */
  private renderTemplate(
    messages: Array<{ role: string; content: string }>,
    variables: Record<string, unknown>
  ): string {
    const renderedMessages = messages.map(msg => ({
      role: msg.role,
      content: this.renderContent(msg.content, variables)
    }));
    
    // 将消息组合成单一字符串
    return renderedMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');
  }

  /**
   * 渲染内容
   */
  private renderContent(content: string, variables: Record<string, unknown>): string {
    let rendered = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const valueStr = value !== undefined && value !== null ? String(value) : '';
      rendered = rendered.replace(new RegExp(placeholder, 'g'), valueStr);
    }
    
    return rendered;
  }

  /**
   * 检查模板是否存在
   */
  async templateExists(category: string, name: string): Promise<boolean> {
    return this.promptService.promptExists(category, name);
  }
}