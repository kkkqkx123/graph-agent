import { QueryOptionsBuilder, QueryBuilderOptions } from './query-options-builder';
import { ObjectLiteral } from 'typeorm';

/**
 * 查询模板定义
 */
export interface QueryTemplate<TModel extends ObjectLiteral> {
  /**
   * 模板名称
   */
  name: string;
  
  /**
   * 模板描述
   */
  description: string;
  
  /**
   * 模板构建函数
   */
  build: (params: any, builderOptions?: QueryBuilderOptions<TModel>) => QueryOptionsBuilder<TModel>;
  
  /**
   * 参数验证函数
   */
  validate?: (params: any) => boolean;
  
  /**
   * 模板缓存键生成函数
   */
  cacheKey?: (params: any) => string;
}

/**
 * 模板组合配置
 */
export interface TemplateComposition<TModel extends ObjectLiteral> {
  /**
   * 组合名称
   */
  name: string;
  
  /**
   * 包含的模板列表
   */
  templates: Array<{
    template: QueryTemplate<TModel>;
    params: any;
    priority?: number;
  }>;
  
  /**
   * 组合策略
   */
  strategy?: 'merge' | 'chain' | 'custom';
  
  /**
   * 自定义组合函数
   */
  compose?: (builders: QueryOptionsBuilder<TModel>[]) => QueryOptionsBuilder<TModel>;
}

/**
 * 查询模板管理器
 *
 * 提供预定义查询模板、模板组合和缓存机制
 */
export class QueryTemplateManager<TModel extends ObjectLiteral> {
  private templates: Map<string, QueryTemplate<TModel>> = new Map();
  private compositions: Map<string, TemplateComposition<TModel>> = new Map();
  private cache: Map<string, QueryOptionsBuilder<TModel>> = new Map();
  
  /**
   * 注册查询模板
   */
  registerTemplate(template: QueryTemplate<TModel>): this {
    this.templates.set(template.name, template);
    return this;
  }
  
  /**
   * 注册模板组合
   */
  registerComposition(composition: TemplateComposition<TModel>): this {
    this.compositions.set(composition.name, composition);
    return this;
  }
  
  /**
   * 获取模板
   */
  getTemplate(name: string): QueryTemplate<TModel> | undefined {
    return this.templates.get(name);
  }
  
  /**
   * 获取模板组合
   */
  getComposition(name: string): TemplateComposition<TModel> | undefined {
    return this.compositions.get(name);
  }
  
  /**
   * 使用模板构建查询
   */
  buildWithTemplate(
    templateName: string, 
    params: any, 
    builderOptions?: QueryBuilderOptions<TModel>
  ): QueryOptionsBuilder<TModel> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`查询模板 '${templateName}' 不存在`);
    }
    
    // 参数验证
    if (template.validate && !template.validate(params)) {
      throw new Error(`查询模板 '${templateName}' 参数验证失败`);
    }
    
    // 缓存检查
    const cacheKey = template.cacheKey ? template.cacheKey(params) : null;
    if (cacheKey && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // 构建查询
    const builder = template.build(params, builderOptions);
    
    // 缓存结果
    if (cacheKey) {
      this.cache.set(cacheKey, builder);
    }
    
    return builder;
  }
  
  /**
   * 使用模板组合构建查询
   */
  buildWithComposition(
    compositionName: string, 
    builderOptions?: QueryBuilderOptions<TModel>
  ): QueryOptionsBuilder<TModel> {
    const composition = this.compositions.get(compositionName);
    if (!composition) {
      throw new Error(`模板组合 '${compositionName}' 不存在`);
    }
    
    const builders: QueryOptionsBuilder<TModel>[] = [];
    
    // 按优先级排序
    const sortedTemplates = [...composition.templates].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // 构建所有模板
    for (const { template, params } of sortedTemplates) {
      const builder = this.buildWithTemplate(template.name, params, builderOptions);
      builders.push(builder);
    }
    
    // 应用组合策略
    switch (composition.strategy) {
      case 'merge':
        return this.mergeBuilders(builders, builderOptions);
      case 'chain':
        return this.chainBuilders(builders, builderOptions);
      case 'custom':
        if (composition.compose) {
          return composition.compose(builders);
        }
        throw new Error(`自定义组合策略需要提供 compose 函数`);
      default:
        return this.mergeBuilders(builders, builderOptions);
    }
  }
  
  /**
   * 合并多个构建器
   */
  private mergeBuilders(
    builders: QueryOptionsBuilder<TModel>[],
    builderOptions?: QueryBuilderOptions<TModel>
  ): QueryOptionsBuilder<TModel> {
    const mergedBuilder = QueryOptionsBuilder.create<TModel>(builderOptions);
    
    // 这里需要实现合并逻辑
    // 由于QueryOptionsBuilder的内部状态，需要更复杂的合并策略
    // 暂时返回第一个构建器
    return builders[0] || mergedBuilder;
  }
  
  /**
   * 链式组合多个构建器
   */
  private chainBuilders(
    builders: QueryOptionsBuilder<TModel>[],
    builderOptions?: QueryBuilderOptions<TModel>
  ): QueryOptionsBuilder<TModel> {
    const chainedBuilder = QueryOptionsBuilder.create<TModel>(builderOptions);
    
    // 这里需要实现链式组合逻辑
    // 暂时返回第一个构建器
    return builders[0] || chainedBuilder;
  }
  
  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // 需要实现命中率统计
    };
  }
}

