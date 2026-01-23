/**
 * 基础Mapper接口
 * 定义数据库模型与领域实体之间的转换契约
 */

import { DomainMappingError } from '../errors/mapper-errors';

/**
 * Mapper结果类型
 */
export type MapperResult<T> = {
  success: true;
  value: T;
} | {
  success: false;
  error: DomainMappingError;
};

/**
 * 基础Mapper接口
 * @template TDomain - 领域实体类型
 * @template TModel - 数据库模型类型
 */
export interface BaseMapper<TDomain, TModel> {
  /**
   * 将数据库模型转换为领域实体
   * @param model - 数据库模型
   * @returns 转换结果
   */
  toDomain(model: TModel): MapperResult<TDomain>;

  /**
   * 将领域实体转换为数据库模型
   * @param domain - 领域实体
   * @returns 转换结果
   */
  toModel(domain: TDomain): MapperResult<TModel>;

  /**
   * 批量转换（优化版本）
   * @param models - 数据库模型数组
   * @returns 转换结果
   */
  toDomainBatch(models: TModel[]): MapperResult<TDomain[]>;
}

/**
 * 创建成功的Mapper结果
 */
export function ok<T>(value: T): MapperResult<T> {
  return { success: true, value };
}

/**
 * 创建失败的Mapper结果
 */
export function err<T>(error: DomainMappingError): MapperResult<T> {
  return { success: false, error };
}

/**
 * 组合多个Mapper结果
 * 如果所有结果都成功，返回所有值的数组
 * 如果有任何一个失败，返回第一个错误
 */
export function combine<T>(results: MapperResult<T>[]): MapperResult<T[]> {
  for (const result of results) {
    if (!result.success) {
      return result;
    }
  }
  return ok(results.map(r => (r as { success: true; value: T }).value));
}