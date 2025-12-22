import { injectable, inject } from 'inversify';
import { ThreadRepository as IThreadRepository, ThreadQueryOptions } from '../../../../domain/threads/repositories/thread-repository';
import { Thread } from '../../../../domain/threads/entities/thread';
import { ID } from '../../../../domain/common/value-objects/id';
import { ThreadStatus } from '../../../../domain/threads/value-objects/thread-status';
import { ThreadPriority } from '../../../../domain/threads/value-objects/thread-priority';
import { ThreadModel } from '../../models/thread.model';
import { IQueryOptions, PaginatedResult } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { In } from 'typeorm';
import { BaseRepository, QueryOptions } from '../../base/base-repository';
import { QueryOptionsBuilder } from '../../base/query-options-builder';
import { ConnectionManager } from '../../connections/connection-manager';
import {
  IdConverter,
  OptionalIdConverter,
  TimestampConverter,
  VersionConverter,
  OptionalStringConverter,
  NumberConverter,
  BooleanConverter
} from '../../base/type-converter-base';

/**
 * 线程状态类型转换器
 * 将字符串状态转换为ThreadStatus值对象
 */
interface ThreadStatusConverter {
  fromStorage: (value: string) => ThreadStatus;
  toStorage: (value: ThreadStatus) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: ThreadStatus) => boolean;
}

const ThreadStatusConverter: ThreadStatusConverter = {
  fromStorage: (value: string) => {
    return ThreadStatus.fromString(value);
  },
  toStorage: (value: ThreadStatus) => value.getValue(),
  validateStorage: (value: string) => {
    const validStates = ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'];
    return typeof value === 'string' && validStates.includes(value);
  },
  validateDomain: (value: ThreadStatus) => {
    return value instanceof ThreadStatus;
  }
};

/**
 * 线程优先级类型转换器
 * 将数字优先级转换为ThreadPriority值对象
 */
interface ThreadPriorityConverter {
  fromStorage: (value: number) => ThreadPriority;
  toStorage: (value: ThreadPriority) => number;
  validateStorage: (value: number) => boolean;
  validateDomain: (value: ThreadPriority) => boolean;
}

const ThreadPriorityConverter: ThreadPriorityConverter = {
  fromStorage: (value: number) => {
    return ThreadPriority.fromNumber(value);
  },
  toStorage: (value: ThreadPriority) => value.getNumericValue(),
  validateStorage: (value: number) => {
    const validPriorities = [1, 5, 10, 20]; // LOW, NORMAL, HIGH, URGENT
    return typeof value === 'number' && validPriorities.includes(value);
  },
  validateDomain: (value: ThreadPriority) => {
    return value instanceof ThreadPriority;
  }
};

@injectable()
export class ThreadRepository extends BaseRepository<Thread, ThreadModel, ID> implements IThreadRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
    
    // 配置ThreadRepository的软删除行为
    this.configureSoftDelete({
      fieldName: 'isDeleted',
      deletedAtField: 'deletedAt',
      stateField: 'state',
      deletedValue: 'archived',
      activeValue: 'active'
    });
  }

  protected override getModelClass(): new () => ThreadModel {
    return ThreadModel;
  }

  /**
   * 重写toEntity方法，使用类型转换器
   */
  protected override toEntity(model: ThreadModel): Thread {
    try {
      // 使用类型转换器进行编译时类型安全的转换
      const threadData = {
        id: IdConverter.fromStorage(model.id),
        sessionId: IdConverter.fromStorage(model.sessionId),
        workflowId: model.workflowId ? OptionalIdConverter.fromStorage(model.workflowId) : undefined,
        status: ThreadStatusConverter.fromStorage(model.state),
        priority: ThreadPriorityConverter.fromStorage(parseInt(model.priority)),
        title: model.name ? OptionalStringConverter.fromStorage(model.name) : undefined,
        description: model.description ? OptionalStringConverter.fromStorage(model.description) : undefined,
        metadata: model.context || {},
        createdAt: TimestampConverter.fromStorage(model.createdAt),
        updatedAt: TimestampConverter.fromStorage(model.updatedAt),
        version: VersionConverter.fromStorage(model.version),
        isDeleted: model.metadata?.isDeleted ? BooleanConverter.fromStorage(model.metadata.isDeleted as boolean) : false
      };

      // 创建Thread实体
      return Thread.fromProps(threadData);
    } catch (error) {
      throw new RepositoryError(
        `Thread模型转换失败: ${error instanceof Error ? error.message : String(error)}`,
        'MAPPING_ERROR',
        { modelId: model.id, operation: 'toEntity' }
      );
    }
  }

  /**
   * 重写toModel方法，使用类型转换器
   */
  protected override toModel(entity: Thread): ThreadModel {
    try {
      const model = new ThreadModel();
      
      // 使用类型转换器进行编译时类型安全的转换
      model.id = IdConverter.toStorage(entity.threadId);
      model.sessionId = IdConverter.toStorage(entity.sessionId);
      model.workflowId = entity.workflowId ? OptionalIdConverter.toStorage(entity.workflowId) : undefined;
      model.name = entity.title ? OptionalStringConverter.toStorage(entity.title) || '' : '';
      model.description = entity.description ? OptionalStringConverter.toStorage(entity.description) || '' : '';
      model.state = ThreadStatusConverter.toStorage(entity.status);
      model.priority = ThreadPriorityConverter.toStorage(entity.priority).toString();
      model.context = entity.metadata;
      model.version = VersionConverter.toStorage(entity.version);
      model.createdAt = TimestampConverter.toStorage(entity.createdAt);
      model.updatedAt = TimestampConverter.toStorage(entity.updatedAt);
      
      // 设置元数据
      model.metadata = {
        ...entity.metadata,
        isDeleted: BooleanConverter.toStorage(entity.isDeleted())
      };
      
      return model;
    } catch (error) {
      throw new RepositoryError(
        `Thread实体转换失败: ${error instanceof Error ? error.message : String(error)}`,
        'MAPPING_ERROR',
        { entityId: entity.threadId.value, operation: 'toModel' }
      );
    }
  }

  // 基础 CRUD 方法现在由 BaseRepository 提供，无需重复实现

  async findBySessionId(sessionId: ID, options?: ThreadQueryOptions): Promise<Thread[]> {
    const builder = this.createQueryOptionsBuilder()
      .equals('sessionId', sessionId.value)
      .sortBy(options?.sortBy || 'createdAt')
      .sortOrder(options?.sortOrder || 'desc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.status) {
      builder.equals('state', options.status);
    }

    if (options?.priority) {
      builder.equals('priority', options.priority.toString());
    }

    if (options?.title) {
      builder.like('name', `%${options.title}%`);
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    return this.findWithBuilder(builder);
  }

  async findByWorkflowId(workflowId: ID, options?: ThreadQueryOptions): Promise<Thread[]> {
    const builder = this.createQueryOptionsBuilder()
      .equals('workflowId', workflowId.value)
      .sortBy(options?.sortBy || 'createdAt')
      .sortOrder(options?.sortOrder || 'desc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.status) {
      builder.equals('state', options.status);
    }

    if (options?.priority) {
      builder.equals('priority', options.priority.toString());
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    return this.findWithBuilder(builder);
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
    return models.map(model => this.toEntity(model));
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

  /**
    * 重写软删除查找方法，添加Thread特有的查询条件
    */
  override async findSoftDeleted(options?: ThreadQueryOptions): Promise<Thread[]> {
    return this.find({
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
    });
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