/**
 * Interaction Engine 接口
 * 
 * 负责协调 LLM、Tool、UserInteraction 的执行
 */

import { IInteractionContext } from './interaction-context';
import {
  LLMConfig,
  LLMExecutionResult,
  ToolConfig,
  ToolExecutionResult,
  UserInteractionConfig,
  UserInteractionResult,
} from './types/interaction-types';

/**
 * Interaction Engine 接口
 */
export interface IInteractionEngine {
  /**
   * 执行 LLM 调用
   * @param config LLM 配置
   * @param context Interaction 上下文
   * @returns 执行结果
   */
  executeLLM(
    config: LLMConfig,
    context: IInteractionContext
  ): Promise<LLMExecutionResult>;

  /**
   * 执行工具调用
   * @param config 工具配置
   * @param context Interaction 上下文
   * @returns 执行结果
   */
  executeTool(
    config: ToolConfig,
    context: IInteractionContext
  ): Promise<ToolExecutionResult>;

  /**
   * 处理用户交互
   * @param config 用户交互配置
   * @param context Interaction 上下文
   * @returns 执行结果
   */
  handleUserInteraction(
    config: UserInteractionConfig,
    context: IInteractionContext
  ): Promise<UserInteractionResult>;

  /**
   * 获取当前上下文
   */
  getContext(): IInteractionContext;

  /**
   * 创建新的上下文
   */
  createContext(): IInteractionContext;
}