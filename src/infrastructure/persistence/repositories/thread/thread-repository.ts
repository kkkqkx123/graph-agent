import { injectable, inject } from 'inversify';
import { ThreadRepository as IThreadRepository, ThreadQueryOptions } from '../../../../domain/threads/repositories/thread-repository';
import { Thread } from '../../../../domain/threads/entities/thread';
import { ID } from '../../../../domain/common/value-objects/id';
import { ThreadStatus } from '../../../../domain/threads/value-objects/thread-status';
import { ThreadPriority } from '../../../../domain/threads/value-objects/thread-priority';
import { ConnectionManager } from '../../connections/connection-manager';
import { ThreadMapper } from './thread-mapper';
import { ThreadModel } from '../../models/thread.model';
import { IQueryOptions, PaginatedResult } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { In } from 'typeorm';
import { BaseRepository, QueryOptions } from '../../base/base-repository';

@injectable()
export class ThreadRepository extends BaseRepository<Thread, ThreadModel, ID> implements IThreadRepository {
  protected override mapper: ThreadMapper;

  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager,
    @inject('ThreadMapper') mapper: ThreadMapper
  ) {
    super(connectionManager);
    this.mapper = mapper;
  }

  protected override getModelClass(): new () => ThreadModel {
    return ThreadModel;
  }

  // 基础 CRUD 方法现在由 BaseRepository 提供，无需重复实现

  async findBySessionId(sessionId: ID, options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.status) {
          qb.andWhere('thread.status = :status', { status: options.status });
        }

        if (options?.priority) {
          qb.andWhere('thread.priority = :priority', { priority: options.priority });
        }

        if (options?.title) {
          qb.andWhere('thread.title LIKE :title', { title: `%${options.title}%` });
        }
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  async findByWorkflowId(workflowId: ID, options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.workflowId = :workflowId', { workflowId: workflowId.value });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.status) {
          qb.andWhere('thread.status = :status', { status: options.status });
        }

        if (options?.priority) {
          qb.andWhere('thread.priority = :priority', { priority: options.priority });
        }
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  async findByStatus(status: ThreadStatus, options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.status = :status', { status: status.getValue() });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
        }

        if (options?.workflowId) {
          qb.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
        }
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  async findByPriority(priority: ThreadPriority, options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.priority = :priority', { priority: priority.getNumericValue() });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
        }

        if (options?.workflowId) {
          qb.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
        }
      },
      sortBy: options?.sortBy || 'priority',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
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

    if (options?.sortBy) {
      queryBuilder.orderBy(`thread.${options.sortBy}`, (options.sortOrder || 'ASC').toUpperCase() as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy('thread.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findActiveThreads(options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
        }

        if (options?.workflowId) {
          qb.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
        }
      },
      sortBy: options?.sortBy || 'priority',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
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
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.status IN (:...statuses)', { statuses: ['completed', 'failed', 'cancelled'] });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
        }

        if (options?.workflowId) {
          qb.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
        }
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  async findFailedThreads(options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.failed(), options);
  }

  async searchByTitle(title: string, options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.title LIKE :title', { title: `%${title}%` });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
        }

        if (options?.workflowId) {
          qb.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
        }
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  override async findWithPagination(options: ThreadQueryOptions): Promise<PaginatedResult<Thread>> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb: any) => {
        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
        }

        if (options?.workflowId) {
          qb.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
        }

        if (options?.status) {
          qb.andWhere('thread.status = :status', { status: options.status });
        }

        if (options?.priority) {
          qb.andWhere('thread.priority = :priority', { priority: options.priority });
        }

        if (options?.title) {
          qb.andWhere('thread.title LIKE :title', { title: `%${options.title}%` });
        }
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit || 20,
      offset: options?.offset || 0
    };

    return super.findWithPagination(queryOptions);
  }

  async countBySessionId(sessionId: ID, options?: ThreadQueryOptions): Promise<number> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.status) {
          qb.andWhere('thread.status = :status', { status: options.status });
        }

        if (options?.priority) {
          qb.andWhere('thread.priority = :priority', { priority: options.priority });
        }
      }
    };

    return this.count(queryOptions);
  }

  async countByWorkflowId(workflowId: ID, options?: ThreadQueryOptions): Promise<number> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('thread.workflowId = :workflowId', { workflowId: workflowId.value });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.status) {
          qb.andWhere('thread.status = :status', { status: options.status });
        }

        if (options?.priority) {
          qb.andWhere('thread.priority = :priority', { priority: options.priority });
        }
      }
    };

    return this.count(queryOptions);
  }

  async countByStatus(status: ThreadStatus, options?: ThreadQueryOptions): Promise<number> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('thread.status = :status', { status: status.getValue() });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
        }

        if (options?.workflowId) {
          qb.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
        }
      }
    };

    return this.count(queryOptions);
  }

  async countByPriority(priority: ThreadPriority, options?: ThreadQueryOptions): Promise<number> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('thread.priority = :priority', { priority: priority.getNumericValue() });

        if (options?.includeDeleted === false) {
          qb.andWhere('thread.isDeleted = false');
        }

        if (options?.sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
        }

        if (options?.workflowId) {
          qb.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
        }
      }
    };

    return this.count(queryOptions);
  }

  async hasActiveThreads(sessionId: ID): Promise<boolean> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value })
          .andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
          .andWhere('thread.isDeleted = false');
      }
    };

    const count = await this.count(queryOptions);
    return count > 0;
  }

  async getLastActiveThreadBySessionId(sessionId: ID): Promise<Thread | null> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value })
          .andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
          .andWhere('thread.isDeleted = false')
          .orderBy('thread.updatedAt', 'DESC');
      }
    };

    return this.findOne(queryOptions);
  }

  async getHighestPriorityPendingThread(options?: ThreadQueryOptions): Promise<Thread | null> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb) => {
        qb.andWhere('thread.status = :status', { status: 'pending' })
          .andWhere('thread.isDeleted = false')
          .orderBy('thread.priority', 'DESC')
          .addOrderBy('thread.createdAt', 'ASC');

        if (options?.sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
        }

        if (options?.workflowId) {
          qb.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
        }
      },
      limit: options?.limit || 1
    };

    return this.findOne(queryOptions);
  }

  async batchUpdateStatus(threadIds: ID[], status: ThreadStatus): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);

    const result = await repository.createQueryBuilder()
      .update(ThreadModel)
      .set({
        state: status.getValue(),
        updatedAt: new Date()
      })
      .where('id IN (:...threadIds)', { threadIds: threadIds.map(id => id.value) })
      .execute();

    return result.affected || 0;
  }

  async batchDelete(threadIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);

    const result = await repository.delete({ id: In(threadIds.map(id => id.value)) });
    return result.affected || 0;
  }

  async deleteAllBySessionId(sessionId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);

    const result = await repository.delete({ sessionId: sessionId.value });
    return result.affected || 0;
  }

  async softDelete(threadId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);

    await repository.update({ id: threadId.value }, {
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
        state: 'archived',
        updatedAt: new Date()
      })
      .where('id IN (:...threadIds)', { threadIds: threadIds.map(id => id.value) })
      .execute();

    return result.affected || 0;
  }

  async restoreSoftDeleted(threadId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);

    await repository.update({ id: threadId.value }, {
      state: 'active',
      updatedAt: new Date()
    });
  }

  async findSoftDeleted(options?: ThreadQueryOptions): Promise<Thread[]> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb) => {
        qb.andWhere('thread.isDeleted = true');

        if (options?.sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: options.sessionId });
        }

        if (options?.workflowId) {
          qb.andWhere('thread.workflowId = :workflowId', { workflowId: options.workflowId });
        }

        if (options?.status) {
          qb.andWhere('thread.status = :status', { status: options.status });
        }

        if (options?.priority) {
          qb.andWhere('thread.priority = :priority', { priority: options.priority });
        }

        if (options?.title) {
          qb.andWhere('thread.title LIKE :title', { title: `%${options.title}%` });
        }
      },
      sortBy: options?.sortBy || 'deletedAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    };

    return this.find(queryOptions);
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