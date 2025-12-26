import { QueryBuilderOptions } from './query-options-builder';
import { SoftDeleteConfig } from './soft-delete-manager';
import { ObjectLiteral } from 'typeorm';

/**
 * 仓储配置接口
 */
export interface RepositoryConfig<TModel extends ObjectLiteral> {
  /**
   * 查询构建器选项
   */
  queryBuilderOptions: QueryBuilderOptions<TModel>;
  
  /**
   * 软删除配置
   */
  softDeleteConfig: SoftDeleteConfig;
  
  /**
   * 是否启用查询模板
   */
  enableQueryTemplates?: boolean;
  
  /**
   * 默认分页大小
   */
  defaultPageSize?: number;
  
  /**
   * 是否启用缓存
   */
  enableCaching?: boolean;
  
  /**
   * 缓存过期时间（毫秒）
   */
  cacheExpiration?: number;
}

/**
 * 默认仓储配置
 */
export class DefaultRepositoryConfig<TModel extends ObjectLiteral> implements RepositoryConfig<TModel> {
  queryBuilderOptions: QueryBuilderOptions<TModel> = {
    alias: 'entity',
    enableSoftDelete: true,
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc'
  };

  softDeleteConfig: SoftDeleteConfig = {
    enabled: true,
    fieldName: 'isDeleted',
    deletedAtField: 'deletedAt',
    stateField: 'state',
    deletedValue: 'archived',
    activeValue: 'active'
  };

  enableQueryTemplates = true;
  defaultPageSize = 10;
  enableCaching = false;
  cacheExpiration = 300000; // 5分钟

  constructor(config?: Partial<RepositoryConfig<TModel>>) {
    if (config) {
      Object.assign(this, config);
    }
  }

  /**
   * 配置软删除行为
   */
  configureSoftDelete(config: Partial<SoftDeleteConfig>): this {
    this.softDeleteConfig = { ...this.softDeleteConfig, ...config };
    return this;
  }

  /**
   * 配置查询构建器选项
   */
  configureQueryBuilder(options: Partial<QueryBuilderOptions<TModel>>): this {
    this.queryBuilderOptions = { ...this.queryBuilderOptions, ...options };
    return this;
  }

  /**
   * 设置默认分页大小
   */
  setDefaultPageSize(size: number): this {
    this.defaultPageSize = size;
    return this;
  }

  /**
   * 启用缓存
   */
  enableCache(expiration?: number): this {
    this.enableCaching = true;
    if (expiration) {
      this.cacheExpiration = expiration;
    }
    return this;
  }

  /**
   * 禁用缓存
   */
  disableCache(): this {
    this.enableCaching = false;
    return this;
  }
}