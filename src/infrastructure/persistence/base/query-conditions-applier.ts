import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { IQueryOptions } from '../../../domain/common/repositories/repository';

/**
 * 查询条件应用器
 */
export class QueryConditionsApplier<TModel extends ObjectLiteral> {
  constructor(private alias: string) { }

  /**
   * 应用基础查询条件
   */
  applyBasicConditions(qb: SelectQueryBuilder<TModel>, options: IQueryOptions): void {
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          qb.andWhere(`${this.alias}.${key} = :${key}`, { [key]: value });
        }
      });
    }

    if (options.sortBy) {
      const order = options.sortOrder === 'desc' ? 'DESC' : 'ASC';
      qb.orderBy(`${this.alias}.${options.sortBy}`, order);
    } else {
      qb.orderBy(`${this.alias}.createdAt`, 'DESC');
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
        qb[joinMethod](`${this.alias}.${join.property}`, join.alias);
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
}