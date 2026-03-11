/**
 * SkillRegistryAPI - Skill资源管理API
 * 封装SkillRegistry和SkillLoader，提供Skill注册、查询、加载功能
 *
 * 设计模式：
 * - 继承GenericResourceAPI，提供统一的CRUD操作
 * - 实现渐进式披露（Progressive Disclosure）的API层支持
 */

import {
  validateRequiredFields,
  validateStringLength
} from '../../validation/validation-strategy.js';

import type {
  Skill,
  SkillMetadata,
  SkillMatchResult,
  SkillResourceType,
  SkillLoadResult
} from '@modular-agent/types';
import { NotFoundError, ExecutionError } from '@modular-agent/types';
import { GenericResourceAPI } from '../generic-resource-api.js';
import type { APIDependencyManager } from '../../core/sdk-dependencies.js';
import type { ExecutionResult } from '../../types/execution-result.js';
import { success, failure } from '../../types/execution-result.js';
import { now, diffTimestamp } from '@modular-agent/common-utils';

/**
 * Skill过滤器
 */
export interface SkillFilter {
  /** Skill名称（支持模糊搜索） */
  name?: string;
  /** 标签数组 */
  tags?: string[];
  /** 版本 */
  version?: string;
}

/**
 * Skill加载选项
 */
export interface SkillLoadOptions {
  /** 加载上下文 */
  context?: {
    tools?: string[];
    agentContext?: any;
  };
  /** 是否使用缓存 */
  useCache?: boolean;
}

/**
 * SkillRegistryAPI - Skill资源管理API
 *
 * 提供Skill的CRUD操作和渐进式披露支持：
 * - Level 1: generateMetadataPrompt() - 元数据提示
 * - Level 2: loadContent() - 按需加载内容
 * - Level 3: loadResources() - 加载嵌套资源
 */
export class SkillRegistryAPI extends GenericResourceAPI<SkillMetadata, string, SkillFilter> {
  private dependencies: APIDependencyManager;

  constructor(dependencies: APIDependencyManager) {
    super();
    this.dependencies = dependencies;
  }

  // ============================================================================
  // GenericResourceAPI 抽象方法实现
  // ============================================================================

