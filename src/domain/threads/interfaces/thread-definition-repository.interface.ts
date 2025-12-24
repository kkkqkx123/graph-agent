import { ID } from '../../common/value-objects/id';
import { ThreadDefinition } from '../value-objects/thread-definition';

/**
 * ThreadDefinition仓储接口
 */
export interface ThreadDefinitionRepository {
  /**
   * 根据ID查找线程定义
   * @param id 线程定义ID
   * @returns 线程定义或null
   */
  findById(id: ID): Promise<ThreadDefinition | null>;

  /**
   * 根据会话ID查找线程定义列表
   * @param sessionId 会话ID
   * @returns 线程定义列表
   */
  findBySessionId(sessionId: ID): Promise<ThreadDefinition[]>;

  /**
   * 根据工作流ID查找线程定义列表
   * @param workflowId 工作流ID
   * @returns 线程定义列表
   */
  findByWorkflowId(workflowId: ID): Promise<ThreadDefinition[]>;

  /**
   * 保存线程定义
   * @param threadDefinition 线程定义
   */
  save(threadDefinition: ThreadDefinition): Promise<void>;

  /**
   * 删除线程定义
   * @param id 线程定义ID
   */
  delete(id: ID): Promise<void>;

  /**
   * 检查线程定义是否存在
   * @param id 线程定义ID
   * @returns 是否存在
   */
  exists(id: ID): Promise<boolean>;
}