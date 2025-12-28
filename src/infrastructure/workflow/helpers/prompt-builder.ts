/**
 * 提示词构建器
 * 
 * 负责在工作流执行过程中构建提示词消息
 * 支持模板加载、变量注入、上下文处理等功能
 */

import { injectable, inject } from 'inversify';
import { PromptService } from '../../../application/prompts/services/prompt-service';
import { PromptContext } from '../../../domain/workflow/value-objects/context/prompt-context';
import { ContextProcessor } from '../../../domain/workflow/services/context-processor-service.interface';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';

/**
 * 提示词来源类型
 */
export type PromptSource =
  | { type: 'direct'; content: string }
  | { type: 'template'; category: string; name: string; variant?: string };

/**
 * 提示词构建配置
 */
export interface PromptBuildConfig {
  /** 提示词来源 */
  source: PromptSource;
  /** 系统提示词（可选） */
  systemPrompt?: PromptSource;
  /** 上下文处理器名称（可选） */
  contextProcessor?: string;
  /** 额外变量（可选） */
  variables?: Record<string, unknown>;
}

/**
 * 提示词构建器
 */
@injectable()
export class PromptBuilder {
  constructor(
    @inject('PromptService') private promptService: PromptService
  ) {}

  /**
   * 构建提示词消息列表
   * @param config 构建配置
   * @param context 工作流执行上下文
   * @param contextProcessors 上下文处理器映射
   * @returns LLM 消息列表
   */
  async buildMessages(
    config: PromptBuildConfig,
    context: Record<string, unknown>,
    contextProcessors?: Map<string, ContextProcessor>
  ): Promise<LLMMessage[]> {
    const messages: LLMMessage[] = [];

    // 构建系统提示词
    if (config.systemPrompt) {
      const systemContent = await this.buildPromptContent(
        config.systemPrompt,
        context,
        config.contextProcessor,
        contextProcessors
      );
      if (systemContent) {
        messages.push(LLMMessage.createSystem(systemContent));
      }
    }

    // 构建用户提示词
    const userContent = await this.buildPromptContent(
      config.source,
      context,
      config.contextProcessor,
      contextProcessors
    );
    if (userContent) {
      messages.push(LLMMessage.createUser(userContent));
    }

    return messages;
  }

  /**
   * 构建提示词内容
   * @param source 提示词来源
   * @param context 工作流上下文
   * @param contextProcessorName 上下文处理器名称（可选）
   * @param contextProcessors 上下文处理器映射
   * @returns 渲染后的提示词内容
   */
  private async buildPromptContent(
    source: PromptSource,
    context: Record<string, unknown>,
    contextProcessorName?: string,
    contextProcessors?: Map<string, ContextProcessor>
  ): Promise<string> {
    let template: string;

    // 加载模板
    if (source.type === 'direct') {
      template = source.content;
    } else {
      const loadedContent = await this.promptService.loadPromptContent(source.category, source.name);
      
      // 检查是否为 TOML 模板格式（对象）
      if (typeof loadedContent === 'object' && loadedContent !== null) {
        // TOML 模板格式：处理模板编排
        template = this.processTOMLTemplate(loadedContent as any, source.variant);
      } else if (typeof loadedContent === 'string') {
        // Markdown 或纯文本格式
        template = loadedContent;
      } else {
        throw new Error(`不支持的模板内容类型: ${typeof loadedContent}`);
      }
    }

    // 应用上下文处理器
    let processedContext = context;
    if (source.type === 'template' && contextProcessorName && contextProcessors) {
      // 创建 PromptContext
      const promptContext = PromptContext.create(
        template,
        new Map(Object.entries(context))
      );

      // 应用处理器
      const processor = contextProcessors.get(contextProcessorName);
      if (processor) {
        const processed = processor(promptContext);
        processedContext = Object.fromEntries(processed.variables.entries());
      }
    }

    // 渲染模板
    return this.renderTemplate(template, processedContext);
  }

  /**
   * 渲染模板
   * @param template 模板
   * @param variables 变量
   * @returns 渲染后的内容
   */
  private renderTemplate(template: string, variables: Record<string, unknown>): string {
    let rendered = template;

    // 替换 {{variable}} 格式的变量
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const valueStr = value !== undefined && value !== null ? String(value) : '';
      rendered = rendered.replace(new RegExp(placeholder, 'g'), valueStr);
    }

    return rendered;
  }

  /**
   * 处理 TOML 模板编排
   * @param templateData TOML 模板数据
   * @param variant 模板变体名称
   * @returns 渲染后的模板内容
   */
  private processTOMLTemplate(templateData: any, variant?: string): string {
    // 检查是否为模板定义文件（templates 目录）
    if (templateData.template && templateData.template.content) {
      // 模板定义文件：直接返回模板内容
      return templateData.template.content;
    }
    
    // 检查是否为具体提示词文件（system/rules/user_commands 目录）
    if (templateData.content && typeof templateData.content === 'object') {
      // 具体提示词文件：处理模板编排
      return this.processCompositeTemplate(templateData, variant);
    }
    
    throw new Error('不支持的 TOML 模板格式');
  }

  /**
   * 处理复合模板编排
   * @param templateData 模板数据
   * @param variant 模板变体名称
   * @returns 编排后的模板内容
   */
  private processCompositeTemplate(templateData: any, variant?: string): string {
    const { content, template_options } = templateData;
    
    // 确定使用的模板变体
    const selectedVariant = variant || template_options?.default_template || 'full';
    
    // 获取变体配置
    const variantConfig = template_options?.variants?.find((v: any) => v.name === selectedVariant);
    
    if (variantConfig && variantConfig.parts) {
      // 使用指定的部分构建模板
      const parts: string[] = [];
      for (const partName of variantConfig.parts) {
        if (content[partName]) {
          parts.push(content[partName]);
        }
      }
      return parts.join('\n\n');
    }
    
    // 如果没有指定变体或找不到配置，使用完整模板
    if (content.full_template) {
      return content.full_template;
    }
    
    // 如果没有完整模板，使用所有部分
    const allParts = Object.values(content).filter(val => typeof val === 'string');
    return allParts.join('\n\n');
  }

  /**
   * 检查模板是否存在
   * @param category 类别
   * @param name 名称
   * @returns 是否存在
   */
  async templateExists(category: string, name: string): Promise<boolean> {
    return this.promptService.promptExists(category, name);
  }
}