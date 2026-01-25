import { State } from '../entities/state';
import { ID } from '../../common/value-objects/id';
import { StateEntityType } from '../value-objects/state-entity-type';

/**
 * 状态仓库接口
 *
 * 定义状态持久化的基本操作
 * 实现由基础设施层提供
 */
export interface IStateRepository {
  /**
   * 保存状态
   * @param state 状态实体
   * @returns Promise<void>
   */
  save(state: State): Promise<void>;

  /**
   * 根据ID查找状态
   * @param id 状态ID
   * @returns 状态实体或null
   */
  findById(id: ID): Promise<State | null>;

  /**
   * 根据实体ID查找状态
   * @param entityId 实体ID
   * @returns 状态实体或null
   */
  findByEntityId(entityId: ID): Promise<State | null>;

  /**
   * 根据实体类型查找所有状态
   * @param entityType 实体类型
   * @returns 状态实体数组
   */
  findByEntityType(entityType: StateEntityType): Promise<State[]>;

  /**
   * 删除状态
   * @param id 状态ID
   * @returns Promise<void>
   */
  deleteById(id: ID): Promise<void>;

  /**
   * 检查状态是否存在
   * @param id 状态ID
   * @returns 是否存在
   */
  exists(id: ID): Promise<boolean>;
}
