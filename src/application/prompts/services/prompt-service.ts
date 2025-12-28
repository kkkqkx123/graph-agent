/**
 * 提示词服务
 * 使用基于Zod的DTO实现
 */

import { PromptRepository, PromptSearchCriteria } from '../../../infrastructure/persistence/repositories/prompt-repository';
import { PromptLoader } from '../../../infrastructure/prompts/services/prompt-loader';
import { PromptInjector } from '../../../infrastructure/prompts/services/prompt-injector';
import { Prompt, PromptId, PromptConfig } from '../../../domain/prompts';
import { WorkflowState } from '../../../domain/workflow/value-objects/workflow-state';

// 导入新的DTO
import {
  PromptInfoDto,
  PromptSummaryDto,
  PromptSearchRequestDto,
  PromptSearchResultDto,
  PromptStatisticsDto,
  PromptConfigRequestDto,
  PromptInjectionRequestDto,
  PromptInjectionResultDto,
  PromptConverter,
  PromptConfigConverter,
  type PromptInfo,
  type PromptSummary,
  type PromptSearchRequest,
  type PromptSearchResult,
  type PromptStatistics,
  type PromptConfigRequest,
  type PromptInjectionRequest,
  type PromptInjectionResult
} from '../dtos/prompts.dto';

import { DtoValidationError } from '../../common/dto/base-dto';

export class PromptService {
  private promptInfoDto: PromptInfoDto;
  private promptSummaryDto: PromptSummaryDto;
  private promptSearchRequestDto: PromptSearchRequestDto;
  private promptSearchResultDto: PromptSearchResultDto;
  private promptStatisticsDto: PromptStatisticsDto;
  private promptConfigRequestDto: PromptConfigRequestDto;
  private promptInjectionRequestDto: PromptInjectionRequestDto;
  private promptInjectionResultDto: PromptInjectionResultDto;
  private promptConverter: PromptConverter;
  private promptConfigConverter: PromptConfigConverter;

  constructor(
    private readonly promptRepository: PromptRepository,
    private readonly promptLoader: PromptLoader,
    private readonly promptInjector: PromptInjector
  ) {
    // 初始化DTO实例
    this.promptInfoDto = new PromptInfoDto();
    this.promptSummaryDto = new PromptSummaryDto();
    this.promptSearchRequestDto = new PromptSearchRequestDto();
    this.promptSearchResultDto = new PromptSearchResultDto();
    this.promptStatisticsDto = new PromptStatisticsDto();
    this.promptConfigRequestDto = new PromptConfigRequestDto();
    this.promptInjectionRequestDto = new PromptInjectionRequestDto();
    this.promptInjectionResultDto = new PromptInjectionResultDto();
    this.promptConverter = new PromptConverter();
    this.promptConfigConverter = new PromptConfigConverter();
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
   * 将提示词注入工作流状态
   */
  async injectPromptsIntoWorkflow(
    workflowState: WorkflowState,
    config: PromptConfig
  ): Promise<WorkflowState> {
    return this.promptInjector.injectPrompts(workflowState, config);
  }

  /**
   * 注入提示词到工作流（DTO）
   */
  async injectPromptsIntoWorkflowWithDto(request: unknown): Promise<PromptInjectionResult> {
    try {
      // 验证注入请求
      const validatedRequest = this.promptInjectionRequestDto.validate(request);

      // 获取工作流状态（简化实现）
      const workflowState = {} as WorkflowState; // 实际应该从仓库获取

      // 创建提示词配置
      const promptConfig: PromptConfig = {
        rules: (validatedRequest.config.config as any)['rules'] || []
      };

      // 执行注入
      const updatedWorkflowState = await this.injectPromptsIntoWorkflow(
        workflowState,
        promptConfig
      );

      return {
        success: true,
        workflowState: updatedWorkflowState as any, // 简化实现
        injectedPrompts: ['prompt1', 'prompt2'], // 简化实现
        warnings: validatedRequest.force ? ['强制注入可能覆盖现有配置'] : undefined
      };
    } catch (error) {
      if (error instanceof DtoValidationError) {
        return {
          success: false,
          workflowState: {},
          injectedPrompts: [],
          errorMessage: `无效的注入请求: ${error.message}`
        };
      }

      return {
        success: false,
        workflowState: {},
        injectedPrompts: [],
        errorMessage: `注入失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
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

  /**
   * 创建提示词配置（DTO）
   */
  async createPromptConfig(request: unknown): Promise<any> {
    try {
      // 验证配置请求
      const validatedRequest = this.promptConfigRequestDto.validate(request);

      // 创建配置（简化实现）
      const config = {
        configId: crypto.randomUUID(),
        name: `config_${Date.now()}`,
        value: validatedRequest.config,
        description: validatedRequest.description,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return config;
    } catch (error) {
      if (error instanceof DtoValidationError) {
        throw new Error(`无效的配置请求: ${error.message}`);
      }
      throw error;
    }
  }
}