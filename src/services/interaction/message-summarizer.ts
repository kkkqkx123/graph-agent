/**
 * 消息摘要器
 * 
 * 当消息历史超过 token 限制时，自动摘要对话历史
 */

import { injectable, inject } from 'inversify';
import { Message } from '../../domain/interaction/value-objects/message';
import { MessageRole } from '../../domain/interaction/value-objects/message-role';
import { ILLMExecutor } from './llm-executor';
import { LLMConfig } from '../../domain/interaction/value-objects/llm-config';
import { IInteractionContext } from '../interaction-context';
import { InteractionContext } from '../interaction-context';
import { ILogger } from '../../domain/common/types/logger-types';
import { TokenCalculator } from '../../infrastructure/llm/token-calculators/token-calculator';

/**
 * 消息摘要器
 */
@injectable()
export class MessageSummarizer {
  constructor(
    @inject('ILLMExecutor') private readonly llmExecutor: ILLMExecutor,
    @inject('TokenCalculator') private readonly tokenCalculator: TokenCalculator,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 摘要消息历史
   * @param messages 消息列表
   * @param tokenLimit token 限制
   * @returns 摘要后的消息列表
   */
  async summarizeMessages(
    messages: Message[],
    tokenLimit: number
  ): Promise<Message[]> {
    // 1. 估算 token
    const estimatedTokens = await this.estimateTokens(messages);
    
    // 2. 检查是否超过限制
    if (estimatedTokens <= tokenLimit) {
      return messages;
    }

    this.logger.info(`Token 限制触发: ${estimatedTokens}/${tokenLimit}，开始摘要消息历史`);

    // 3. 找到所有用户消息索引（跳过系统提示）
    const userIndices = messages
      .map((msg, idx) => msg.role === MessageRole.USER ? idx : -1)
      .filter(idx => idx > 0);

    if (userIndices.length < 1) {
      this.logger.warn('用户消息不足，无法摘要');
      return messages;
    }

    // 4. 构建新的消息列表
    const newMessages: Message[] = [messages[0]]; // 保留系统提示
    let summaryCount = 0;

    // 5. 对每轮对话进行摘要
    for (let i = 0; i < userIndices.length; i++) {
      const userIdx = userIndices[i];
      newMessages.push(messages[userIdx]);

      // 确定要摘要的消息范围
      const nextUserIdx = i < userIndices.length - 1 
        ? userIndices[i + 1] 
        : messages.length;

      const executionMessages = messages.slice(userIdx + 1, nextUserIdx);

      if (executionMessages.length > 0) {
        const summary = await this.createSummary(executionMessages, i + 1);
        if (summary) {
          newMessages.push(new Message({
            role: MessageRole.USER,
            content: `[Assistant Execution Summary]\n\n${summary}`,
          }));
          summaryCount++;
        }
      }
    }

    const newTokens = await this.estimateTokens(newMessages);
    this.logger.info(`摘要完成: ${estimatedTokens} -> ${newTokens} tokens，结构: system + ${userIndices.length} user messages + ${summaryCount} summaries`);

    return newMessages;
  }

  /**
   * 估算消息的 token 数量
   * @param messages 消息列表
   * @returns token 数量
   */
  private async estimateTokens(messages: Message[]): Promise<number> {
    try {
      // 转换为 LLM 消息格式
      const messageList = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // 使用基础设施层的 TokenCalculator
      return await this.tokenCalculator.calculateConversationTokens(messageList);
    } catch (error) {
      this.logger.error('估算 token 失败', error instanceof Error ? error : new Error(String(error)));
      // 回退到简单估算
      return messages.reduce((total, msg) => total + msg.content.length, 0);
    }
  }

  /**
   * 创建摘要
   * @param messages 要摘要的消息列表
   * @param roundNum 轮次编号
   * @returns 摘要文本
   */
  private async createSummary(
    messages: Message[],
    roundNum: number
  ): Promise<string> {
    if (messages.length === 0) {
      return '';
    }

    // 构建摘要内容
    let summaryContent = `Round ${roundNum} execution process:\n\n`;
    for (const msg of messages) {
      if (msg.role === MessageRole.ASSISTANT) {
        summaryContent += `Assistant: ${msg.content}\n`;
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          const toolNames = msg.toolCalls.map(tc => tc.name);
          summaryContent += `  → Called tools: ${toolNames.join(', ')}\n`;
        }
      } else if (msg.role === MessageRole.TOOL) {
        const preview = msg.content.substring(0, 100);
        summaryContent += `  ← Tool returned: ${preview}...\n`;
      }
    }

    // 调用 LLM 生成简洁摘要
    const summaryPrompt = `Please provide a concise summary of the following Agent execution process:

${summaryContent}

Requirements:
1. Focus on what tasks were completed and which tools were called
2. Keep key execution results and important findings
3. Be concise and clear, within 1000 words
4. Use English
5. Do not include "user" related content, only summarize the Agent's execution process`;

    try {
      const result = await this.llmExecutor.execute({
        provider: 'openai',
        model: 'gpt-4',
        systemPrompt: 'You are an assistant skilled at summarizing Agent execution processes.',
        prompt: summaryPrompt,
      }, new InteractionContext());

      if (result.success && result.output) {
        this.logger.debug(`第 ${roundNum} 轮摘要生成成功`);
        return result.output;
      } else {
        this.logger.warn(`第 ${roundNum} 轮摘要生成失败，使用简单文本摘要`);
        return summaryContent;
      }
    } catch (error) {
      this.logger.error(`第 ${roundNum} 轮摘要生成失败`, error instanceof Error ? error : new Error(String(error)));
      // 使用简单文本摘要作为回退
      return summaryContent;
    }
  }
}