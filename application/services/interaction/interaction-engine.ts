/**
 * Interaction Engine 实现
 *
 * 负责协调消息、工具调用、LLM 调用的管理
 * 执行 LLM 交互、工具交互、用户交互
 * 管理 InteractionContext
 */

import { injectable, inject } from 'inversify';
import { Message } from '../../domain/interaction/value-objects/message';
import { ToolCall } from '../../domain/interaction/value-objects/tool-call';
import { LLMCall } from '../../domain/interaction/value-objects/llm-call';
import { InteractionTokenUsage as TokenUsage } from '../../domain/interaction/value-objects/token-usage';
import { LLMConfig } from '../../domain/interaction/value-objects/llm-config';
import { ToolConfig } from '../../domain/interaction/value-objects/tool-config';
import { UserInteractionConfig } from '../../domain/interaction/value-objects/user-interaction-config';
import { ILLMExecutor } from './executors/llm-executor';
import { IToolExecutor } from './executors/tool-executor';
import { IUserInteractionHandler } from './executors/user-interaction-handler';
import { ILogger } from '../../domain/common/types/logger-types';
import {
  IMessageManager,
  IToolCallManager,
  ILLMCallManager,
  ITokenManager,
} from './managers';
import { IInteractionContext, InteractionContext } from './interaction-context';
import { MessageRole } from '../../domain/interaction/value-objects/message-role';

/**
 * LLM 执行结果
 */
export interface LLMExecutionResult {
  readonly success: boolean;
  readonly output?: string;
  readonly error?: string;
  readonly messages?: Message[];
  readonly toolCalls?: ToolCall[];
  readonly llmCalls?: LLMCall[];
  readonly tokenUsage?: TokenUsage;
  readonly executionTime?: number;
  readonly metadata?: Record<string, any>;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  readonly success: boolean;
  readonly output?: any;
  readonly error?: string;
  readonly executionTime?: number;
  readonly metadata?: Record<string, any>;
}

/**
 * 用户交互结果
 */
export interface UserInteractionResult {
  readonly success: boolean;
  readonly output?: string;
  readonly error?: string;
  readonly executionTime?: number;
  readonly metadata?: Record<string, any>;
}

/**
 * Interaction Engine 接口
 */
export interface IInteractionEngine {
  /**
   * 执行 LLM 交互
   * @param config LLM 配置
   * @param messages 消息历史
   * @param toolSchemas 工具 Schema（可选）
   * @returns 交互结果
   */
  executeLLM(
    config: LLMConfig,
    messages: Message[],
    toolSchemas?: Record<string, any>[]
  ): Promise<LLMExecutionResult>;

  /**
   * 执行工具交互
   * @param config 工具配置
   * @param toolCalls 工具调用历史
   * @returns 交互结果
   */
  executeTool(
    config: ToolConfig,
    toolCalls: ToolCall[]
  ): Promise<ToolExecutionResult>;

  /**
   * 处理用户交互
   * @param config 用户交互配置
   * @param messages 消息历史
   * @returns 交互结果
   */
  handleUserInteraction(
    config: UserInteractionConfig,
    messages: Message[]
  ): Promise<UserInteractionResult>;

  /**
   * 创建交互上下文
   * @returns 交互上下文
   */
  createContext(): IInteractionContext;
}

/**
 * Interaction Engine 实现
 */
@injectable()
export class InteractionEngine implements IInteractionEngine {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('MessageManager') private readonly messageManager: IMessageManager,
    @inject('ToolCallManager') private readonly toolCallManager: IToolCallManager,
    @inject('LLMCallManager') private readonly llmCallManager: ILLMCallManager,
    @inject('TokenManager') private readonly tokenManager: ITokenManager,
    @inject('LLMExecutor') private readonly llmExecutor: ILLMExecutor,
    @inject('ToolExecutor') private readonly toolExecutor: IToolExecutor,
    @inject('UserInteractionHandler') private readonly userInteractionHandler: IUserInteractionHandler
  ) {}

  async executeLLM(
    config: LLMConfig,
    messages: Message[],
    toolSchemas?: Record<string, any>[]
  ): Promise<LLMExecutionResult> {
    this.logger.debug('InteractionEngine 开始执行 LLM 交互', {
      provider: config.provider,
      model: config.model,
      messageCount: messages.length,
    });

    try {
      // 1. 创建临时上下文用于执行
      const context = this.createContext();
      messages.forEach(msg => context.addMessage(msg));

      // 2. 执行 LLM 调用
      const result = await this.llmExecutor.execute(config, context);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          metadata: {
            provider: config.provider,
            model: config.model,
          },
        };
      }

      // 3. 更新管理器
      if (result.messages) {
        this.messageManager.addMessages(result.messages);
      }

      if (result.llmCalls) {
        result.llmCalls.forEach(call => this.llmCallManager.addLLMCall(call));
      }

      if (result.tokenUsage) {
        this.tokenManager.updateTokenUsage(result.tokenUsage);
      }

      return result;
    } catch (error) {
      this.logger.error('LLM 交互失败', error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          provider: config.provider,
          model: config.model,
        },
      };
    }
  }

  async executeTool(
    config: ToolConfig,
    toolCalls: ToolCall[]
  ): Promise<ToolExecutionResult> {
    this.logger.debug('InteractionEngine 开始执行工具交互', {
      toolId: config.toolId,
    });

    try {
      // 1. 创建临时上下文用于执行
      const context = this.createContext();
      toolCalls.forEach(tc => context.addToolCall(tc));

      // 2. 执行工具调用
      const result = await this.toolExecutor.execute(config, context);

      // 3. 创建工具调用记录
      const toolCall = new ToolCall({
        id: `tool_${Date.now()}`,
        name: config.toolId,
        arguments: config.parameters,
        result: result.success ? result.output : result.error,
        executionTime: result.executionTime,
        timestamp: new Date().toISOString(),
      });

      // 4. 更新管理器
      this.toolCallManager.addToolCall(toolCall);

      return result;
    } catch (error) {
      this.logger.error('工具交互失败', error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          toolId: config.toolId,
        },
      };
    }
  }

  async handleUserInteraction(
    config: UserInteractionConfig,
    messages: Message[]
  ): Promise<UserInteractionResult> {
    this.logger.debug('InteractionEngine 开始处理用户交互', {
      interactionType: config.interactionType,
    });

    try {
      // 1. 创建临时上下文用于执行
      const context = this.createContext();
      messages.forEach(msg => context.addMessage(msg));

      // 2. 处理用户交互
      const result = await this.userInteractionHandler.handle(config, context);

      // 3. 创建用户消息
      if (result.success && result.output) {
        const userMessage = new Message({
          role: MessageRole.USER,
          content: result.output,
        });

        // 4. 更新管理器
        this.messageManager.addMessage(userMessage);
      }

      return result;
    } catch (error) {
      this.logger.error('用户交互失败', error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          interactionType: config.interactionType,
        },
      };
    }
  }

  createContext(): IInteractionContext {
    return new InteractionContext();
  }
}