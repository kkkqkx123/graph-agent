/**
 * 提示词注入器实现
 */

import { ILogger } from '../../../domain/common/types/logger-types';
import { IPromptInjector } from '../../../domain/prompts/interfaces/prompt-injector.interface';
import { IPromptLoader } from '../../../domain/prompts/interfaces/prompt-loader.interface';
import { PromptConfig } from '../../../domain/prompts/entities/prompt';
import { WorkflowState } from '../../../domain/workflow/state/workflow-state';

export class PromptInjector implements IPromptInjector {
  constructor(
    private readonly promptLoader: IPromptLoader,
    private readonly logger: ILogger
  ) {}

  async injectPrompts(state: WorkflowState, config: PromptConfig): Promise<WorkflowState> {
    // 由于WorkflowState是不可变的，我们需要一个构建器
    // 这里简化处理：假设有一个WorkflowStateBuilder
    // 实际上，我们需要查看现有的WorkflowState构建器
    // 暂时返回原始状态，待实现
    this.logger.debug('注入提示词', { config });
    
    // 注入系统提示词
    if (config.systemPrompt) {
      state = await this.injectSystemPrompt(state, config.systemPrompt);
    }
    
    // 注入规则提示词
    if (config.rules && config.rules.length > 0) {
      state = await this.injectRulePrompts(state, config.rules);
    }
    
    // 注入用户指令
    if (config.userCommand) {
      state = await this.injectUserCommand(state, config.userCommand);
    }
    
    // 其他类型暂不实现
    return state;
  }

  async injectSystemPrompt(state: WorkflowState, promptName: string): Promise<WorkflowState> {
    const content = await this.promptLoader.loadPrompt('system', promptName);
    // 假设WorkflowState有一个addMessage方法
    // 这里简化处理，返回新状态
    this.logger.debug('注入系统提示词', { promptName });
    return this.addMessage(state, { role: 'system', content });
  }

  async injectRulePrompts(state: WorkflowState, ruleNames: string[]): Promise<WorkflowState> {
    let newState = state;
    for (const ruleName of ruleNames) {
      const content = await this.promptLoader.loadPrompt('rules', ruleName);
      newState = this.addMessage(newState, { role: 'system', content });
    }
    this.logger.debug('注入规则提示词', { ruleNames });
    return newState;
  }

  async injectUserCommand(state: WorkflowState, commandName: string): Promise<WorkflowState> {
    const content = await this.promptLoader.loadPrompt('user_commands', commandName);
    this.logger.debug('注入用户指令', { commandName });
    return this.addMessage(state, { role: 'user', content });
  }

  /**
   * 辅助方法：向工作流状态添加消息
   */
  private addMessage(state: WorkflowState, message: { role: string; content: string }): WorkflowState {
    // 这里需要根据实际的WorkflowState API实现
    // 暂时返回原始状态
    return state;
  }
}