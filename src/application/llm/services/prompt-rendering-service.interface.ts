/**
 * 提示渲染服务接口
 *
 * 定义提示渲染的抽象接口
 */

import { PromptTemplate } from '../../../domain/llm/value-objects/prompt-template';
import { HumanRelayMode } from '../../../domain/llm/value-objects/human-relay-mode';

/**
 * 提示数据结构
 */
export interface Prompt {
  id: string;
  content: string;
  mode: HumanRelayMode;
  conversationContext?: string;
  template: PromptTemplate;
  status: string;
  createdAt: Date;
  timeout: number;
}

/**
 * 提示渲染服务接口
 */
export interface IPromptRenderingService {
  /**
   * 渲染提示内容
   * @param prompt 提示数据
   * @returns 渲染后的提示字符串
   */
  renderPrompt(prompt: Prompt): string;

  /**
   * 构建提示数据结构
   * @param content 提示内容
   * @param mode 交互模式
   * @param conversationContext 对话上下文（可选）
   * @param template 提示模板（可选）
   * @returns 提示数据结构
   */
  buildPrompt(
    content: string,
    mode: HumanRelayMode,
    conversationContext?: string,
    template?: PromptTemplate
  ): Prompt;
}