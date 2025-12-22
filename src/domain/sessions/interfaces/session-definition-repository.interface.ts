import { ID } from '../../common/value-objects/id';
import { SessionDefinition } from '../entities/session-definition';

/**
 * SessionDefinition仓储接口
 */
export interface SessionDefinitionRepository {
  /**
   * 根据ID查找会话定义
   * @param id 会话定义ID
   * @returns 会话定义或null
   */
  findById(id: ID): Promise<SessionDefinition | null>;

  /**
   * 根据用户ID查找会话定义列表
   * @param userId 用户ID
   * @returns 会话定义列表
   */
  findByUserId(userId: ID): Promise<SessionDefinition[]>;

  /**
   * 查找活跃的会话定义列表
   * @returns 活跃的会话定义列表
   */
  findActive(): Promise<SessionDefinition[]>;

  /**
   * 保存会话定义
   * @param sessionDefinition 会话定义
   */
  save(sessionDefinition: SessionDefinition): Promise<void>;

  /**
   * 删除会话定义
   * @param id 会话定义ID
   */
  delete(id: ID): Promise<void>;

  /**
   * 检查会话定义是否存在
   * @param id 会话定义ID
   * @returns 是否存在
   */
  exists(id: ID): Promise<boolean>;
}