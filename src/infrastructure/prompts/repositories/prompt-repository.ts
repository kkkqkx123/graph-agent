/**
 * 提示词仓库实现
 * 
 * 基于配置管理器存储提示词。
 */

import { IConfigManager } from '@shared/types/config';
import { ILogger } from '@shared/types/logger';
import { IPromptRepository, PromptSearchCriteria } from '../../../domain/prompts/interfaces/prompt-repository.interface';
import { Prompt } from '../../../domain/prompts/entities/prompt';
import { PromptId } from '../../../domain/prompts/value-objects/prompt-id';
import { PromptType, inferPromptTypeFromCategory } from '../../../domain/prompts/value-objects/prompt-type';
import { PromptStatus } from '../../../domain/prompts/value-objects/prompt-status';

export class PromptRepository implements IPromptRepository {
  constructor(
    private readonly configManager: IConfigManager,
    private readonly logger: ILogger
  ) {}

  async findById(id: PromptId): Promise<Prompt | null> {
    const { category, name } = id.parse();
    const content = this.configManager.get(`prompts.${category}.${name}`);
    
    if (!content) {
      return null;
    }
    
    return {
      id,
      name,
      type: inferPromptTypeFromCategory(category),
      content,
      category,
      metadata: {},
      version: '1.0.0',
      status: PromptStatus.ACTIVE
    };
  }

  async findByCategory(category: string): Promise<Prompt[]> {
    const promptsConfig = this.configManager.get(`prompts.${category}`);
    if (!promptsConfig || typeof promptsConfig !== 'object') {
      return [];
    }
    
    const prompts: Prompt[] = [];
    for (const [name, content] of Object.entries(promptsConfig)) {
      const id = PromptId.create(category, name);
      prompts.push({
        id,
        name,
        type: inferPromptTypeFromCategory(category),
        content: content as string,
        category,
        metadata: {},
        version: '1.0.0',
        status: PromptStatus.ACTIVE
      });
    }
    return prompts;
  }

  async save(prompt: Prompt): Promise<void> {
    // 提示词配置是只读的，不支持保存
    this.logger.warn('提示词仓库不支持保存操作', { promptId: prompt.id.getValue() });
    throw new Error('提示词仓库不支持保存操作');
  }

  async delete(id: PromptId): Promise<void> {
    // 提示词配置是只读的，不支持删除
    this.logger.warn('提示词仓库不支持删除操作', { promptId: id.getValue() });
    throw new Error('提示词仓库不支持删除操作');
  }

  async listAll(): Promise<Prompt[]> {
    const promptsConfig = this.configManager.get('prompts');
    if (!promptsConfig || typeof promptsConfig !== 'object') {
      return [];
    }
    
    const prompts: Prompt[] = [];
    for (const [category, categoryPrompts] of Object.entries(promptsConfig ?? {})) {
      if (typeof categoryPrompts !== 'object') continue;
      for (const [name, content] of Object.entries(categoryPrompts ?? {})) {
        const id = PromptId.create(category, name);
        prompts.push({
          id,
          name,
          type: inferPromptTypeFromCategory(category),
          content: content as string,
          category,
          metadata: {},
          version: '1.0.0',
          status: PromptStatus.ACTIVE
        });
      }
    }
    return prompts;
  }

  async search(criteria: PromptSearchCriteria): Promise<Prompt[]> {
    // 简化实现：先获取所有提示词，然后过滤
    const allPrompts = await this.listAll();
    return allPrompts.filter(prompt => {
      if (criteria.category && prompt.category !== criteria.category) {
        return false;
      }
      if (criteria.type && prompt.type !== criteria.type) {
        return false;
      }
      if (criteria.status && prompt.status !== criteria.status) {
        return false;
      }
      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        const matches = prompt.name.toLowerCase().includes(query) ||
          prompt.content.toLowerCase().includes(query) ||
          (prompt.description && prompt.description.toLowerCase().includes(query));
        if (!matches) return false;
      }
      // 其他条件暂不实现
      return true;
    });
  }

  async exists(id: PromptId): Promise<boolean> {
    const { category, name } = id.parse();
    const content = this.configManager.get(`prompts.${category}.${name}`);
    return content !== undefined;
  }
}