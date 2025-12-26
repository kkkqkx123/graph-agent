import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * 查询构建器辅助类
 */
export class QueryBuilderHelper<TModel extends ObjectLiteral> {
  constructor(
    private qb: SelectQueryBuilder<TModel>,
    private alias: string
  ) { }

  /**
   * JSON 字段包含查询
   */
  whereJsonContains(field: string, value: any): this {
    this.qb.andWhere(`${this.alias}.${field}::jsonb @> :value`, { value: JSON.stringify(value) });
    return this;
  }

  /**
   * JSON 字段查询
   */
  whereJsonbField(field: string, operator: string, value: any): this {
    this.qb.andWhere(`${this.alias}.${field}::jsonb ${operator} :value`, { value });
    return this;
  }

  /**
   * 时间范围查询
   */
  whereTimeRange(field: string, startTime: Date, endTime: Date): this {
    this.qb.andWhere(`${this.alias}.${field} BETWEEN :startTime AND :endTime`, { startTime, endTime });
    return this;
  }

  /**
   * 字段过滤条件
   */
  applyFieldFilter(
    field: string,
    value: any,
    operator: '=' | 'IN' | 'LIKE' | '>' | '<' | '>=' | '<=' = '='
  ): this {
    const paramName = `${field}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    switch (operator) {
      case 'IN':
        this.qb.andWhere(`${this.alias}.${field} IN (:...${paramName})`, { [paramName]: value });
        break;
      case 'LIKE':
        this.qb.andWhere(`${this.alias}.${field} LIKE :${paramName}`, { [paramName]: value });
        break;
      default:
        this.qb.andWhere(`${this.alias}.${field} ${operator} :${paramName}`, { [paramName]: value });
    }
    return this;
  }

  /**
   * 时间范围过滤条件
   */
  applyTimeRangeFilter(field: string, startTime?: Date, endTime?: Date): this {
    if (startTime) {
      this.qb.andWhere(`${this.alias}.${field} >= :startTime`, { startTime });
    }
    if (endTime) {
      this.qb.andWhere(`${this.alias}.${field} <= :endTime`, { endTime });
    }
    return this;
  }

  /**
   * 状态过滤条件
   */
  applyStatusFilter(field: string, statuses: string[]): this {
    if (statuses.length > 0) {
      this.qb.andWhere(`${this.alias}.${field} IN (:...statuses)`, { statuses });
    }
    return this;
  }

  /**
   * 获取原始查询构建器
   */
  getQueryBuilder(): SelectQueryBuilder<TModel> {
    return this.qb;
  }
}