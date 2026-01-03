/**
 * 提示词仓库
 *
 * 基于配置加载模块存储提示词。
 */

import { ConfigLoadingModule } from '../../config/loading/config-loading-module';
import { ILogger } from '../../../domain/common/types';
import { Prompt, PromptProps } from '../../../domain/prompts/entities/prompt';
import { PromptId } from '../../../domain/prompts/value-objects/prompt-id';
import { PromptType, inferPromptTypeFromCategory } from '../../../domain/prompts/value-objects/prompt-type';
import { PromptStatus } from '../../../domain/prompts/value-objects/prompt-status';
import { Metadata } from '../../../domain/checkpoint/value-objects/metadata';
import { DeletionStatus } from '../../../domain/checkpoint/value-objects/deletion-status';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { IPromptRepository, PromptSearchCriteria } from '../../../domain/prompts/repositories/prompt-repository';

/**
 * 提示词仓库实现
 */
export class PromptRepository implements IPromptRepository {
  constructor(
    private readonly configLoadingModule: ConfigLoadingModule,
    private readonly logger: ILogger
  ) { }

  async findById(id: PromptId): Promise<Prompt | null> {
    const { category, name } = id.parse();
    const content = this.configLoadingModule.get(`prompts.${category}.${name}`);

    if (!content) {
      return null;
    }

    const promptProps: PromptProps = {
      id,
      name,
      type: inferPromptTypeFromCategory(category),
      content,
      category,
      metadata: Metadata.create({}),
      version: Version.create('1.0.0'),
      status: PromptStatus.ACTIVE,
      deletionStatus: DeletionStatus.active(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      priority: 0,
      dependencies: [],
      variables: []
    };
    return Prompt.fromProps(promptProps);
  }

  async findByCategory(category: string): Promise<Prompt[]> {
    const promptsConfig = this.configLoadingModule.get(`prompts.${category}`);
    if (!promptsConfig || typeof promptsConfig !== 'object') {
      return [];
    }

    const prompts: Prompt[] = [];
    for (const [name, content] of Object.entries(promptsConfig)) {
      const id = PromptId.create(category, name);
      const promptProps: PromptProps = {
        id,
        name,
        type: inferPromptTypeFromCategory(category),
        content: content as string,
        category,
        metadata: Metadata.create({}),
        version: Version.create('1.0.0'),
        status: PromptStatus.ACTIVE,
        deletionStatus: DeletionStatus.active(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        priority: 0,
        dependencies: [],
        variables: []
      };
      prompts.push(Prompt.fromProps(promptProps));
    }
    return prompts;
  }

  async save(prompt: Prompt): Promise<Prompt> {
    // 提示词配置是只读的，不支持保存
    this.logger.warn('提示词仓库不支持保存操作', { promptId: prompt.id.toString() });
    throw new Error('提示词仓库不支持保存操作');
  }

  async saveBatch(prompts: Prompt[]): Promise<Prompt[]> {
    // 提示词配置是只读的，不支持保存
    this.logger.warn('提示词仓库不支持批量保存操作');
    throw new Error('提示词仓库不支持批量保存操作');
  }

  async delete(prompt: Prompt): Promise<void> {
    // 提示词配置是只读的，不支持删除
    this.logger.warn('提示词仓库不支持删除操作', { promptId: prompt.id.toString() });
    throw new Error('提示词仓库不支持删除操作');
  }

  async deleteById(id: PromptId): Promise<void> {
    // 提示词配置是只读的，不支持删除
    this.logger.warn('提示词仓库不支持删除操作', { promptId: id.toString() });
    throw new Error('提示词仓库不支持删除操作');
  }

  async deleteBatch(prompts: Prompt[]): Promise<void> {
    // 提示词配置是只读的，不支持删除
    this.logger.warn('提示词仓库不支持批量删除操作');
    throw new Error('提示词仓库不支持批量删除操作');
  }

  async deleteWhere(options: any): Promise<number> {
    // 提示词配置是只读的，不支持删除
    this.logger.warn('提示词仓库不支持条件删除操作');
    throw new Error('提示词仓库不支持条件删除操作');
  }

  async findByIdOrFail(id: PromptId): Promise<Prompt> {
    const prompt = await this.findById(id);
    if (!prompt) {
      throw new Error(`提示词 ${id.getValue()} 未找到`);
    }
    return prompt;
  }

  async findAll(): Promise<Prompt[]> {
    return this.listAll();
  }

  async find(options: any): Promise<Prompt[]> {
    // 简化实现：使用search方法
    return this.search(options);
  }

  async findOne(options: any): Promise<Prompt | null> {
    const results = await this.find(options);
    return results.length > 0 ? results[0]! : null;
  }

  async findOneOrFail(options: any): Promise<Prompt> {
    const prompt = await this.findOne(options);
    if (!prompt) {
      throw new Error('未找到符合条件的提示词');
    }
    return prompt;
  }

  async findWithPagination(options: any): Promise<any> {
    const allPrompts = await this.listAll();
    const offset = options.offset || 0;
    const limit = options.limit || 10;
    const items = allPrompts.slice(offset, offset + limit);
    return {
      items,
      total: allPrompts.length,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(allPrompts.length / limit)
    };
  }

  async count(options?: any): Promise<number> {
    const allPrompts = await this.listAll();
    return allPrompts.length;
  }

  async listAll(): Promise<Prompt[]> {
    const promptsConfig = this.configLoadingModule.get('prompts');
    if (!promptsConfig || typeof promptsConfig !== 'object') {
      return [];
    }

    const prompts: Prompt[] = [];
    for (const [category, categoryPrompts] of Object.entries(promptsConfig ?? {})) {
      if (typeof categoryPrompts !== 'object') continue;
      for (const [name, content] of Object.entries(categoryPrompts ?? {})) {
        const id = PromptId.create(category, name);
        const promptProps: PromptProps = {
          id,
          name,
          type: inferPromptTypeFromCategory(category),
          content: content as string,
          category,
          metadata: Metadata.create({}),
          version: Version.create('1.0.0'),
          status: PromptStatus.ACTIVE,
          deletionStatus: DeletionStatus.active(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          priority: 0,
          dependencies: [],
          variables: []
        };
        prompts.push(Prompt.fromProps(promptProps));
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
    const content = this.configLoadingModule.get(`prompts.${category}.${name}`);
    return content !== undefined;
  }
}