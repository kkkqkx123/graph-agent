import { IQueryOptions } from '../../../domain/common/repositories/repository';
import { QueryOptions } from './base-repository';
import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * 查询条件类型定义
 */
export type QueryCondition<TModel extends ObjectLiteral> = (qb: SelectQueryBuilder<TModel>) => void;

/**
 * 查询构建器选项
 */
export interface QueryBuilderOptions<TModel extends ObjectLiteral> {
  /**
   * 查询别名
   */
  alias?: string;
  
  /**
   * 是否启用软删除过滤
   */
  enableSoftDelete?: boolean;
  
  /**
   * 默认排序字段
   */
  defaultSortField?: string;
  
  /**
   * 默认排序方向
   */
  defaultSortOrder?: 'asc' | 'desc';
}

/**
 * 查询选项构建器
 *
 * 提供流畅API构建查询选项，支持链式调用和类型安全的查询条件构建
 */
export class QueryOptionsBuilder<TModel extends ObjectLiteral> {
  private options: QueryOptions<TModel> = {};
  private conditions: QueryCondition<TModel>[] = [];
  private builderOptions: QueryBuilderOptions<TModel>;

  constructor(builderOptions: QueryBuilderOptions<TModel> = {}) {
    this.builderOptions = {
      alias: builderOptions.alias || 'entity',
      enableSoftDelete: builderOptions.enableSoftDelete ?? true,
      defaultSortField: builderOptions.defaultSortField || 'createdAt',
      defaultSortOrder: builderOptions.defaultSortOrder || 'desc',
    };
  }

  /**
   * 设置分页偏移量
   */
  offset(offset: number): this {
    this.options.offset = offset;
    return this;
  }

  /**
   * 设置分页大小
   */
  limit(limit: number): this {
    this.options.limit = limit;
    return this;
  }

  /**
   * 设置排序字段
   */
  sortBy(field: string): this {
    this.options.sortBy = field;
    return this;
  }

  /**
   * 设置排序方向
   */
  sortOrder(order: 'asc' | 'desc'): this {
    this.options.sortOrder = order;
    return this;
  }

  /**
   * 添加简单过滤条件
   */
  filter<K extends keyof TModel>(field: K, value: TModel[K]): this {
    if (!this.options.filters) {
      this.options.filters = {};
    }
    this.options.filters[field as string] = value;
    return this;
  }

  /**
   * 添加多个过滤条件
   */
  filters(filters: Partial<TModel>): this {
    if (!this.options.filters) {
      this.options.filters = {};
    }
    Object.assign(this.options.filters, filters);
    return this;
  }

  /**
   * 添加自定义查询条件
   */
  where(condition: QueryCondition<TModel>): this {
    this.conditions.push(condition);
    return this;
  }

