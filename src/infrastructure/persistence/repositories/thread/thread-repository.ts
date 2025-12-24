import { injectable, inject } from 'inversify';
import { ThreadRepository as IThreadRepository } from '../../../../domain/threads/repositories/thread-repository';
import { Thread } from '../../../../domain/threads/entities/thread';
import { ID } from '../../../../domain/common/value-objects/id';
import { ThreadStatus } from '../../../../domain/threads/value-objects/thread-status';
import { ThreadPriority } from '../../../../domain/threads/value-objects/thread-priority';
import { ThreadDefinition } from '../../../../domain/threads/value-objects/thread-definition';
import { ThreadExecution } from '../../../../domain/threads/value-objects/thread-execution';
import { ThreadModel } from '../../models/thread.model';
import { IQueryOptions, PaginatedResult } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { In } from 'typeorm';
import { BaseRepository, QueryOptions } from '../../base/base-repository';
import { QueryOptionsBuilder } from '../../base/query-options-builder';
import { ConnectionManager } from '../../connections/connection-manager';
import { IExecutionContext } from '../../../../domain/workflow/execution/execution-context.interface';
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
      const id = IdConverter.fromStorage(model.id);
      const sessionId = IdConverter.fromStorage(model.sessionId);
      const workflowId = model.workflowId ? OptionalIdConverter.fromStorage(model.workflowId) : undefined;
      const status = ThreadStatusConverter.fromStorage(model.state);
      const priority = ThreadPriorityConverter.fromStorage(parseInt(model.priority));
      const title = model.name ? OptionalStringConverter.fromStorage(model.name) : undefined;
      const description = model.description ? OptionalStringConverter.fromStorage(model.description) : undefined;
      const metadata = model.context || {};
      const createdAt = TimestampConverter.fromStorage(model.createdAt);
      const updatedAt = TimestampConverter.fromStorage(model.updatedAt);
      const version = VersionConverter.fromStorage(model.version);
      const isDeleted = model.metadata?.isDeleted ? BooleanConverter.fromStorage(model.metadata.isDeleted as boolean) : false;

      // 创建必需的值对象
      const definition = ThreadDefinition.create(
        id,
        sessionId,
        workflowId || ID.empty(),
        priority,
        title,
        description,
        metadata
      );

      const execution = ThreadExecution.create(id);

      // 创建执行上下文
      const executionContext: IExecutionContext = {
        executionId: id,
        workflowId: workflowId || ID.empty(),
        data: {},
        workflowState: {} as any,
        executionHistory: [],
        metadata: metadata || {},
        startTime: createdAt,
        status: 'pending',
        getVariable: (path: string) => {
          const keys = path.split('.');
          let value: any = executionContext.data;
          for (const key of keys) {
            value = value?.[key];
          }
          return value;
        },
        setVariable: (path: string, value: any) => {
          const keys = path.split('.');
          let current: any = executionContext.data;
          for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (key && current[key] === undefined) {
              current[key] = {};
            }
            if (key) {
              current = current[key];
            }
          }
          const lastKey = keys[keys.length - 1];
          if (lastKey) {
            current[lastKey] = value;
          }
        },
        getAllVariables: () => executionContext.data,
        getAllMetadata: () => executionContext.metadata,
        getInput: () => executionContext.data,
        getExecutedNodes: () => [],
        getNodeResult: (nodeId: string) => undefined,
        getElapsedTime: () => 0,
        getWorkflow: () => undefined
      };

      const threadData = {
        id,
        sessionId,
        workflowId: workflowId || ID.empty(),
        status,
        priority,
        title,
        description,
        metadata,
        definition,
        execution,
        executionContext,
        createdAt,
        updatedAt,
        version,
        isDeleted
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

  async findBySessionId(sessionId: ID, options?: any): Promise<Thread[]> {
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

  async findByWorkflowId(workflowId: ID, options?: any): Promise<Thread[]> {
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

  async findByStatus(status: ThreadStatus, options?: any): Promise<Thread[]> {
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

  async findByPriority(priority: ThreadPriority, options?: any): Promise<Thread[]> {
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

  async findBySessionIdAndStatus(sessionId: ID, status: ThreadStatus, options?: any): Promise<Thread[]> {
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

  async findActiveThreads(options?: any): Promise<Thread[]> {
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

  async findPendingThreads(options?: any): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.pending(), options);
  }

  async findRunningThreads(options?: any): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.running(), options);
  }

  async findPausedThreads(options?: any): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.paused(), options);
  }

  async findTerminalThreads(options?: any): Promise<Thread[]> {
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


  async searchByTitle(title: string, options?: any): Promise<Thread[]> {
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

  override async findWithPagination(options: any): Promise<PaginatedResult<Thread>> {
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

  async countBySessionId(sessionId: ID, options?: any): Promise<number> {
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

  async countByWorkflowId(workflowId: ID, options?: any): Promise<number> {
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

  async countByStatus(status: ThreadStatus, options?: any): Promise<number> {
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

  async countByPriority(priority: ThreadPriority, options?: any): Promise<number> {
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
  override async findSoftDeleted(options?: any): Promise<Thread[]> {
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

  // 实现ThreadRepository接口中定义的业务导向方法

  async findActiveThreadsForSession(sessionId: ID): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value })
          .andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
          .andWhere('thread.isDeleted = false');
      },
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
  }

  async findThreadsNeedingCleanup(maxRunningHours: number): Promise<Thread[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxRunningHours);

    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.status IN (:...statuses)', { statuses: ['running', 'paused'] })
          .andWhere('thread.updatedAt < :cutoffTime', { cutoffTime })
          .andWhere('thread.isDeleted = false');
      },
      sortBy: 'updatedAt',
      sortOrder: 'asc'
    });
  }

  async findHighPriorityPendingThreads(minPriority: number): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.status = :status', { status: 'pending' })
          .andWhere('thread.priority >= :minPriority', { minPriority })
          .andWhere('thread.isDeleted = false');
      },
      sortBy: 'priority',
      sortOrder: 'desc'
    });
  }

  async findRunningThreadsForSession(sessionId: ID): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value })
          .andWhere('thread.status = :status', { status: 'running' })
          .andWhere('thread.isDeleted = false');
      },
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
  }


  async getNextPendingThread(sessionId?: ID): Promise<Thread | null> {
    const conditions: any = {
      customConditions: (qb: any) => {
        qb.andWhere('thread.status = :status', { status: 'pending' })
          .andWhere('thread.isDeleted = false')
          .orderBy('thread.priority', 'DESC')
          .addOrderBy('thread.createdAt', 'ASC');
      },
      limit: 1
    };

    if (sessionId) {
      conditions.customConditions = (qb: any) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value })
          .andWhere('thread.status = :status', { status: 'pending' })
          .andWhere('thread.isDeleted = false')
          .orderBy('thread.priority', 'DESC')
          .addOrderBy('thread.createdAt', 'ASC');
      };
    }

    return this.findOne(conditions);
  }



  async hasRunningThreads(sessionId: ID): Promise<boolean> {
    const count = await this.count({
      customConditions: (qb: any) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value })
          .andWhere('thread.status = :status', { status: 'running' })
          .andWhere('thread.isDeleted = false');
      }
    });
    return count > 0;
  }

  async getLastActiveThreadForSession(sessionId: ID): Promise<Thread | null> {
    return this.findOne({
      customConditions: (qb: any) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value })
          .andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
          .andWhere('thread.isDeleted = false');
      },
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
  }

  async batchUpdateThreadStatus(threadIds: ID[], status: ThreadStatus): Promise<number> {
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

  async batchCancelActiveThreadsForSession(sessionId: ID, reason?: string): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);

    const result = await repository.createQueryBuilder()
      .update(ThreadModel)
      .set({
        state: 'cancelled',
        updatedAt: new Date()
      })
      .where('sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
      .andWhere('isDeleted = false')
      .execute();

    return result.affected || 0;
  }

  async deleteAllThreadsForSession(sessionId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);

    const result = await repository.delete({ sessionId: sessionId.value });
    return result.affected || 0;
  }

  async findThreadsForWorkflow(workflowId: ID): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.workflowId = :workflowId', { workflowId: workflowId.value })
          .andWhere('thread.isDeleted = false');
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  async findTimedOutThreads(timeoutHours: number): Promise<Thread[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - timeoutHours);

    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.status IN (:...statuses)', { statuses: ['running', 'paused'] })
          .andWhere('thread.createdAt < :cutoffTime', { cutoffTime })
          .andWhere('thread.isDeleted = false');
      },
      sortBy: 'createdAt',
      sortOrder: 'asc'
    });
  }

  async findRetryableFailedThreads(maxRetryCount: number): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.status = :status', { status: 'failed' })
          .andWhere('thread.retryCount < :maxRetryCount', { maxRetryCount })
          .andWhere('thread.isDeleted = false');
      },
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
  }

  // 添加缺失的接口方法实现

  async findFailedThreads(sessionId?: ID): Promise<Thread[]> {
    const conditions: any = {
      customConditions: (qb: any) => {
        qb.andWhere('thread.status = :status', { status: 'failed' })
          .andWhere('thread.isDeleted = false');
      },
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    };

    if (sessionId) {
      conditions.customConditions = (qb: any) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value })
          .andWhere('thread.status = :status', { status: 'failed' })
          .andWhere('thread.isDeleted = false');
      };
    }

    return this.find(conditions);
  }

  async getHighestPriorityPendingThread(sessionId?: ID): Promise<Thread | null> {
    const conditions: any = {
      customConditions: (qb: any) => {
        qb.andWhere('thread.status = :status', { status: 'pending' })
          .andWhere('thread.isDeleted = false')
          .orderBy('thread.priority', 'DESC')
          .addOrderBy('thread.createdAt', 'ASC');

        if (sessionId) {
          qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value });
        }
      },
      limit: 1
    };

    return this.findOne(conditions);
  }

  async hasActiveThreads(sessionId: ID): Promise<boolean> {
    const count = await this.count({
      customConditions: (qb: any) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value })
          .andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
          .andWhere('thread.isDeleted = false');
      }
    });
    return count > 0;
  }
}