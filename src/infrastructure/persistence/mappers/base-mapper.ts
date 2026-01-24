/**
 * 基础Mapper接口
 * 定义数据库模型与领域实体之间的转换契约
 */

/**
 * 基础Mapper接口
 * @template TDomain - 领域实体类型
 * @template TModel - 数据库模型类型
 */
export interface BaseMapper<TDomain, TModel> {
  /**
   * 将数据库模型转换为领域实体
   * @param model - 数据库模型
   * @returns 领域实体
   * @throws {Error} 转换失败时抛出
   */
  toDomain(model: TModel): TDomain;

  /**
   * 将领域实体转换为数据库模型
   * @param domain - 领域实体
   * @returns 数据库模型
   * @throws {Error} 转换失败时抛出
   */
  toModel(domain: TDomain): TModel;
}