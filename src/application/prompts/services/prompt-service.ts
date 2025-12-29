/**
 * 提示词服务
 *
 * 提供基本的提示词管理、查询功能
 * 用于用户接口层，方便用户管理提示词
 */

import { PromptRepository, PromptSearchCriteria } from '../../../infrastructure/persistence/repositories/prompt-repository';
import { Prompt, PromptId } from '../../../domain/prompts';

// 导入新的DTO
import {
  PromptInfoDto,
  PromptSummaryDto,
  PromptSearchRequestDto,
  PromptSearchResultDto,
  PromptStatisticsDto,
  PromptConverter,
  PromptInfo,
  PromptSearchResult,
  PromptStatistics,
  PromptSummary
} from '../dtos/prompts.dto';

import { DtoValidationError } from '../../common/dto/base-dto';

export class PromptService {
  private promptInfoDto: PromptInfoDto;
  private promptSummaryDto: PromptSummaryDto;
  private promptSearchRequestDto: PromptSearchRequestDto;
  private promptSearchResultDto: PromptSearchResultDto;
  private promptStatisticsDto: PromptStatisticsDto;
  private promptConverter: PromptConverter;

  constructor(
    private readonly promptRepository: PromptRepository
  ) {
    // 初始化DTO实例
    this.promptInfoDto = new PromptInfoDto();
    this.promptSummaryDto = new PromptSummaryDto();
    this.promptSearchRequestDto = new PromptSearchRequestDto();
    this.promptSearchResultDto = new PromptSearchResultDto();
    this.promptStatisticsDto = new PromptStatisticsDto();
    this.promptConverter = new PromptConverter();
  }

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
   * 获取提示词信息（DTO）
   */
  async getPromptInfo(id: PromptId): Promise<PromptInfo | null> {
    try {
      const prompt = await this.getPrompt(id);
      return this.promptConverter.toDto(prompt);
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取类别下的所有提示词
   */
  async getPromptsByCategory(category: string): Promise<Prompt[]> {
    return this.promptRepository.findByCategory(category);
  }

  /**
   * 获取类别下的所有提示词信息（DTO）
   */
  async getPromptInfosByCategory(category: string): Promise<PromptInfo[]> {
    const prompts = await this.getPromptsByCategory(category);
    return this.promptConverter.toDtoList(prompts);
  }

  /**
   * 获取类别下的所有提示词摘要（DTO）
   */
  async getPromptSummariesByCategory(category: string): Promise<PromptSummary[]> {
    const prompts = await this.getPromptsByCategory(category);
    return this.promptConverter.toSummaryList(prompts);
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
   * 列出所有提示词信息（DTO）
   */
  async listPromptInfos(category?: string): Promise<PromptInfo[]> {
    const prompts = await this.listPrompts(category);
    return this.promptConverter.toDtoList(prompts);
  }

  /**
   * 列出所有提示词摘要（DTO）
   */
  async listPromptSummaries(category?: string): Promise<PromptSummary[]> {
    const prompts = await this.listPrompts(category);
    return this.promptConverter.toSummaryList(prompts);
  }

  /**
   * 搜索提示词
   */
  async searchPrompts(criteria: PromptSearchCriteria): Promise<Prompt[]> {
    return this.promptRepository.search(criteria);
  }

  /**
   * 搜索提示词（DTO）
   */
  async searchPromptsWithDto(request: unknown): Promise<PromptSearchResult> {
    try {
      // 验证搜索请求
      const validatedRequest = this.promptSearchRequestDto.validate(request);

      // 转换为搜索条件
      const criteria: PromptSearchCriteria = {
        query: validatedRequest.keyword,
        category: validatedRequest.category,
        tags: validatedRequest.tags,
        offset: validatedRequest.pagination ? (validatedRequest.pagination.page - 1) * validatedRequest.pagination.size : undefined,
        limit: validatedRequest.pagination?.size,
        sortBy: validatedRequest.sortBy,
        sortOrder: validatedRequest.sortOrder
      };

      // 执行搜索
      const prompts = await this.searchPrompts(criteria);

      // 获取总数（简化实现，实际应该从仓库获取）
      const total = prompts.length;

      // 分页处理
      const page = validatedRequest.pagination?.page || 1;
      const size = validatedRequest.pagination?.size || 20;
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedPrompts = prompts.slice(startIndex, endIndex);

      // 转换为DTO
      const promptDtos = validatedRequest.pagination
        ? this.promptConverter.toSummaryList(paginatedPrompts)
        : this.promptConverter.toDtoList(paginatedPrompts);

      return {
        prompts: promptDtos,
        total,
        page,
        size
      };
    } catch (error) {
      if (error instanceof DtoValidationError) {
        throw new Error(`无效的搜索请求: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取提示词统计信息（DTO）
   */
  async getPromptStatistics(): Promise<PromptStatistics> {
    const allPrompts = await this.listPrompts();

    // 计算统计信息
    const totalPrompts = allPrompts.length;
    const promptsByCategory: Record<string, number> = {};
    const promptsByTag: Record<string, number> = {};

    allPrompts.forEach(prompt => {
      // 按类别统计
      const category = prompt.category || '未分类';
      promptsByCategory[category] = (promptsByCategory[category] || 0) + 1;

      // 按标签统计
      if (prompt.metadata.tags && Array.isArray(prompt.metadata.tags)) {
        prompt.metadata.tags.forEach((tag: string) => {
          promptsByTag[tag] = (promptsByTag[tag] || 0) + 1;
        });
      }
    });

    // 获取最近创建的提示词
    const recentlyCreated = this.promptConverter.toSummaryList(
      allPrompts
        .sort((a, b) => b.createdAt.getMilliseconds() - a.createdAt.getMilliseconds())
        .slice(0, 10)
    );

    // 简化实现：最常用的提示词（实际应该有使用统计）
    const mostUsed = recentlyCreated.slice(0, 5);

    return {
      totalPrompts,
      promptsByCategory,
      promptsByTag,
      recentlyCreated,
      mostUsed
    };
  }

  /**
   * 加载提示词内容
   */
  async loadPromptContent(category: string, name: string): Promise<string> {
    const prompts = await this.getPromptsByCategory(category);
    const prompt = prompts.find(p => p.name === name);
    
    if (!prompt) {
      throw new Error(`提示词 ${category}.${name} 未找到`);
    }
    
    return prompt.content;
  }

  /**
   * 检查提示词是否存在
   */
  async promptExists(category: string, name: string): Promise<boolean> {
    const prompts = await this.getPromptsByCategory(category);
    return prompts.some(p => p.name === name);
  }
}