  /**
   * 相等条件
   */
  equals<K extends keyof TModel>(field: K, value: TModel[K]): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} = :${String(field)}`, { [field]: value });
    });
  }

  /**
   * 不相等条件
   */
  notEquals<K extends keyof TModel>(field: K, value: TModel[K]): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} != :${String(field)}`, { [field]: value });
    });
  }

  /**
   * IN条件
   */
  in<K extends keyof TModel>(field: K, values: TModel[K][]): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} IN (:...${String(field)})`, { [field]: values });
    });
  }

  /**
   * NOT IN条件
   */
  notIn<K extends keyof TModel>(field: K, values: TModel[K][]): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} NOT IN (:...${String(field)})`, { [field]: values });
    });
  }

  /**
   * LIKE条件
   */
  like<K extends keyof TModel>(field: K, pattern: string): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} LIKE :${String(field)}`, { [field]: pattern });
    });
  }

  /**
   * ILIKE条件（不区分大小写）
   */
  ilike<K extends keyof TModel>(field: K, pattern: string): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} ILIKE :${String(field)}`, { [field]: pattern });
    });
  }

  /**
   * 大于条件
   */
  greaterThan<K extends keyof TModel>(field: K, value: TModel[K]): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} > :${String(field)}`, { [field]: value });
    });
  }

  /**
   * 大于等于条件
   */
  greaterThanOrEqual<K extends keyof TModel>(field: K, value: TModel[K]): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} >= :${String(field)}`, { [field]: value });
    });
  }

  /**
   * 小于条件
   */
  lessThan<K extends keyof TModel>(field: K, value: TModel[K]): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} < :${String(field)}`, { [field]: value });
    });
  }

  /**
   * 小于等于条件
   */
  lessThanOrEqual<K extends keyof TModel>(field: K, value: TModel[K]): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} <= :${String(field)}`, { [field]: value });
    });
  }

  /**
   * 时间范围条件
   */
  between<K extends keyof TModel>(field: K, start: TModel[K], end: TModel[K]): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)} BETWEEN :start AND :end`, { start, end });
    });
  }

  /**
   * JSON字段包含条件
   */
  jsonContains<K extends keyof TModel>(field: K, value: any): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)}::jsonb @> :value`, { value: JSON.stringify(value) });
    });
  }

  /**
   * JSON字段路径查询
   */
  jsonPath<K extends keyof TModel>(field: K, path: string, value: any): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.${String(field)}->>:path = :value`, { path, value });
    });
  }

  /**
   * 关联查询
   */
  join(property: string, alias: string, condition?: string, type: 'left' | 'inner' = 'left'): this {
    if (!this.options.joins) {
      this.options.joins = [];
    }
    this.options.joins.push({ alias, property, condition, type });
    return this;
  }

  /**
   * 排除软删除的记录
   */
  excludeSoftDeleted(): this {
    if (this.builderOptions.enableSoftDelete) {
      return this.where(qb => {
        qb.andWhere(`${this.builderOptions.alias}.isDeleted = false`);
      });
    }
    return this;
  }

  /**
   * 包含软删除的记录
   */
  includeSoftDeleted(): this {
    this.builderOptions.enableSoftDelete = false;
    return this;
  }

  /**
   * 只查询软删除的记录
   */
  onlySoftDeleted(): this {
    return this.where(qb => {
      qb.andWhere(`${this.builderOptions.alias}.isDeleted = true`);
    });
  }

  /**
   * 构建最终的查询选项
   */
  build(): QueryOptions<TModel> {
    const finalOptions: QueryOptions<TModel> = {
      ...this.options,
      customConditions: (qb: any) => {
        // 应用所有自定义条件
        this.conditions.forEach(condition => condition(qb));
      }
    };

    // 设置默认排序
    if (!finalOptions.sortBy && this.builderOptions.defaultSortField) {
      finalOptions.sortBy = this.builderOptions.defaultSortField;
      finalOptions.sortOrder = this.builderOptions.defaultSortOrder;
    }

    return finalOptions;
  }

  /**
   * 创建新的构建器实例
   */
  static create<T extends ObjectLiteral>(options?: QueryBuilderOptions<T>): QueryOptionsBuilder<T> {
    return new QueryOptionsBuilder<T>(options);
  }

  /**
   * 从现有选项创建构建器
   */
  static fromOptions<T extends ObjectLiteral>(
    options: IQueryOptions,
    builderOptions?: QueryBuilderOptions<T>
  ): QueryOptionsBuilder<T> {
    const builder = new QueryOptionsBuilder<T>(builderOptions);
    
    if (options.offset !== undefined) builder.offset(options.offset);
    if (options.limit !== undefined) builder.limit(options.limit);
    if (options.sortBy) builder.sortBy(options.sortBy);
    if (options.sortOrder) builder.sortOrder(options.sortOrder);
    if (options.filters) builder.filters(options.filters as Partial<T>);
    
    return builder;
  }
}

/**
 * 查询模板工厂
 */
export class QueryTemplateFactory {
  /**
   * 创建时间范围查询模板
   */
  static createTimeRangeQuery<T extends ObjectLiteral>(
    field: keyof T,
    startTime: Date,
    endTime: Date,
    options?: QueryBuilderOptions<T>
  ): QueryOptionsBuilder<T> {
    return QueryOptionsBuilder.create<T>(options)
      .between(field, startTime as any, endTime as any)
      .sortBy(String(field))
      .sortOrder('asc');
  }

  /**
   * 创建状态查询模板
   */
  static createStatusQuery<T extends ObjectLiteral>(
    field: keyof T,
    status: string,
    options?: QueryBuilderOptions<T>
  ): QueryOptionsBuilder<T> {
    return QueryOptionsBuilder.create<T>(options)
      .equals(field, status as any)
      .sortBy('createdAt')
      .sortOrder('desc');
  }

  /**
   * 创建搜索查询模板
   */
  static createSearchQuery<T extends ObjectLiteral>(
    field: keyof T,
    keyword: string,
    options?: QueryBuilderOptions<T>
  ): QueryOptionsBuilder<T> {
    return QueryOptionsBuilder.create<T>(options)
      .ilike(field, `%${keyword}%`)
      .sortBy('createdAt')
      .sortOrder('desc');
  }

  /**
   * 创建分页查询模板
   */
  static createPaginationQuery<T extends ObjectLiteral>(
    page: number,
    pageSize: number,
    options?: QueryBuilderOptions<T>
  ): QueryOptionsBuilder<T> {
    return QueryOptionsBuilder.create<T>(options)
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .sortBy('createdAt')
      .sortOrder('desc');
  }

  /**
   * 创建活跃记录查询模板
   */
  static createActiveRecordsQuery<T extends ObjectLiteral>(
    statusField: keyof T,
    activeStatuses: string[],
    options?: QueryBuilderOptions<T>
  ): QueryOptionsBuilder<T> {
    return QueryOptionsBuilder.create<T>(options)
      .in(statusField, activeStatuses as any)
      .excludeSoftDeleted()
      .sortBy('priority')
      .sortOrder('desc');
  }
}