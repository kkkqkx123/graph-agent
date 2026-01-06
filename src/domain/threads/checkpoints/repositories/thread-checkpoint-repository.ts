import { Repository } from '../../../common/repositories/repository';
import { ID } from '../../../common/value-objects/id';
import { ThreadCheckpoint } from '../entities/thread-checkpoint';
import { CheckpointStatus } from '../value-objects/checkpoint-status';
import { CheckpointType } from '../../../checkpoint/value-objects/checkpoint-type';

/**
 * Thread检查点仓储接口
 *
 * 定义Thread检查点的数据访问契约
 * 只包含基本的CRUD操作和必要的查询方法
 */
export interface IThreadCheckpointRepository extends Repository<ThreadCheckpoint> {
  /**
   * 根据线程ID查找检查点
   * @param threadId 线程ID
   * @returns 检查点列表
   */
  findByThreadId(threadId: ID): Promise<ThreadCheckpoint[]>;

  /**
   * 根据状态查找检查点
   * @param status 检查点状态
   * @returns 检查点列表
   */
  findByStatus(status: CheckpointStatus): Promise<ThreadCheckpoint[]>;

  /**
   * 根据类型查找检查点
   * @param type 检查点类型
   * @returns 检查点列表
   */
  findByType(type: CheckpointType): Promise<ThreadCheckpoint[]>;

  /**
   * 获取线程的检查点历史
   * @param threadId 线程ID
   * @param limit 数量限制
   * @param offset 偏移量
   * @returns 检查点历史列表
   */
  getThreadHistory(threadId: ID, limit?: number, offset?: number): Promise<ThreadCheckpoint[]>;

  /**
   * 获取最新的检查点
   * @param threadId 线程ID
   * @returns 最新检查点，如果没有则返回null
   */
  getLatest(threadId: ID): Promise<ThreadCheckpoint | null>;

  /**
   * 批量删除检查点
   * @param checkpointIds 检查点ID列表
   * @returns 删除的检查点数量
   */
  batchDelete(checkpointIds: ID[]): Promise<number>;
}
