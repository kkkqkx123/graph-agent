/**
 * 提示词模块DTO定义
 * 基于Zod的类型安全DTO实现
 */

import { z } from 'zod';
import { BaseDto, DtoValidationError } from '../../common/dto/base-dto';
import { DtoConverter, ConversionResult } from '../../common/dto/dto-converter';

// 重新导出 DtoValidationError
export { DtoValidationError };

// 基础Schema定义

/**
 * 提示词配置Schema
 */
export const PromptConfigSchema = z.object({
  configId: z.string().uuid().describe('配置ID'),
  name: z.string().min(1).max(100).describe('配置名称'),
  value: z.record(z.string(), z.unknown()).describe('配置值'),
  description: z.string().max(500).optional().describe('配置描述'),
  isDefault: z.boolean().describe('是否为默认配置'),
  createdAt: z.string().datetime().describe('创建时间'),
  updatedAt: z.string().datetime().describe('更新时间')
});

export type PromptConfigDTO = z.infer<typeof PromptConfigSchema>;

/**
 * 提示词配置请求Schema
 */
export const PromptConfigRequestSchema = z.object({
  config: z.record(z.string(), z.unknown()).describe('提示词配置'),
  overwrite: z.boolean().optional().default(false).describe('是否覆盖现有配置'),
  description: z.string().max(500).optional().describe('配置描述')
});

export type PromptConfigRequest = z.infer<typeof PromptConfigRequestSchema>;

/**
 * 提示词信息Schema
 */
export const PromptInfoSchema = z.object({
  promptId: z.string().uuid().describe('提示词ID'),
  name: z.string().min(1).max(200).describe('提示词名称'),
  category: z.string().min(1).max(50).describe('提示词类别'),
  description: z.string().max(1000).optional().describe('提示词描述'),
  content: z.string().min(1).describe('提示词内容'),
  tags: z.array(z.string().max(50)).describe('标签'),
  metadata: z.record(z.string(), z.unknown()).describe('元数据'),
  createdAt: z.string().datetime().describe('创建时间'),
  updatedAt: z.string().datetime().describe('更新时间')
});

export type PromptInfo = z.infer<typeof PromptInfoSchema>;

/**
 * 提示词摘要Schema
 */
export const PromptSummarySchema = z.object({
  promptId: z.string().uuid().describe('提示词ID'),
  name: z.string().min(1).max(200).describe('提示词名称'),
  category: z.string().min(1).max(50).describe('提示词类别'),
  description: z.string().max(1000).optional().describe('提示词描述'),
  tags: z.array(z.string().max(50)).describe('标签'),
  createdAt: z.string().datetime().describe('创建时间')
});

export type PromptSummary = z.infer<typeof PromptSummarySchema>;

/**
 * 提示词搜索请求Schema
 */
