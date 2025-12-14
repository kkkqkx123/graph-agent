import { Repository } from '../../common/repositories/repository';
import { ID } from '../../common/value-objects/id';
import { Checkpoint } from '../entities/checkpoint';
import { CheckpointType } from '../value-objects/checkpoint-type';

/**
 * 检查点仓储接口
 * 
 * 定义检查点持久化和检索的契约
 */
export interface CheckpointRepository extends Repository<Checkpoint> {
  /**
   * 根据线程ID查找检查点
   * @param threadId 线程ID
   * @returns 检查点列表
   */
  findByThreadId(threadId: ID): Promise<Checkpoint[]>;

  /**
   * 根据线程ID和类型查找检查点
   * @param threadId 线程ID
   * @param type 检查点类型
   * @returns 检查点列表
   */
  findByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<Checkpoint[]>;

  /**
   * 根据线程ID查找最新检查点
   * @param threadId 线程ID
   * @returns 最新检查点或null
   */
  findLatestByThreadId(threadId: ID): Promise<Checkpoint | null>;

  /**
   * 根据线程ID和类型查找最新检查点
   * @param threadId 线程ID
   * @param type 检查点类型
   * @returns 最新检查点或null
   */
  findLatestByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<Checkpoint | null>;

  /**
   * 根据标签查找检查点
   * @param tag 标签
   * @returns 检查点列表
   */
  findByTag(tag: string): Promise<Checkpoint[]>;

  /**
   * 根据多个标签查找检查点
   * @param tags 标签列表
   * @returns 检查点列表
   */
  findByTags(tags: string[]): Promise<Checkpoint[]>;

  /**
   * 根据创建时间范围查找检查点
   * @param threadId 线程ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 检查点列表
   */
  findByTimeRange(
    threadId: ID,
    startTime: Date,
    endTime: Date
  ): Promise<Checkpoint[]>;

  /**
   * 统计线程的检查点数量
   * @param threadId 线程ID
   * @returns 检查点数量
   */
  countByThreadId(threadId: ID): Promise<number>;

  /**
   * 统计线程的检查点数量（按类型）
   * @param threadId 线程ID
   * @param type 检查点类型
   * @returns 检查点数量
   */
  countByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<number>;

  /**
   * 删除线程的所有检查点
   * @param threadId 线程ID
   * @returns 删除的检查点数量
   */
  deleteByThreadId(threadId: ID): Promise<number>;

  /**
   * 删除指定时间之前的检查点
   * @param threadId 线程ID
   * @param beforeTime 时间点
   * @returns 删除的检查点数量
   */
  deleteByThreadIdBeforeTime(threadId: ID, beforeTime: Date): Promise<number>;

  /**
   * 删除指定类型的检查点
   * @param threadId 线程ID
   * @param type 检查点类型
   * @returns 删除的检查点数量
   */
  deleteByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<number>;

  /**
   * 获取线程的检查点历史
   * @param threadId 线程ID
   * @param limit 数量限制
   * @param offset 偏移量
   * @returns 检查点列表
   */
  getCheckpointHistory(
    threadId: ID,
    limit?: number,
    offset?: number
  ): Promise<Checkpoint[]>;

  /**
   * 获取线程的检查点统计信息
   * @param threadId 线程ID
   * @returns 统计信息
   */
  getCheckpointStatistics(threadId: ID): Promise<{
    total: number;
    byType: Record<string, number>;
    latestAt?: Date;
    oldestAt?: Date;
  }>;
}