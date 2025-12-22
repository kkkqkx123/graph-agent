import { ID } from '../../common/value-objects/id';
import { SessionActivity } from '../entities/session-activity';

/**
 * SessionActivity仓储接口
 */
export interface SessionActivityRepository {
  /**
   * 根据ID查找会话活动
   * @param id 会话活动ID
   * @returns 会话活动或null
   */
  findById(id: ID): Promise<SessionActivity | null>;

  /**
   * 根据会话定义ID查找会话活动
   * @param sessionDefinitionId 会话定义ID
   * @returns 会话活动或null
   */
  findBySessionDefinitionId(sessionDefinitionId: ID): Promise<SessionActivity | null>;

  /**
   * 保存会话活动
   * @param sessionActivity 会话活动
   */
  save(sessionActivity: SessionActivity): Promise<void>;

  /**
   * 删除会话活动
   * @param id 会话活动ID
   */
  delete(id: ID): Promise<void>;

  /**
   * 检查会话活动是否存在
   * @param id 会话活动ID
   * @returns 是否存在
   */
  exists(id: ID): Promise<boolean>;
}