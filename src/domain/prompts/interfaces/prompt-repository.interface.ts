/**
 * 提示词仓库接口
 */

import { Prompt } from '../entities/prompt';
import { PromptId } from '../value-objects/prompt-id';

export interface IPromptRepository {
  /**
   * 根据ID查找提示词
   */
  findById(id: PromptId): Promise<Prompt | null>;

  /**
   * 根据类别查找提示词
   */
  findByCategory(category: string): Promise<Prompt[]>;

  /**
   * 保存提示词
   */
  save(prompt: Prompt): Promise<void>;

  /**
   * 删除提示词
   */
  delete(id: PromptId): Promise<void>;

  /**
   * 列出所有提示词
   */
  listAll(): Promise<Prompt[]>;

  /**
   * 根据搜索条件查找提示词
   */
  search(criteria: PromptSearchCriteria): Promise<Prompt[]>;

  /**
   * 检查提示词是否存在
   */
  exists(id: PromptId): Promise<boolean>;
}

/**
 * 提示词搜索条件
 */
export interface PromptSearchCriteria {
  query?: string;
  type?: string;
  status?: string;
  category?: string;
  tags?: string[];
  tagsMatchAll?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  offset?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}