export const PromptSearchRequestSchema = z.object({
  keyword: z.string().max(200).optional().describe('搜索关键词'),
  category: z.string().max(50).optional().describe('类别过滤'),
  tags: z.array(z.string().max(50)).optional().describe('标签过滤'),
  searchIn: z.enum(['name', 'content', 'description', 'all']).optional().default('all').describe('搜索范围'),
  pagination: z.object({
    page: z.number().int().min(1).default(1).describe('页码'),
    size: z.number().int().min(1).max(100).default(20).describe('页面大小')
  }).optional().describe('分页参数'),
  sortBy: z.enum(['name', 'category', 'createdAt', 'updatedAt']).optional().default('createdAt').describe('排序字段'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('排序方向')
});

export type PromptSearchRequest = z.infer<typeof PromptSearchRequestSchema>;

/**
 * 提示词搜索结果Schema
 */
export const PromptSearchResultSchema = z.object({
  prompts: z.union([z.array(PromptInfoSchema), z.array(PromptSummarySchema)]).describe('搜索结果列表'),
  total: z.number().int().min(0).describe('总数量'),
  page: z.number().int().min(1).describe('当前页码'),
  size: z.number().int().min(1).describe('页面大小')
});

export type PromptSearchResult = z.infer<typeof PromptSearchResultSchema>;

/**
 * 提示词统计Schema
 */
export const PromptStatisticsSchema = z.object({
  totalPrompts: z.number().int().min(0).describe('总提示词数量'),
  promptsByCategory: z.record(z.string(), z.number().int().min(0)).describe('按类别分组的数量'),
  promptsByTag: z.record(z.string(), z.number().int().min(0)).describe('按标签分组的数量'),
  recentlyCreated: z.array(PromptSummarySchema).describe('最近创建的提示词'),
  mostUsed: z.array(PromptSummarySchema).describe('最常用的提示词')
});

export type PromptStatistics = z.infer<typeof PromptStatisticsSchema>;

/**
 * 提示词注入请求Schema
 */
export const PromptInjectionRequestSchema = z.object({
  workflowId: z.string().uuid().describe('工作流ID'),
  config: PromptConfigRequestSchema.describe('提示词配置'),
  injectionPoint: z.enum(['start', 'end', 'custom']).optional().default('end').describe('注入位置'),
  customPosition: z.record(z.string(), z.unknown()).optional().describe('自定义注入位置'),
  force: z.boolean().optional().default(false).describe('是否强制注入')
});

export type PromptInjectionRequest = z.infer<typeof PromptInjectionRequestSchema>;

/**
 * 提示词注入结果Schema
 */
export const PromptInjectionResultSchema = z.object({
  success: z.boolean().describe('是否成功'),
  workflowState: z.record(z.string(), z.unknown()).describe('注入的工作流状态'),
  injectedPrompts: z.array(z.string()).describe('注入的提示词列表'),
  errorMessage: z.string().optional().describe('错误信息'),
  warnings: z.array(z.string()).optional().describe('警告信息')
});

export type PromptInjectionResult = z.infer<typeof PromptInjectionResultSchema>;

// ==================== DTO类定义 ====================

/**
 * 提示词配置DTO类
 */
export class PromptConfigDto extends BaseDto<typeof PromptConfigSchema> {
  constructor() {
    super(PromptConfigSchema, '1.0.0');
  }
}

/**
 * 提示词配置请求DTO类
 */
export class PromptConfigRequestDto extends BaseDto<typeof PromptConfigRequestSchema> {
  constructor() {
    super(PromptConfigRequestSchema, '1.0.0');
  }
}

/**
 * 提示词信息DTO类
 */
export class PromptInfoDto extends BaseDto<typeof PromptInfoSchema> {
  constructor() {
    super(PromptInfoSchema, '1.0.0');
  }
}

/**
 * 提示词摘要DTO类
 */
export class PromptSummaryDto extends BaseDto<typeof PromptSummarySchema> {
  constructor() {
    super(PromptSummarySchema, '1.0.0');
  }
}

/**
 * 提示词搜索请求DTO类
 */
export class PromptSearchRequestDto extends BaseDto<typeof PromptSearchRequestSchema> {
  constructor() {
    super(PromptSearchRequestSchema, '1.0.0');
  }
}

/**
 * 提示词搜索结果DTO类
 */
export class PromptSearchResultDto extends BaseDto<typeof PromptSearchResultSchema> {
  constructor() {
    super(PromptSearchResultSchema, '1.0.0');
  }
}

/**
 * 提示词统计DTO类
 */
export class PromptStatisticsDto extends BaseDto<typeof PromptStatisticsSchema> {
  constructor() {
    super(PromptStatisticsSchema, '1.0.0');
  }
}

/**
 * 提示词注入请求DTO类
 */
export class PromptInjectionRequestDto extends BaseDto<typeof PromptInjectionRequestSchema> {
  constructor() {
    super(PromptInjectionRequestSchema, '1.0.0');
  }
}

/**
 * 提示词注入结果DTO类
 */
export class PromptInjectionResultDto extends BaseDto<typeof PromptInjectionResultSchema> {
  constructor() {
    super(PromptInjectionResultSchema, '1.0.0');
  }
}

// ==================== 转换器定义 ====================

/**
 * 提示词转换器接口
 */
export interface IPromptConverter {
  toDto(entity: any, options?: any): PromptInfo;
  toEntity(dto: PromptInfo, options?: any): any;
  toDtoList(entities: any[], options?: any): PromptInfo[];
  toEntityList(dtos: PromptInfo[], options?: any): any[];
  toDtoWithStats(entity: any, options?: any): ConversionResult<PromptInfo>;
  toSummary(entity: any): PromptSummary;
  toSummaryList(entities: any[]): PromptSummary[];
  calculateBatchConversionStats(entities: any[]): { total: number; successful: number; failed: number };
}

/**
 * 提示词转换器实现
 */
export class PromptConverter implements IPromptConverter {
  toDto(entity: any, options?: any): PromptInfo {
    return {
      promptId: entity.promptId?.toString() || entity.id?.toString() || '',
      name: entity.name || '',
      category: entity.category || '',
      description: entity.description,
      content: entity.content || '',
      tags: Array.isArray(entity.tags) ? entity.tags : [],
      metadata: entity.metadata || {},
      createdAt: entity.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: entity.updatedAt?.toISOString() || new Date().toISOString()
    };
  }

  toEntity(dto: PromptInfo, options?: any): any {
    // 注意：从DTO到领域对象的转换需要业务上下文
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  toDtoList(entities: any[], options?: any): PromptInfo[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  toEntityList(dtos: PromptInfo[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }

  toSummary(entity: any): PromptSummary {
    return {
      promptId: entity.promptId?.toString() || entity.id?.toString() || '',
      name: entity.name || '',
      category: entity.category || '',
      description: entity.description,
      tags: Array.isArray(entity.tags) ? entity.tags : [],
      createdAt: entity.createdAt?.toISOString() || new Date().toISOString()
    };
  }

  toSummaryList(entities: any[]): PromptSummary[] {
    return entities.map(entity => this.toSummary(entity));
  }

  toDtoWithStats(entity: any, options?: any): ConversionResult<PromptInfo> {
    const dto = this.toDto(entity, options);

    return {
      data: dto,
      stats: {
        fieldsConverted: Object.keys(dto).length,
        fieldsExcluded: 0,
        convertedFields: Object.keys(dto),
        excludedFields: []
      }
    };
  }

  protected calculateConversionStats(
    source: any,
    target: any,
    options?: any
  ): { fieldsConverted: number; fieldsExcluded: number; convertedFields: string[]; excludedFields: string[] } {
    const sourceFields = Object.keys(source);
    const targetFields = Object.keys(target);

    const excludedFields = options?.excludeFields || [];
    const includedFields = options?.includeFields;

    let convertedFields = targetFields;
    let fieldsExcluded = 0;

    if (includedFields) {
      convertedFields = targetFields.filter(field => includedFields.includes(field));
    }

    if (excludedFields.length > 0) {
      fieldsExcluded = excludedFields.filter((field: string) => sourceFields.includes(field)).length;
      convertedFields = convertedFields.filter(field => !excludedFields.includes(field));
    }

    return {
      fieldsConverted: convertedFields.length,
      fieldsExcluded,
      convertedFields,
      excludedFields
    };
  }

  calculateBatchConversionStats(entities: any[]): { total: number; successful: number; failed: number } {
    let successful = 0;
    let failed = 0;

    for (const entity of entities) {
      try {
        this.toDto(entity);
        successful++;
      } catch {
        failed++;
      }
    }

    return {
      total: entities.length,
      successful,
      failed
    };
  }
}

/**
 * 提示词配置转换器
 */
export class PromptConfigConverter extends DtoConverter<any, PromptConfigDTO> {
  toDto(entity: any, options?: any): PromptConfigDTO {
    return {
      configId: entity.configId?.toString() || entity.id?.toString() || '',
      name: entity.name || '',
      value: entity.value || {},
      description: entity.description,
      isDefault: Boolean(entity.isDefault),
      createdAt: entity.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: entity.updatedAt?.toISOString() || new Date().toISOString()
    };
  }

  toEntity(dto: PromptConfigDTO, options?: any): any {
    // 注意：从DTO到领域对象的转换需要业务上下文
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  override toDtoList(entities: any[], options?: any): PromptConfigDTO[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  override toEntityList(dtos: PromptConfigDTO[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }
}