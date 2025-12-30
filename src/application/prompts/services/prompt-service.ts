/**
 * 提示词服务
 *
 * 提供基本的提示词管理、查询功能
 * 用于用户接口层，方便用户管理提示词
 */

import { PromptRepository, PromptSearchCriteria } from '../../../infrastructure/persistence/repositories/prompt-repository';
import { Prompt, PromptId } from '../../../domain/prompts';

export class PromptService {
  constructor(
    private readonly promptRepository: PromptRepository
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
    return this.promptRepository.search(criteria);
  }

  /**
   * 加载提示词内容
   * 支持从配置中加载提示词，返回完整的提示词对象（包含 content 字段）
   * 使用 PromptLoader 的智能查找功能，支持复合提示词目录结构
   */
  async loadPromptContent(category: string, name: string): Promise<Record<string, unknown> | string> {
    // 首先尝试从已加载的配置中查找
    const prompts = await this.getPromptsByCategory(category);
    const prompt = prompts.find(p => p.name === name);
    
    if (prompt) {
      // 返回完整的提示词对象，包含 content 和其他元数据
      return {
        content: prompt.content,
        name: prompt.name,
        category: prompt.category,
        metadata: prompt.metadata
      };
    }
    
    // 如果在已加载的配置中未找到，抛出错误
    throw new Error(`提示词 ${category}.${name} 未找到`);
  }

  /**
   * 检查提示词是否存在
   */
  async promptExists(category: string, name: string): Promise<boolean> {
    // 首先检查已加载的配置
    const prompts = await this.getPromptsByCategory(category);
    if (prompts.some(p => p.name === name)) {
      return true;
    }
    
    // 如果未找到，返回false
    return false;
  }
}