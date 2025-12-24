import { ID } from '../../common/value-objects/id';
import { ThreadExecution } from '../value-objects/thread-execution';

/**
 * ThreadExecution仓储接口
 */
export interface ThreadExecutionRepository {
  /**
   * 根据ID查找线程执行
   * @param id 线程执行ID
   * @returns 线程执行或null
   */
  findById(id: ID): Promise<ThreadExecution | null>;

  /**
   * 根据线程定义ID查找线程执行
   * @param threadDefinitionId 线程定义ID
   * @returns 线程执行或null
   */
  findByThreadDefinitionId(threadDefinitionId: ID): Promise<ThreadExecution | null>;

  /**
   * 根据状态查找线程执行列表
   * @param status 线程状态
   * @returns 线程执行列表
   */
  findByStatus(status: string): Promise<ThreadExecution[]>;

  /**
   * 查找活跃的线程执行列表
   * @returns 活跃的线程执行列表
   */
  findActive(): Promise<ThreadExecution[]>;

  /**
   * 保存线程执行
   * @param threadExecution 线程执行
   */
  save(threadExecution: ThreadExecution): Promise<void>;

  /**
   * 删除线程执行
   * @param id 线程执行ID
   */
  delete(id: ID): Promise<void>;

  /**
   * 检查线程执行是否存在
   * @param id 线程执行ID
   * @returns 是否存在
   */
  exists(id: ID): Promise<boolean>;
}