  /**
   * 获取单个Skill元数据
   * @param name Skill名称
   * @returns Skill元数据，如果不存在则返回null
   */
  protected async getResource(name: string): Promise<SkillMetadata | null> {
    try {
      const skill = this.getSkillRegistry().getSkill(name);
      return skill ? skill.metadata : null;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取所有Skill元数据
   * @returns Skill元数据数组
   */
  protected async getAllResources(): Promise<SkillMetadata[]> {
    return this.getSkillRegistry().getAllSkills();
  }

  /**
   * 创建Skill（暂不支持，Skill通过文件系统管理）
   * @param skill Skill元数据
   */
  protected async createResource(skill: SkillMetadata): Promise<void> {
    throw new Error('Skill creation via API is not supported. Skills are managed through the file system.');
  }

  /**
   * 更新Skill（暂不支持，Skill通过文件系统管理）
   * @param name Skill名称
   * @param updates 更新内容
   */
  protected async updateResource(name: string, updates: Partial<SkillMetadata>): Promise<void> {
    throw new Error('Skill update via API is not supported. Skills are managed through the file system.');
  }

  /**
   * 删除Skill（暂不支持，Skill通过文件系统管理）
   * @param name Skill名称
   */
  protected async deleteResource(name: string): Promise<void> {
    throw new Error('Skill deletion via API is not supported. Skills are managed through the file system.');
  }

  /**
   * 清空所有Skill
   */
  protected override async clearResources(): Promise<void> {
    this.getSkillRegistry().clearCache();
  }

  /**
   * 应用过滤条件
   * @param skills Skill元数据数组
   * @param filter 过滤条件
   * @returns 过滤后的Skill数组
   */
  protected applyFilter(skills: SkillMetadata[], filter: SkillFilter): SkillMetadata[] {
    return skills.filter(skill => {
      if (filter.name && !skill.name.includes(filter.name)) {
        return false;
      }
      if (filter.version && skill.version !== filter.version) {
        return false;
      }
      // 标签过滤（如果Skill有metadata字段）
      if (filter.tags && skill.metadata) {
        const skillTags = Object.values(skill.metadata);
        if (!filter.tags.every(tag => skillTags.includes(tag))) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 验证Skill元数据
   * @param skill Skill元数据
   * @param context 验证上下文
   * @returns 验证结果
   */
  protected override async validateResource(
    skill: SkillMetadata,
    context?: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 验证必需字段
    const requiredResult = validateRequiredFields(skill, ['name', 'description'], 'skill');
    if (requiredResult.isErr()) {
      errors.push(...requiredResult.unwrapOrElse(err => err.map(error => error.message)));
    }

    // 验证名称格式
    if (skill.name) {
      const nameResult = validateStringLength(skill.name, 'Skill名称', 1, 100);
      if (nameResult.isErr()) {
        errors.push(...nameResult.unwrapOrElse(err => err.map(error => error.message)));
      }
      // 验证名称格式：小写字母、数字、连字符
      if (!/^[a-z0-9-]+$/.test(skill.name)) {
        errors.push(`Invalid skill name '${skill.name}': must be lowercase alphanumeric with hyphens only`);
      }
    }

    // 验证描述长度
    if (skill.description) {
      const descResult = validateStringLength(skill.description, 'Skill描述', 1, 1000);
      if (descResult.isErr()) {
        errors.push(...descResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // Skill特有方法 - 渐进式披露支持
  // ============================================================================

  /**
   * 生成Skill元数据提示（Progressive Disclosure Level 1）
   *
   * 用于注入到系统提示中，让Agent知道有哪些Skill可用
   *
   * @returns 元数据提示字符串
   */
  generateMetadataPrompt(): string {
    return this.getSkillLoader().generateMetadataPrompt();
  }

  /**
   * 加载Skill内容（Progressive Disclosure Level 2）
   *
   * 按需加载Skill的完整内容（SKILL.md）
   *
   * @param name Skill名称
   * @param options 加载选项
   * @returns 执行结果
   */
  async loadContent(name: string, options?: SkillLoadOptions): Promise<ExecutionResult<string>> {
    const startTime = now();

    try {
      const result = await this.getSkillLoader().loadContent(name, options?.context);

      if (!result.success || !result.content) {
        const error = result.error instanceof Error
          ? new ExecutionError(result.error.message, undefined, undefined, { cause: result.error })
          : new NotFoundError(`Failed to load skill: ${name}`, 'skill', name);
        return failure(error, diffTimestamp(startTime, now()));
      }

      return success(result.content, diffTimestamp(startTime, now()));
    } catch (error) {
      return this.handleError(error, 'LOAD_CONTENT', startTime);
    }
  }

  /**
   * 加载Skill资源（Progressive Disclosure Level 3）
   *
   * 加载Skill的嵌套资源（references, examples, scripts, assets）
   *
   * @param name Skill名称
   * @param resourceType 资源类型
   * @param options 加载选项
   * @returns 执行结果
   */
  async loadResources(
    name: string,
    resourceType: SkillResourceType,
    options?: SkillLoadOptions
  ): Promise<ExecutionResult<Map<string, string | Buffer>>> {
    const startTime = now();

    try {
      const resources = await this.getSkillLoader().loadResources(name, resourceType, options?.context);
      return success(resources, diffTimestamp(startTime, now()));
    } catch (error) {
      return this.handleError(error, 'LOAD_RESOURCES', startTime);
    }
  }

  /**
   * 将Skill转换为提示词格式
   *
   * @param name Skill名称
   * @returns 执行结果
   */
  async toPrompt(name: string): Promise<ExecutionResult<string>> {
    const startTime = now();

    try {
      const prompt = await this.getSkillLoader().toPrompt(name);
      return success(prompt, diffTimestamp(startTime, now()));
    } catch (error) {
      return this.handleError(error, 'TO_PROMPT', startTime);
    }
  }

  /**
   * 根据描述匹配Skill
   *
   * @param query 查询字符串
   * @returns 匹配结果数组
   */
  async matchSkills(query: string): Promise<ExecutionResult<SkillMatchResult[]>> {
    const startTime = now();

    try {
      const results = this.getSkillRegistry().matchSkills(query);
      return success(results, diffTimestamp(startTime, now()));
    } catch (error) {
      return this.handleError(error, 'MATCH_SKILLS', startTime);
    }
  }

  /**
   * 列出Skill的所有资源
   *
   * @param name Skill名称
   * @param resourceType 资源类型
   * @returns 资源路径数组
   */
  async listResources(
    name: string,
    resourceType: SkillResourceType
  ): Promise<ExecutionResult<string[]>> {
    const startTime = now();

    try {
      const resources = await this.getSkillRegistry().listSkillResources(name, resourceType);
      return success(resources, diffTimestamp(startTime, now()));
    } catch (error) {
      return this.handleError(error, 'LIST_RESOURCES', startTime);
    }
  }

  /**
   * 重新加载所有Skill
   *
   * @returns 执行结果
   */
  async reload(): Promise<ExecutionResult<void>> {
    const startTime = now();

    try {
      await this.getSkillRegistry().reload();
      return success(undefined, diffTimestamp(startTime, now()));
    } catch (error) {
      return this.handleError(error, 'RELOAD', startTime);
    }
  }

  /**
   * 清除缓存
   *
   * @param name 可选，指定要清除的Skill名称
   */
  clearCache(name?: string): void {
    if (name) {
      this.getSkillLoader().clearCache(name);
    } else {
      this.getSkillLoader().clearCache();
      this.getSkillRegistry().clearCache();
    }
  }

  /**
   * 获取完整的Skill对象（包含路径信息）
   *
   * @param name Skill名称
   * @returns Skill对象或null
   */
  async getFullSkill(name: string): Promise<Skill | null> {
    return this.getSkillRegistry().getSkill(name) || null;
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 获取SkillRegistry实例
   */
  private getSkillRegistry() {
    return this.dependencies.getSkillRegistry();
  }

  /**
   * 获取SkillLoader实例
   */
  private getSkillLoader() {
    return this.dependencies.getSkillLoader();
  }
}