/**
 * 预定义通用查询模板
 */
export class CommonQueryTemplates {
  /**
   * 创建时间范围查询模板
   */
  static createTimeRangeTemplate<T extends ObjectLiteral>(): QueryTemplate<T> {
    return {
      name: 'timeRange',
      description: '时间范围查询模板',
      validate: (params: any) => {
        return params.field && params.startTime && params.endTime;
      },
      cacheKey: (params: any) => `timeRange_${params.field}_${params.startTime}_${params.endTime}`,
      build: (params: any, builderOptions?: QueryBuilderOptions<T>) => {
        return QueryOptionsBuilder.create<T>(builderOptions)
          .between(params.field, params.startTime, params.endTime)
          .sortBy(String(params.field))
          .sortOrder('asc');
      }
    };
  }
  
  /**
   * 创建状态查询模板
   */
  static createStatusTemplate<T extends ObjectLiteral>(): QueryTemplate<T> {
    return {
      name: 'status',
      description: '状态查询模板',
      validate: (params: any) => {
        return params.field && params.status !== undefined;
      },
      cacheKey: (params: any) => `status_${params.field}_${params.status}`,
      build: (params: any, builderOptions?: QueryBuilderOptions<T>) => {
        return QueryOptionsBuilder.create<T>(builderOptions)
          .equals(params.field, params.status)
          .sortBy('createdAt')
          .sortOrder('desc');
      }
    };
  }
  
  /**
   * 创建搜索查询模板
   */
  static createSearchTemplate<T extends ObjectLiteral>(): QueryTemplate<T> {
    return {
      name: 'search',
      description: '搜索查询模板',
      validate: (params: any) => {
        return params.field && params.keyword;
      },
      cacheKey: (params: any) => `search_${params.field}_${params.keyword}`,
      build: (params: any, builderOptions?: QueryBuilderOptions<T>) => {
        return QueryOptionsBuilder.create<T>(builderOptions)
          .ilike(params.field, `%${params.keyword}%`)
          .sortBy('createdAt')
          .sortOrder('desc');
      }
    };
  }
  
  /**
   * 创建分页查询模板
   */
  static createPaginationTemplate<T extends ObjectLiteral>(): QueryTemplate<T> {
    return {
      name: 'pagination',
      description: '分页查询模板',
      validate: (params: any) => {
        return params.page && params.pageSize;
      },
      cacheKey: (params: any) => `pagination_${params.page}_${params.pageSize}`,
      build: (params: any, builderOptions?: QueryBuilderOptions<T>) => {
        return QueryOptionsBuilder.create<T>(builderOptions)
          .offset((params.page - 1) * params.pageSize)
          .limit(params.pageSize)
          .sortBy('createdAt')
          .sortOrder('desc');
      }
    };
  }
  
  /**
   * 创建活跃记录查询模板
   */
  static createActiveRecordsTemplate<T extends ObjectLiteral>(): QueryTemplate<T> {
    return {
      name: 'activeRecords',
      description: '活跃记录查询模板',
      validate: (params: any) => {
        return params.statusField && Array.isArray(params.activeStatuses);
      },
      cacheKey: (params: any) => `activeRecords_${params.statusField}_${params.activeStatuses.join('_')}`,
      build: (params: any, builderOptions?: QueryBuilderOptions<T>) => {
        return QueryOptionsBuilder.create<T>(builderOptions)
          .in(params.statusField, params.activeStatuses)
          .excludeSoftDeleted()
          .sortBy('priority')
          .sortOrder('desc');
      }
    };
  }
  
  /**
   * 创建软删除查询模板
   */
  static createSoftDeleteTemplate<T extends ObjectLiteral>(): QueryTemplate<T> {
    return {
      name: 'softDelete',
      description: '软删除查询模板',
      validate: (params: any) => {
        return params.includeDeleted !== undefined;
      },
      cacheKey: (params: any) => `softDelete_${params.includeDeleted}`,
      build: (params: any, builderOptions?: QueryBuilderOptions<T>) => {
        const builder = QueryOptionsBuilder.create<T>(builderOptions);
        if (params.includeDeleted) {
          return builder.includeSoftDeleted();
        } else {
          return builder.excludeSoftDeleted();
        }
      }
    };
  }
}

/**
 * 查询模板注册器
 */
export class QueryTemplateRegistrar {
  /**
   * 注册所有通用模板
   */
  static registerCommonTemplates<T extends ObjectLiteral>(
    manager: QueryTemplateManager<T>
  ): QueryTemplateManager<T> {
    manager
      .registerTemplate(CommonQueryTemplates.createTimeRangeTemplate<T>())
      .registerTemplate(CommonQueryTemplates.createStatusTemplate<T>())
      .registerTemplate(CommonQueryTemplates.createSearchTemplate<T>())
      .registerTemplate(CommonQueryTemplates.createPaginationTemplate<T>())
      .registerTemplate(CommonQueryTemplates.createActiveRecordsTemplate<T>())
      .registerTemplate(CommonQueryTemplates.createSoftDeleteTemplate<T>());
    
    return manager;
  }
}