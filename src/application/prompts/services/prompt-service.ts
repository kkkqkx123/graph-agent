/**
 * 提示词服务
 */

import { PromptRepository, PromptSearchCriteria } from '../../../infrastructure/prompts/repositories/prompt-repository';
import { PromptLoader } from '../../../infrastructure/prompts/services/prompt-loader';
import { PromptInjector } from '../../../infrastructure/prompts/services/prompt-injector';
import { Prompt } from '../../../domain/prompts/entities/prompt';
import { PromptId } from '../../../domain/prompts/value-objects/prompt-id';
import { PromptConfig } from '../../../domain/prompts/entities/prompt';
import { WorkflowState } from '../../../domain/workflow/state/workflow-state';

export class PromptService {
  constructor(
    private readonly promptRepository: PromptRepository,
    private readonly promptLoader: PromptLoader,
    private readonly promptInjector: PromptInjector
  ) {}

  /**
   * 获取提示词
   */
  async getPrompt(id: PromptId): Promise<Prompt> {
    const prompt = await this.promptRepository.findById(id);
    if (!prompt) {
      throw new Error(`提示词 ${id.getValue()} 未找到`);
    }
    return prompt;
  }

  /**
   * 获取类别下的所有提示词
   */
  async getPromptsByCategory(category: string): Promise<Prompt[]> {
    return this.promptRepository.findByCategory(category);
  }

  /**
   * 列出所有提示词
   */
  async listPrompts(category?: string): Promise<Prompt[]> {
    if (category) {
      return this.getPromptsByCategory(category);
    }
    return this.promptRepository.listAll();
  }

  /**
   * 搜索提示词
   */
  async searchPrompts(criteria: PromptSearchCriteria): Promise<Prompt[]> {
    // 简化搜索，使用仓库的搜索方法
    return this.promptRepository.search(criteria);
  }

  /**
   * 将提示词注入工作流状态
   */
  async injectPromptsIntoWorkflow(
    workflowState: WorkflowState,
    config: PromptConfig
  ): Promise<WorkflowState> {
    return this.promptInjector.injectPrompts(workflowState, config);
  }

  /**
   * 加载提示词内容
   */
  async loadPromptContent(category: string, name: string): Promise<string> {
    return this.promptLoader.loadPrompt(category, name);
  }

  /**
   * 检查提示词是否存在
   */
  async promptExists(category: string, name: string): Promise<boolean> {
    return this.promptLoader.exists(category, name);
  }
}