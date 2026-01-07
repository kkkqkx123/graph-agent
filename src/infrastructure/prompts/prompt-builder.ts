/**
 * 提示词构建器
 *
 * 负责在工作流执行过程中构建提示词消息
 * 专注于消息构建和上下文处理，模板处理委托给 TemplateProcessor
 * 这是提示词模块与工作流集成的唯一入口点
 *
 */

import { injectable, inject } from 'inversify';
import { IPromptRepository } from '../../domain/prompts/repositories/prompt-repository';
import { PromptId } from '../../domain/prompts/value-objects/prompt-id';
import { TemplateProcessor, TemplateProcessResult } from './template-processor';
import { PromptContext, ContextProcessor } from '../../domain/workflow/value-objects/context/prompt-context';
import { LLMMessage } from '../../domain/llm/value-objects/llm-message';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 提示词来源类型
 */
export type PromptSource =
  | { type: 'direct'; content: string }
  | { type: 'template'; category: string; name: string; variables?: Record<string, any> };

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
  private contextProcessors: Map<string, ContextProcessor> = new Map();

  constructor(
    @inject('PromptRepository') private promptRepository: IPromptRepository,
    @inject('TemplateProcessor') private templateProcessor: TemplateProcessor,
    @inject('ILogger') private readonly logger: ILogger
  ) { }

  /**
   * 构建提示词消息列表
   * @param config 构建配置
   * @param context 工作流执行上下文
   * @param contextProcessors 上下文处理器映射（可选，如果不提供则使用内部注册的处理器）
   * @returns LLM 消息列表
   */
  async buildMessages(
    config: PromptBuildConfig,
    context: Record<string, unknown>,
    contextProcessors?: Map<string, ContextProcessor>
  ): Promise<LLMMessage[]> {
    const messages: LLMMessage[] = [];

    // 使用传入的处理器或内部注册的处理器
    const processors = contextProcessors || this.contextProcessors;

    // 构建系统提示词
    if (config.systemPrompt) {
      const systemContent = await this.buildPromptContent(
        config.systemPrompt,
        context,
        config.contextProcessor,
        processors
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
      processors
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
    let content: string;

    // 处理不同类型的提示词来源
    if (source.type === 'direct') {
      // 直接内容：直接使用
      content = source.content;
    } else {
      // 模板：使用 TemplateProcessor 处理
      const result = await this.templateProcessor.processTemplate(source.category, source.name, {
        ...context,
        ...source.variables,
      });
      content = result.content;
    }

    // 应用上下文处理器
    let processedContext = context;
    if (source.type === 'template' && contextProcessorName && contextProcessors) {
      // 创建 PromptContext
      const promptContext = PromptContext.create(content, new Map(Object.entries(context)));

      // 应用处理器
      const processor = contextProcessors.get(contextProcessorName);
      if (processor) {
        const processed = processor(promptContext);
        processedContext = Object.fromEntries(processed.variables.entries());
      }
    }

    // 渲染模板
    return this.renderTemplate(content, processedContext);
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
   * 检查模板是否存在
   * @param category 类别
   * @param name 名称
   * @returns 是否存在
   */
  async templateExists(category: string, name: string): Promise<boolean> {
    const promptId = PromptId.create(category, name);
    return this.promptRepository.exists(promptId);
  }

  /**
   * 注册上下文处理器
   * @param name 处理器名称
   * @param processor 处理器函数
   */
  registerContextProcessor(name: string, processor: ContextProcessor): void {
    this.contextProcessors.set(name, processor);
    this.logger.debug('注册上下文处理器', { name });
  }

  /**
   * 获取上下文处理器
   * @param name 处理器名称
   * @returns 处理器函数或undefined
   */
  getContextProcessor(name: string): ContextProcessor | undefined {
    return this.contextProcessors.get(name);
  }

  /**
   * 检查处理器是否存在
   * @param name 处理器名称
   * @returns 是否存在
   */
  hasContextProcessor(name: string): boolean {
    return this.contextProcessors.has(name);
  }
}
