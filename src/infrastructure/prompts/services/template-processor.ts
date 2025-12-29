/**
 * 模板处理器（简化版）
 * 
 * 核心职责：
 * 1. 提示词组合 - 将预定义的提示词片段组合成完整提示词
 * 2. 变量替换 - 将运行时变量替换到模板中的占位符
 * 
 * 移除的功能：
 * - 复杂的选项系统
 * - 过度复杂的验证逻辑
 * - 模板类型区分
 */

import { injectable, inject } from 'inversify';
import { PromptService } from '../../../application/prompts/services/prompt-service';
import { PromptReferenceParser } from './prompt-reference-parser';
import { PromptReferenceValidator } from './prompt-reference-validator';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 模板处理结果
 */
export interface TemplateProcessResult {
  /** 处理后的内容 */
  content: string;
  /** 使用的变量 */
  variables: Record<string, unknown>;
}

/**
 * 模板处理器
 */
@injectable()
export class TemplateProcessor {
  constructor(
    @inject('PromptService') private promptService: PromptService,
    @inject('PromptReferenceParser') private referenceParser: PromptReferenceParser,
    @inject('PromptReferenceValidator') private referenceValidator: PromptReferenceValidator,
    @inject('ILogger') private readonly logger: ILogger
  ) {}

  /**
   * 处理模板
   * @param category 模板类别
   * @param name 模板名称
   * @param variables 模板变量
   * @returns 处理结果
   */
  async processTemplate(
    category: string,
    name: string,
    variables: Record<string, unknown> = {}
  ): Promise<TemplateProcessResult> {
    this.logger.debug('开始处理模板', { category, name, variables });

    // 1. 加载模板定义
    const templateData = await this.promptService.loadPromptContent(category, name);

    if (typeof templateData !== 'object' || templateData === null) {
      throw new Error(`模板 ${category}.${name} 格式不正确`);
    }

    const templateObj = templateData as Record<string, unknown>;

    // 2. 验证必需的变量
    this.validateRequiredVariables(templateObj, variables);

    // 3. 组合提示词片段
    const combinedParts = await this.combinePromptParts(templateObj, variables);

    // 4. 变量替换
    const content = this.renderTemplate(templateObj['content'] as string, {
      ...combinedParts,
      ...variables
    });

    this.logger.debug('模板处理完成', { category, name });

    return { content, variables };
  }

  /**
   * 验证必需的变量
   */
  private validateRequiredVariables(
    templateData: any,
    providedVariables: Record<string, unknown>
  ): void {
    if (!templateData.variables) return;

    for (const [key, config] of Object.entries(templateData.variables)) {
      const configObj = config as any;
      if (configObj.required && !(key in providedVariables)) {
        throw new Error(`模板 ${templateData.name} 缺少必需的变量: ${key}`);
      }
    }
  }

  /**
   * 组合提示词片段
   */
  private async combinePromptParts(
    templateData: any,
    variables: Record<string, unknown>
  ): Promise<Record<string, string>> {
    const parts: Record<string, string> = {};

    if (!templateData.template) {
      return parts;
    }

    // 遍历模板配置，加载引用的提示词
    for (const [partName, promptRef] of Object.entries(templateData.template)) {
      if (typeof promptRef !== 'string') {
        continue;
      }

      try {
        // 验证引用格式
        const validationResult = this.referenceValidator.validate(promptRef);
        if (!validationResult.valid) {
          this.logger.warn(`跳过无效的提示词引用: ${promptRef}`, { error: validationResult.error });
          continue;
        }

        // 解析引用
        const ref = this.referenceParser.parse(promptRef);

        // 加载提示词内容
        const partContent = await this.promptService.loadPromptContent(ref.category, ref.name);

        // 提取内容
        if (typeof partContent === 'object' && partContent !== null && 'content' in partContent) {
          const contentObj = partContent as Record<string, unknown>;
          parts[partName] = contentObj['content'] as string;
        } else if (typeof partContent === 'string') {
          parts[partName] = partContent;
        }

        this.logger.debug('成功加载提示词片段', { partName, reference: promptRef });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`无法加载提示词片段 ${partName}: ${errorMessage}`);
        throw new Error(`无法加载提示词片段 ${partName}: ${errorMessage}`);
      }
    }

    return parts;
  }

  /**
   * 渲染模板
   */
  private renderTemplate(template: string, variables: Record<string, unknown>): string {
    let rendered = template;

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

  /**
   * 验证模板引用
   */
  validateReference(reference: string): boolean {
    return this.referenceValidator.isValid(reference);
  }
}