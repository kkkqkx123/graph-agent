/**
 * 提示渲染服务实现
 *
 * 负责将提示数据渲染为用户友好的格式
 */

import { injectable } from 'inversify';
import { IPromptRenderingService, Prompt } from './prompt-rendering-service.interface';
import { PromptTemplate } from '../../../domain/llm/value-objects/prompt-template';
import { HumanRelayMode } from '../../../domain/llm/value-objects/human-relay-mode';

@injectable()
export class PromptRenderingService implements IPromptRenderingService {
  /**
   * 渲染提示内容
   */
  renderPrompt(prompt: Prompt): string {
    const variables: Record<string, string> = {
      prompt: prompt.content
    };

    if (prompt.conversationContext) {
      variables['conversation_history'] = prompt.conversationContext;
    }

    variables['timestamp'] = prompt.createdAt.toISOString();
    variables['session_id'] = prompt.id;

    return prompt.template.render(variables);
  }

  /**
   * 构建提示数据结构
   */
  buildPrompt(
    content: string,
    mode: HumanRelayMode,
    conversationContext?: string,
    template?: PromptTemplate
  ): Prompt {
    return {
      id: this.generateId(),
      content,
      mode,
      conversationContext,
      template: template || this.getDefaultTemplate(mode),
      status: 'created',
      createdAt: new Date(),
      timeout: 30000 // 默认30秒超时
    };
  }

  /**
   * 获取默认模板
   */
  private getDefaultTemplate(mode: HumanRelayMode): PromptTemplate {
    return mode === HumanRelayMode.MULTI
      ? PromptTemplate.createMultiTurnDefault()
      : PromptTemplate.createSingleTurnDefault();
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}