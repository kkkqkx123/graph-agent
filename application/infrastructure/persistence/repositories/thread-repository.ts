import { injectable, inject } from 'inversify';
import { IThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { Thread } from '../../../domain/threads/entities/thread';
import { ID } from '../../../domain/common/value-objects/id';
import { ThreadStatus, ThreadStatusValue } from '../../../domain/threads/value-objects/thread-status';
import { ThreadModel } from '../models/thread.model';
import { In } from 'typeorm';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';
import { TYPES } from '../../../di/service-keys';
import { ThreadMapper } from '../mappers/thread-mapper';
import { EntityNotFoundError } from '../../../domain/common/exceptions';

@injectable()
export class ThreadRepository
  extends BaseRepository<Thread, ThreadModel, ID>
  implements IThreadRepository {
  private mapper: ThreadMapper;

  constructor(@inject(TYPES.ConnectionManager) connectionManager: ConnectionManager) {
    super(connectionManager);
    this.mapper = new ThreadMapper();
  }

  protected getModelClass(): new () => ThreadModel {
    return ThreadModel;
  }

  /**
   * 使用Mapper将数据库模型转换为领域实体
   */
  protected override toDomain(model: ThreadModel): Thread {
    return this.mapper.toDomain(model);
  }

  /**
   * 使用Mapper将领域实体转换为数据库模型
   */
  protected override toModel(entity: Thread): ThreadModel {
    return this.mapper.toModel(entity);
  }

  /**
   * 查找会话的活跃线程
   */
  async findActiveThreadsForSession(sessionId: ID): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.updatedAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找会话的线程
   */
  async findThreadsForSession(sessionId: ID): Promise<Thread[]> {
    return this.find({
      filters: { sessionId: sessionId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找工作流的线程
   */
  async findThreadsForWorkflow(workflowId: ID): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.workflowId = :workflowId', { workflowId: workflowId.value })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.createdAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找指定状态的线程
   */
  async findByStatus(status: ThreadStatus): Promise<Thread[]> {
    return this.find({
      filters: { state: status.getValue() },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找失败的线程
   */
  async findFailedThreads(sessionId?: ID): Promise<Thread[]> {
    const repository = await this.getRepository();
    let queryBuilder = repository
      .createQueryBuilder('thread')
      .where('thread.status = :status', { status: 'failed' })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false });

    if (sessionId) {
      queryBuilder = queryBuilder.andWhere('thread.sessionId = :sessionId', {
        sessionId: sessionId.value,
      });
    }

    const models = await queryBuilder.orderBy('thread.updatedAt', 'DESC').getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找运行中的线程
   */
  async findRunningThreads(): Promise<Thread[]> {
    return this.find({
      filters: { state: 'running' },
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找待处理的线程
   */
  async findPendingThreads(): Promise<Thread[]> {
    return this.find({
      filters: { state: 'pending' },
      sortBy: 'priority',
      sortOrder: 'desc',
    });
  }

  /**
   * 获取下一个待处理线程
   */
  async getNextPendingThread(sessionId?: ID): Promise<Thread | null> {
    const repository = await this.getRepository();
    let queryBuilder = repository
      .createQueryBuilder('thread')
      .where('thread.status = :status', { status: 'pending' })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.priority', 'DESC')
      .addOrderBy('thread.createdAt', 'ASC')
      .take(1);

    if (sessionId) {
      queryBuilder = queryBuilder.andWhere('thread.sessionId = :sessionId', {
        sessionId: sessionId.value,
      });
    }

    const model = await queryBuilder.getOne();
    return model ? this.toDomain(model) : null;
  }

  /**
   * 获取最高优先级的待处理线程
   */
  async getHighestPriorityPendingThread(sessionId?: ID): Promise<Thread | null> {
    return this.getNextPendingThread(sessionId);
  }

  /**
   * 检查会话是否有活跃线程
   */
  async hasActiveThreads(sessionId: ID): Promise<boolean> {
    const threads = await this.findActiveThreadsForSession(sessionId);
    return threads.length > 0;
  }

  /**
   * 检查会话是否有运行中的线程
   */
  async hasRunningThreads(sessionId: ID): Promise<boolean> {
    const repository = await this.getRepository();
    const count = await repository
      .createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('thread.status = :status', { status: 'running' })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .getCount();
    return count > 0;
  }

  /**
   * 获取会话的最后活跃线程
   */
  async getLastActiveThreadForSession(sessionId: ID): Promise<Thread | null> {
    const threads = await this.findActiveThreadsForSession(sessionId);
    return threads.length > 0 ? threads[0]! : null;
  }

  /**
   * 批量更新线程状态
   */
  async batchUpdateThreadStatus(threadIds: ID[], status: ThreadStatus): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.update(
      { id: In(threadIds.map(id => id.value)) },
      { state: status.getValue(), updatedAt: new Date() }
    );
    return result.affected || 0;
  }

  /**
   * 批量删除线程
   */
  async batchDelete(threadIds: ID[]): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ id: In(threadIds.map(id => id.value)) });
    return result.affected || 0;
  }

  /**
   * 删除会话的所有线程
   */
  async deleteAllThreadsForSession(sessionId: ID): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ sessionId: sessionId.value });
    return result.affected || 0;
  }

  /**
   * 取消会话的所有活跃线程
   */
  async batchCancelActiveThreadsForSession(sessionId: ID): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.update(
      { sessionId: sessionId.value, state: In([ThreadStatusValue.PENDING, ThreadStatusValue.RUNNING, ThreadStatusValue.PAUSED]) },
      { state: ThreadStatusValue.CANCELLED, updatedAt: new Date() }
    );
    return result.affected || 0;
  }

  /**
   * 查找需要清理的线程
   */
  async findThreadsNeedingCleanup(maxRunningHours: number): Promise<Thread[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxRunningHours);

    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.status IN (:...statuses)', { statuses: ['running', 'paused'] })
      .andWhere('thread.updatedAt < :cutoffTime', { cutoffTime })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.updatedAt', 'ASC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找高优先级的待执行线程
   */
  async findHighPriorityPendingThreads(minPriority: number): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.status = :status', { status: 'pending' })
      .andWhere('CAST(thread.priority AS INTEGER) >= :minPriority', { minPriority })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.priority', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找会话的运行中线程
   */
  async findRunningThreadsForSession(sessionId: ID): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('thread.status = :status', { status: 'running' })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.updatedAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找超时的线程
   */
  async findTimedOutThreads(timeoutHours: number): Promise<Thread[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - timeoutHours);

    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.status IN (:...statuses)', { statuses: ['running', 'paused'] })
      .andWhere('thread.createdAt < :cutoffTime', { cutoffTime })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.createdAt', 'ASC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找可重试的失败线程
   */
  async findRetryableFailedThreads(maxRetryCount: number): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.status = :status', { status: 'failed' })
      .andWhere("CAST(thread.metadata->>'retryCount' AS INTEGER) < :maxRetryCount", {
        maxRetryCount,
      })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.updatedAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 获取线程执行统计
   */
  async getThreadExecutionStats(threadId: ID): Promise<any> {
    const thread = await this.findById(threadId);
    if (!thread) {
      throw new EntityNotFoundError('Thread', threadId.value);
    }
    return {
      threadId: threadId.value,
      status: thread.status,
      createdAt: thread.createdAt.toDate(),
      updatedAt: thread.updatedAt.toDate(),
    };
  }
}
