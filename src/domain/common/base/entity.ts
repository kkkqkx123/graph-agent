import { ID } from '../value-objects/id';
import { Timestamp } from '../value-objects/timestamp';
import { Version } from '../value-objects/version';

/**
 * 实体基类
 *
 * 实体是DDD中的核心概念，表示具有唯一标识的对象。
 * 实体具有以下特征：
 * - 具有唯一标识符
 * - 可变性：状态可以改变
 * - 标识相等性：通过ID比较相等性
 */
export abstract class Entity {
  protected readonly _id: ID;
  protected _createdAt: Timestamp;
  protected _updatedAt: Timestamp;
  protected _version: Version;

  /**
   * 构造函数
   * @param id 实体ID
   * @param createdAt 创建时间
   * @param updatedAt 更新时间
   * @param version 版本
   */
  protected constructor(
    id: ID,
    createdAt: Timestamp,
    updatedAt: Timestamp,
    version: Version
  ) {
    this._id = id;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._version = version;
  }

  /**
   * 获取实体ID
   * @returns 实体ID
   */
  public get id(): ID {
    return this._id;
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public get createdAt(): Timestamp {
    return this._createdAt;
  }

  /**
   * 获取更新时间
   * @returns 更新时间
   */
  public get updatedAt(): Timestamp {
    return this._updatedAt;
  }

  /**
   * 获取版本
   * @returns 版本
   */
  public get version(): Version {
    return this._version;
  }

  /**
   * 更新实体
   * 更新时间戳和版本号
   */
  protected update(): void {
    this._updatedAt = Timestamp.now();
    this._version = this._version.nextPatch();
  }

  /**
   * 比较两个实体是否相等
   * @param entity 另一个实体
   * @returns 是否相等
   */
  public equals(entity?: Entity): boolean {
    if (entity === null || entity === undefined) {
      return false;
    }
    if (this === entity) {
      return true;
    }
    return this._id.equals(entity.id);
  }

  /**
   * 获取实体的哈希码
   * @returns 哈希码
   */
  public hashCode(): string {
    return this._id.toString();
  }

}