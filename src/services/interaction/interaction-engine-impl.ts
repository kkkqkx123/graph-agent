/**
 * Interaction Engine 实现
 * 
 * 负责协调 LLM、Tool、UserInteraction 的执行
 */

import { injectable, inject } from 'inversify';
import { IInteractionEngine } from './interaction-engine';
import { IInteractionContext, InteractionContext } from './interaction-context';
import {
  LLMConfig,
  LLMExecutionResult,
  ToolConfig,
  ToolExecutionResult,
  UserInteractionConfig,
  UserInteractionResult,
} from './types/interaction-types';
import { ILLMExecutor } from './executors/llm-executor';
import { IToolExecutor } from './executors/tool-executor';
import { IUserInteractionHandler } from './executors/user-interaction-handler';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * Interaction Engine 实现
 * 
 * 注意：当前为框架实现，具体协调逻辑将在后续完善
 */
@injectable()
export class InteractionEngine implements IInteractionEngine {
  private currentContext: IInteractionContext;

  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('LLMExecutor') private readonly llmExecutor: ILLMExecutor,
    @inject('ToolExecutor') private readonly toolExecutor: IToolExecutor,
    @inject('UserInteractionHandler') private readonly userInteractionHandler: IUserInteractionHandler
  ) {
    this.currentContext = new InteractionContext();
  }

  async executeLLM(
    config: LLMConfig,
    context: IInteractionContext
  ): Promise<LLMExecutionResult> {
    this.logger.debug('InteractionEngine 开始执行 LLM 调用', {
      provider: config.provider,
      model: config.model,
    });

    try {
      // 委托给 LLMExecutor 执行
      const result = await this.llmExecutor.execute(config, context);

      // 更新上下文
      if (result.success && result.messages) {
        result.messages.forEach(msg => context.addMessage(msg));
      }

      if (result.llmCalls) {
        result.llmCalls.forEach(call => context.addLLMCall(call));
      }

      if (result.tokenUsage) {
        context.updateTokenUsage(result.tokenUsage);
      }

      return result;
    } catch (error) {
      this.logger.error('InteractionEngine 执行 LLM 调用失败', error instanceof Error ? error : new Error(String(error)));

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
    context: IInteractionContext
  ): Promise<ToolExecutionResult> {
    this.logger.debug('InteractionEngine 开始执行工具调用', {
      toolId: config.toolId,
    });

    try {
      // 委托给 ToolExecutor 执行
      const result = await this.toolExecutor.execute(config, context);

      // TODO: 更新上下文（如果需要）

      return result;
    } catch (error) {
      this.logger.error('InteractionEngine 执行工具调用失败', error instanceof Error ? error : new Error(String(error)));

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
    context: IInteractionContext
  ): Promise<UserInteractionResult> {
    this.logger.debug('InteractionEngine 开始处理用户交互', {
      interactionType: config.interactionType,
    });

    try {
      // 委托给 UserInteractionHandler 处理
      const result = await this.userInteractionHandler.handle(config, context);

      // TODO: 更新上下文（如果需要）

      return result;
    } catch (error) {
      this.logger.error('InteractionEngine 处理用户交互失败', error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          interactionType: config.interactionType,
        },
      };
    }
  }

  getContext(): IInteractionContext {
    return this.currentContext;
  }

  createContext(): IInteractionContext {
    return new InteractionContext();
  }
}