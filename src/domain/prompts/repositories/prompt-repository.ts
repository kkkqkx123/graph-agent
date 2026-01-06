/**
 * 提示词仓储接口
 *
 * 定义提示词持久化和查询的契约
 * 使用业务导向的方法，避免技术细节泄露
 */

import { Repository } from '../../common/repositories/repository';
import { Prompt } from '../entities/prompt';
import { PromptId } from '../value-objects/prompt-id';

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

/**
 * 提示词仓储接口
 */
export interface IPromptRepository extends Repository<Prompt, PromptId> {
  /**
   * 根据类别查找提示词
   * @param category 类别名称
   * @returns 提示词列表
   */
  findByCategory(category: string): Promise<Prompt[]>;

  /**
   * 列出所有提示词
   * @returns 提示词列表
   */
  listAll(): Promise<Prompt[]>;

  /**
   * 搜索提示词
   * @param criteria 搜索条件
   * @returns 提示词列表
   */
  search(criteria: PromptSearchCriteria): Promise<Prompt[]>;

  /**
   * 检查提示词是否存在
   * @param id 提示词ID
   * @returns 是否存在
   */
  exists(id: PromptId): Promise<boolean>;
}
