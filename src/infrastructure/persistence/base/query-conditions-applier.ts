import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { IQueryOptions } from '../../../domain/common/repositories/repository';

/**
 * 查询配置接口
 * 定义查询构建器的配置选项
 */
export interface QueryConfig<TModel extends ObjectLiteral> {
  /**
   * 查询别名
   */
  alias: string;
  
  /**
   * 是否启用软删除过滤
   */
  enableSoftDelete: boolean;
  
  /**
   * 默认排序字段
   */
  defaultSortField: string;
  
  /**
   * 默认排序方向
   */
  defaultSortOrder: 'asc' | 'desc';
}

/**
 * 默认查询配置
 */
export const DefaultQueryConfig: QueryConfig<any> = {
  alias: 'entity',
  enableSoftDelete: true,
  defaultSortField: 'createdAt',
  defaultSortOrder: 'desc'
};

/**
 * 查询条件应用器
 * 负责应用查询条件和配置到查询构建器
 */
export class QueryConditionsApplier<TModel extends ObjectLiteral> {
  constructor(private config: QueryConfig<TModel>) { }

  /**
   * 应用基础查询条件
   */
  applyBasicConditions(qb: SelectQueryBuilder<TModel>, options: IQueryOptions): void {
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          qb.andWhere(`${this.config.alias}.${key} = :${key}`, { [key]: value });
        }
      });
    }

    if (options.sortBy) {
      const order = options.sortOrder === 'desc' ? 'DESC' : 'ASC';
      qb.orderBy(`${this.config.alias}.${options.sortBy}`, order);
    } else {
      qb.orderBy(`${this.config.alias}.${this.config.defaultSortField}`, this.config.defaultSortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    if (options.offset) {
      qb.skip(options.offset);
    }

    if (options.limit) {
      qb.take(options.limit);
    }
  }

  /**
   * 构建查询选项
   */
  buildFindOptions(options: IQueryOptions): any {
    const findOptions: any = {};

    if (options.filters) {
      findOptions.where = options.filters;
    }

    if (options.sortBy) {
      findOptions.order = {
        [options.sortBy]: options.sortOrder === 'desc' ? 'DESC' : 'ASC'
      };
    } else {
      findOptions.order = { createdAt: 'DESC' };
    }

    if (options.offset) {
      findOptions.skip = options.offset;
    }

    if (options.limit) {
      findOptions.take = options.limit;
    }

    return findOptions;
  }

  /**
   * 构建ID查询条件
   */
  buildIdWhere(id: any): Record<string, unknown> {
    if (id && typeof id === 'object' && 'value' in id) {
      return { id: id.value };
    }
    return { id };
  }

  /**
   * 提取ID值的辅助方法
   */
  extractIdValue(id: any): any {
    if (id && typeof id === 'object' && 'value' in id) {
      return id.value;
    }
    return id;
  }

  /**
   * 应用关联查询
   */
  applyJoins(
    qb: SelectQueryBuilder<TModel>,
    joins?: Array<{
      alias: string;
      property: string;
      condition?: string;
      type?: 'left' | 'inner';
    }>
  ): void {
    if (joins) {
      joins.forEach(join => {
        const joinMethod = join.type === 'left' ? 'leftJoin' : 'innerJoin';
        qb[joinMethod](`${this.config.alias}.${join.property}`, join.alias);
        if (join.condition) {
          qb.andWhere(join.condition);
        }
      });
    }
  }

  /**
   * 应用自定义查询条件
   */
  applyCustomConditions(
    qb: SelectQueryBuilder<TModel>,
    customConditions?: (qb: SelectQueryBuilder<TModel>) => void
  ): void {
    if (customConditions) {
      customConditions(qb);
    }
  }
  /**
   * 应用字段过滤条件到查询构建器
   */
  applyFieldFilter(
    qb: SelectQueryBuilder<TModel>,
    field: string,
    value: any,
    operator: '=' | 'IN' | 'LIKE' | '>' | '<' | '>=' | '<=' = '='
  ): void {
    const paramName = `${field}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    switch (operator) {
      case 'IN':
        qb.andWhere(`${this.config.alias}.${field} IN (:...${paramName})`, { [paramName]: value });
        break;
      case 'LIKE':
        qb.andWhere(`${this.config.alias}.${field} LIKE :${paramName}`, { [paramName]: value });
        break;
      default:
        qb.andWhere(`${this.config.alias}.${field} ${operator} :${paramName}`, { [paramName]: value });
    }
  }

  /**
   * 应用时间范围过滤条件到查询构建器
   */
  applyTimeRangeFilter(
    qb: SelectQueryBuilder<TModel>,
    field: string,
    startTime?: Date,
    endTime?: Date
  ): void {
    if (startTime) {
      qb.andWhere(`${this.config.alias}.${field} >= :startTime`, { startTime });
    }
    if (endTime) {
      qb.andWhere(`${this.config.alias}.${field} <= :endTime`, { endTime });
    }
  }

  /**
   * 应用状态过滤条件到查询构建器
   */
  applyStatusFilter(
    qb: SelectQueryBuilder<TModel>,
    field: string,
    statuses: string[]
  ): void {
    if (statuses.length > 0) {
      qb.andWhere(`${this.config.alias}.${field} IN (:...statuses)`, { statuses });
    }
  }
}