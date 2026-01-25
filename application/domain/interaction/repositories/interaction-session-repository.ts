import { InteractionSession } from '../entities/interaction-session';
import { ID } from '../../common/value-objects/id';

/**
 * 交互会话仓储接口
 */
export interface IInteractionSessionRepository {
  /**
   * 保存交互会话
   */
  save(session: InteractionSession): Promise<void>;

  /**
   * 根据ID查找交互会话
   */
  findById(id: ID): Promise<InteractionSession | null>;

  /**
   * 根据线程ID查找交互会话
   */
  findByThreadId(threadId: string): Promise<InteractionSession[]>;

  /**
   * 根据工作流ID查找交互会话
   */
  findByWorkflowId(workflowId: string): Promise<InteractionSession[]>;

  /**
   * 根据节点ID查找交互会话
   */
  findByNodeId(nodeId: string): Promise<InteractionSession[]>;

  /**
   * 删除交互会话
   */
  delete(id: ID): Promise<void>;

  /**
   * 检查交互会话是否存在
   */
  exists(id: ID): Promise<boolean>;
}