import { injectable, inject } from 'inversify';
import { ThreadRepository as IThreadRepository, ThreadQueryOptions } from '../../../../domain/thread/repositories/thread-repository';
import { Thread } from '../../../../domain/thread/entities/thread';
import { ID } from '../../../../domain/common/value-objects/id';
import { ThreadStatus } from '../../../../domain/thread/value-objects/thread-status';
import { ThreadPriority } from '../../../../domain/thread/value-objects/thread-priority';
import { ConnectionManager } from '../../connections/connection-manager';
import { ThreadMapper } from './thread-mapper';
import { ThreadModel } from '../../models/thread.model';
import { QueryOptions, PaginatedResult } from '../../../../domain/common/repositories/repository';

@injectable()
export class ThreadRepository implements IThreadRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('ThreadMapper') private mapper: ThreadMapper
  ) {}

  async save(thread: Thread): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const model = this.mapper.toModel(thread);
    await repository.save(model);
  }

  async findById(id: ID): Promise<Thread | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const model = await repository.findOne({ where: { id: id.value } });
    if (!model) {
      return null;
    }
    
    return this.mapper.toEntity(model);
  }

  async findAll(): Promise<Thread[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const models = await repository.find();
    return models.map(model => this.mapper.toEntity(model));
  }

  async delete(id: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    await repository.delete(id.getValue());
  }

  async exists(id: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  async findBySessionId(sessionId: ID, options?: ThreadQueryOptions): Promise<Thread[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('thread.status = :status', { status: options.status });
    }

    if (options?.priority) {
      queryBuilder.andWhere('thread.priority = :priority', { priority: options.priority });
    }

    if (options?.title) {
      queryBuilder.andWhere('thread.title LIKE :title', { title: `%${options.title}%` });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`thread.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('thread.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByWorkflowId(workflowId: ID, options?: ThreadQueryOptions): Promise<Thread[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.workflowId = :workflowId', { workflowId: workflowId.value });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('thread.status = :status', { status: options.status });
    }

    if (options?.priority) {
      queryBuilder.andWhere('thread.priority = :priority', { priority: options.priority });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`thread.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('thread.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByStatus(status: ThreadStatus, options?: ThreadQueryOptions): Promise<Thread[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.status = :status', { status: status.getValue() });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.sessionId) {
      queryBuilder.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
    }

    if (options?.workflowId) {
      queryBuilder.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`thread.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('thread.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByPriority(priority: ThreadPriority, options?: ThreadQueryOptions): Promise<Thread[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.priority = :priority', { priority: priority.getNumericValue() });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.sessionId) {
      queryBuilder.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
    }

    if (options?.workflowId) {
      queryBuilder.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`thread.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('thread.priority', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findBySessionIdAndStatus(sessionId: ID, status: ThreadStatus, options?: ThreadQueryOptions): Promise<Thread[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('thread.status = :status', { status: status.getValue() });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`thread.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('thread.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findActiveThreads(options?: ThreadQueryOptions): Promise<Thread[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.sessionId) {
      queryBuilder.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
    }

    if (options?.workflowId) {
      queryBuilder.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`thread.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('thread.priority', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findPendingThreads(options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.pending(), options);
  }

  async findRunningThreads(options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.running(), options);
  }

  async findPausedThreads(options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.paused(), options);
  }

  async findTerminalThreads(options?: ThreadQueryOptions): Promise<Thread[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.status IN (:...statuses)', { statuses: ['completed', 'failed', 'cancelled'] });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.sessionId) {
      queryBuilder.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
    }

    if (options?.workflowId) {
      queryBuilder.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`thread.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('thread.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findFailedThreads(options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.failed(), options);
  }

  async searchByTitle(title: string, options?: ThreadQueryOptions): Promise<Thread[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.title LIKE :title', { title: `%${title}%` });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.sessionId) {
      queryBuilder.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
    }

    if (options?.workflowId) {
      queryBuilder.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`thread.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('thread.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findWithPagination(options: ThreadQueryOptions): Promise<PaginatedResult<Thread>> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread');

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.sessionId) {
      queryBuilder.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
    }

    if (options?.workflowId) {
      queryBuilder.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
    }

    if (options?.status) {
      queryBuilder.andWhere('thread.status = :status', { status: options.status });
    }

    if (options?.priority) {
      queryBuilder.andWhere('thread.priority = :priority', { priority: options.priority });
    }

    if (options?.title) {
      queryBuilder.andWhere('thread.title LIKE :title', { title: `%${options.title}%` });
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`thread.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('thread.createdAt', 'DESC');
    }

    const [models, total] = await queryBuilder
      .skip(options.offset || 0)
      .take(options.limit || 20)
      .getManyAndCount();

    return {
      items: models.map(model => this.mapper.toEntity(model)),
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
      pageSize: options.limit || 20,
      totalPages: Math.ceil(total / (options.limit || 20))
    };
  }

  async countBySessionId(sessionId: ID, options?: ThreadQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('thread.status = :status', { status: options.status });
    }

    if (options?.priority) {
      queryBuilder.andWhere('thread.priority = :priority', { priority: options.priority });
    }

    return await queryBuilder.getCount();
  }

  async countByWorkflowId(workflowId: ID, options?: ThreadQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.workflowId = :workflowId', { workflowId: workflowId.value });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('thread.status = :status', { status: options.status });
    }

    if (options?.priority) {
      queryBuilder.andWhere('thread.priority = :priority', { priority: options.priority });
    }

    return await queryBuilder.getCount();
  }

  async countByStatus(status: ThreadStatus, options?: ThreadQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.status = :status', { status: status.getValue() });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.sessionId) {
      queryBuilder.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
    }

    if (options?.workflowId) {
      queryBuilder.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
    }

    return await queryBuilder.getCount();
  }

  async countByPriority(priority: ThreadPriority, options?: ThreadQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.priority = :priority', { priority: priority.getNumericValue() });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('thread.isDeleted = false');
    }

    if (options?.sessionId) {
      queryBuilder.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
    }

    if (options?.workflowId) {
      queryBuilder.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
    }

    return await queryBuilder.getCount();
  }

  async hasActiveThreads(sessionId: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const count = await repository.createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
      .andWhere('thread.isDeleted = false')
      .getCount();

    return count > 0;
  }

  async getLastActiveThreadBySessionId(sessionId: ID): Promise<Thread | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const model = await repository.createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
      .andWhere('thread.isDeleted = false')
      .orderBy('thread.updatedAt', 'DESC')
      .getOne();

    return model ? this.mapper.toEntity(model) : null;
  }

  async getHighestPriorityPendingThread(options?: ThreadQueryOptions): Promise<Thread | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.status = :status', { status: 'pending' })
      .andWhere('thread.isDeleted = false')
      .orderBy('thread.priority', 'DESC')
      .addOrderBy('thread.createdAt', 'ASC');

    if (options?.sessionId) {
      queryBuilder.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
    }

    if (options?.workflowId) {
      queryBuilder.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    const model = await queryBuilder.getOne();
    return model ? this.mapper.toEntity(model) : null;
  }

  async batchUpdateStatus(threadIds: ID[], status: ThreadStatus): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const result = await repository.createQueryBuilder()
      .update(ThreadModel)
      .set({ 
        status: status.getValue(),
        updatedAt: new Date()
      })
      .where('id IN (:...threadIds)', { threadIds: threadIds.map(id => id.value) })
      .execute();

    return result.affected || 0;
  }

  async batchDelete(threadIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const result = await repository.delete(threadIds.map(id => id.getValue()));
    return result.affected || 0;
  }

  async deleteAllBySessionId(sessionId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const result = await repository.delete({ sessionId: sessionId.getValue() });
    return result.affected || 0;
  }

  async softDelete(threadId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    await repository.update({ id: threadId.getValue() }, {
      state: 'archived',
      updatedAt: new Date()
    });
  }

  async batchSoftDelete(threadIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const result = await repository.createQueryBuilder()
      .update(ThreadModel)
      .set({ 
        isDeleted: true,
        updatedAt: new Date()
      })
      .where('id IN (:...threadIds)', { threadIds: threadIds.map(id => id.value) })
      .execute();

    return result.affected || 0;
  }

  async restoreSoftDeleted(threadId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    await repository.update({ id: threadId.getValue() }, {
      state: 'active',
      updatedAt: new Date()
    });
  }

  async findSoftDeleted(options?: ThreadQueryOptions): Promise<Thread[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const queryBuilder = repository.createQueryBuilder('thread')
      .where('thread.isDeleted = true');

    if (options?.sessionId) {
      queryBuilder.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
    }

    if (options?.workflowId) {
      queryBuilder.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
    }

    if (options?.status) {
      queryBuilder.andWhere('thread.status = :status', { status: options.status });
    }

    if (options?.priority) {
      queryBuilder.andWhere('thread.priority = :priority', { priority: options.priority });
    }

    if (options?.title) {
      queryBuilder.andWhere('thread.title LIKE :title', { title: `%${options.title}%` });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`thread.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('thread.deletedAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async getThreadExecutionStats(sessionId: ID): Promise<{
    total: number;
    pending: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);
    
    const stats = await repository.createQueryBuilder('thread')
      .select('thread.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('thread.isDeleted = false')
      .groupBy('thread.status')
      .getRawMany();

    const result = {
      total: 0,
      pending: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count);
      result.total += count;
      
      switch (stat.status) {
        case 'pending':
          result.pending = count;
          break;
        case 'running':
          result.running = count;
          break;
        case 'paused':
          result.paused = count;
          break;
        case 'completed':
          result.completed = count;
          break;
        case 'failed':
          result.failed = count;
          break;
        case 'cancelled':
          result.cancelled = count;
          break;
      }
    });

    return result;
  }
}