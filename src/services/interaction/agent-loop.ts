/**
 * Agent 执行循环
 *
 * 实现完整的 Agent 执行流程
 */

import { injectable, inject } from 'inversify';
import { InteractionEngine } from './interaction-engine';
import { MessageSummarizer } from './message-summarizer';
import { ToolService } from '../tools/tool-service';
import { Message } from '../../domain/interaction/value-objects/message';
import { MessageRole } from '../../domain/interaction/value-objects/message-role';
import { ILogger } from '../../domain/common/types/logger-types';
import { LLMConfig } from '../../domain/interaction/value-objects/llm-config';
import { ToolConfig } from '../../domain/interaction/value-objects/tool-config';

/**
 * Agent 执行循环
 */
@injectable()
export class AgentLoop {
  constructor(
    @inject('InteractionEngine') private readonly engine: InteractionEngine,
    @inject('MessageSummarizer') private readonly summarizer: MessageSummarizer,
    @inject('ToolService') private readonly toolService: ToolService,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 执行 Agent 循环
   * @param initialMessage 初始用户消息
   * @param config 配置
   * @returns 执行结果
   */
  async run(
    initialMessage: string,
    config: {
      maxSteps?: number;
      tokenLimit?: number;
      systemPrompt?: string;
      provider?: string;
      model?: string;
    } = {}
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
    steps: number;
    executionTime: number;
    metadata?: Record<string, any>;
  }> {
    const startTime = Date.now();

    // 默认配置
    const maxSteps = config.maxSteps || 50;
    const tokenLimit = config.tokenLimit || 80000;
    const systemPrompt = config.systemPrompt || 'You are a helpful assistant.';
    const provider = config.provider || 'openai';
    const model = config.model || 'gpt-4';

    this.logger.info('开始 Agent 执行循环', {
      maxSteps,
      tokenLimit,
      provider,
      model,
    });

    // 创建上下文
    const context = this.engine.createContext();

    // 添加初始用户消息
    context.addMessage(new Message({
      role: MessageRole.USER,
      content: initialMessage,
    }));

    // 执行循环
    for (let step = 0; step < maxSteps; step++) {
      this.logger.debug(`Step ${step + 1}/${maxSteps}`);

      // 1. 检查并摘要消息历史
      const currentMessages = context.getMessages();
      const summarizedMessages = await this.summarizer.summarizeMessages(
        currentMessages,
        tokenLimit
      );
      
      // 如果消息被摘要，更新上下文
      if (summarizedMessages.length !== currentMessages.length) {
        context.clearMessages();
        summarizedMessages.forEach(msg => context.addMessage(msg));
        this.logger.debug(`消息已摘要: ${currentMessages.length} -> ${summarizedMessages.length}`);
      }

      // 2. 获取工具 Schema
      const toolSchemas = this.toolService.getAllSchemas();

      // 3. 调用 LLM
      const llmConfig = new LLMConfig({
        provider,
        model,
        systemPrompt,
        prompt: '', // 使用上下文中的消息
      });
      const llmResult = await this.engine.executeLLM(llmConfig, context.getMessages());

      if (!llmResult.success) {
        this.logger.error('LLM 调用失败', undefined, {
          error: llmResult.error,
          step: step + 1,
        });
        return {
          success: false,
          error: llmResult.error || 'LLM call failed',
          steps: step + 1,
          executionTime: Date.now() - startTime,
          metadata: {
            provider,
            model,
            lastStep: step + 1,
          },
        };
      }

      // 4. 检查是否有工具调用
      if (!llmResult.toolCalls || llmResult.toolCalls.length === 0) {
        // 任务完成
        this.logger.info('任务完成', {
          steps: step + 1,
          outputLength: llmResult.output?.length || 0,
        });
        return {
          success: true,
          output: llmResult.output || 'No output',
          steps: step + 1,
          executionTime: Date.now() - startTime,
          metadata: {
            provider,
            model,
            totalSteps: step + 1,
          },
        };
      }

      // 5. 执行工具调用
      this.logger.debug(`执行 ${llmResult.toolCalls.length} 个工具调用`);
      
      for (const toolCall of llmResult.toolCalls) {
        const toolConfig = new ToolConfig({
          toolId: toolCall.name,
          parameters: toolCall.arguments,
        });
        const toolResult = await this.engine.executeTool(toolConfig, context.getToolCalls());

        // 添加工具结果到上下文
        context.addMessage(new Message({
          role: MessageRole.TOOL,
          content: toolResult.success ? toolResult.output || '' : toolResult.error || '',
          toolCallId: toolCall.id,
        }));

        if (!toolResult.success) {
          this.logger.warn('工具调用失败', {
            toolId: toolCall.name,
            error: toolResult.error,
          });
        }
      }
    }

    // 达到最大步数
    this.logger.warn('达到最大步数', {
      maxSteps,
    });

    return {
      success: false,
      error: `Task couldn't be completed after ${maxSteps} steps.`,
      steps: maxSteps,
      executionTime: Date.now() - startTime,
      metadata: {
        provider,
        model,
        maxSteps,
      },
    };
  }

  /**
   * 获取可用的工具列表
   * @returns 工具名称列表
   */
  getAvailableTools(): string[] {
    return this.toolService.getToolNames();
  }

  /**
   * 获取工具数量
   * @returns 工具数量
   */
  getToolCount(): number {
    return this.toolService.size();
  }
}