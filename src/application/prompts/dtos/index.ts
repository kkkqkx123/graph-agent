/**
 * 提示词DTO模块导出
 */

// 导出新的基于Zod的DTO
export * from './prompts.dto';

// 为了向后兼容，保留旧的导出
export type {
  PromptInfo,
  PromptSummary,
  PromptSearchRequest,
  PromptSearchResult,
  PromptStatistics,
  PromptConfigRequest,
  PromptInjectionRequest,
  PromptInjectionResult
} from './prompts.dto';

export type {
  PromptConfigDto
} from './prompts.dto';