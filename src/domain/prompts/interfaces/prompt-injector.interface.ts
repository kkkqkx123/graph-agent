/**
 * 提示词注入器接口
 */

import { WorkflowState } from '../../workflow/state/workflow-state';
import { PromptConfig } from '../entities/prompt';

export interface IPromptInjector {
  /**
   * 注入提示词到工作流状态
   */
  injectPrompts(state: WorkflowState, config: PromptConfig): Promise<WorkflowState>;

  /**
   * 注入系统提示词
   */
  injectSystemPrompt(state: WorkflowState, promptName: string): Promise<WorkflowState>;

  /**
   * 注入规则提示词
   */
  injectRulePrompts(state: WorkflowState, ruleNames: string[]): Promise<WorkflowState>;

  /**
   * 注入用户指令
   */
  injectUserCommand(state: WorkflowState, commandName: string): Promise<WorkflowState>;
}