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
/**
 * 执行上下文接口
 */
export interface IExecutionContext {
  executionId: string;
  workflowId: string;
  data: Record<string, any>;
  workflowState?: any;
  executionHistory?: any[];
  metadata?: Record<string, any>;
  startTime?: Date;
  status?: string;
  getVariable: (path: string) => any;
  setVariable: (path: string, value: any) => void;
  getAllVariables: () => Record<string, any>;
  getAllMetadata: () => Record<string, any>;
  getInput: () => Record<string, any>;
  getExecutedNodes: () => string[];
  getNodeResult: (nodeId: string) => any;
  getElapsedTime: () => number;
  getWorkflow: () => any;
}
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
 * 基于类型转换器的Thread Repository
 * 
 * 直接使用类型转换器进行数据映射，消除传统的mapper层
 * 提供编译时类型安全和运行时验证
 */
@injectable()
export class ThreadConverterRepository extends BaseRepository<Thread, ThreadModel, ID> implements IThreadRepository {
  
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
        executionId: id.value,
        workflowId: (workflowId || ID.empty()).value,
        data: {},
        workflowState: {} as any,
        executionHistory: [],
        metadata: metadata || {},
        startTime: createdAt.getDate(),
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
        getAllMetadata: () => executionContext.metadata || {},
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

  /**
   * 根据会话ID查找线程
   */
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

  /**
   * 根据工作流ID查找线程
   */
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

  /**
   * 根据状态查找线程
   */
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

  /**
   * 根据优先级查找线程
   */
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

  /**
   * 根据会话ID和状态查找线程
   */
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

  /**
   * 查找活跃线程
   */
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

  /**
   * 查找待处理线程
   */
  async findPendingThreads(options?: any): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.pending(), options);
  }

  /**
   * 查找运行中的线程
   */
  async findRunningThreads(options?: any): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.running(), options);
  }

  /**
   * 查找暂停的线程
   */
  async findPausedThreads(options?: any): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.paused(), options);
  }

  /**
   * 查找终止状态的线程
   */
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

  /**
   * 查找失败的线程
   */
  async findFailedThreads(options?: any): Promise<Thread[]> {
    return this.findByStatus(ThreadStatus.failed(), options);
  }

  /**
   * 根据标题搜索线程
   */
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

  /**
   * 分页查询线程
   */
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

  /**
   * 统计会话中的线程数
   */
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

  /**
   * 统计工作流中的线程数
   */
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

  /**
   * 统计指定状态的线程数
   */
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

  /**
   * 统计指定优先级的线程数
   */
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

  /**
   * 检查会话是否有活跃线程
   */
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

  /**
   * 获取会话的最后一个活跃线程
   */
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

  /**
   * 获取最高优先级的待处理线程
   */
  async getHighestPriorityPendingThread(options?: any): Promise<Thread | null> {
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

  /**
   * 批量更新线程状态
   */
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

  /**
   * 批量删除线程
   */
  async batchDelete(threadIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);

    const result = await repository.delete({ id: In(threadIds.map(id => id.value)) });
    return result.affected || 0;
  }

  /**
   * 删除会话中的所有线程
   */
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

  /**
   * 获取线程执行统计信息
   */
  async getThreadExecutionStatsBySession(sessionId: ID): Promise<{
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

  // 实现ThreadRepository接口中缺失的方法

  /**
   * 查找会话的活跃线程
   */
  async findActiveThreadsForSession(sessionId: ID): Promise<Thread[]> {
    return this.findActiveThreads({ sessionId, includeDeleted: false });
  }

  /**
   * 查找需要清理的线程
   */
  async findThreadsNeedingCleanup(maxRunningHours: number): Promise<Thread[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxRunningHours);

    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.createdAt < :cutoffTime', { cutoffTime })
          .andWhere('thread.status IN (:...statuses)', { statuses: ['running', 'paused'] })
          .andWhere('thread.isDeleted = false');
      }
    });
  }

  /**
   * 查找高优先级的待执行线程
   */
  async findHighPriorityPendingThreads(minPriority: number): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.status = :status', { status: 'pending' })
          .andWhere('thread.priority >= :minPriority', { minPriority })
          .andWhere('thread.isDeleted = false')
          .orderBy('thread.priority', 'DESC')
          .addOrderBy('thread.createdAt', 'ASC');
      }
    });
  }

  /**
   * 查找会话的运行中线程
   */
  async findRunningThreadsForSession(sessionId: ID): Promise<Thread[]> {
    return this.findRunningThreads({ sessionId, includeDeleted: false });
  }

  /**
   * 获取下一个待执行的线程
   */
  async getNextPendingThread(sessionId?: ID): Promise<Thread | null> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb) => {
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

    return this.findOne(queryOptions);
  }

  /**
   * 获取最高优先级的待执行线程
   */

  /**
   * 检查会话是否有运行中线程
   */
  async hasRunningThreads(sessionId: ID): Promise<boolean> {
    const queryOptions: QueryOptions<ThreadModel> = {
      customConditions: (qb) => {
        qb.andWhere('thread.sessionId = :sessionId', { sessionId: sessionId.value })
          .andWhere('thread.status = :status', { status: 'running' })
          .andWhere('thread.isDeleted = false');
      }
    };

    const count = await this.count(queryOptions);
    return count > 0;
  }

  /**
   * 获取会话的最后活动线程
   */
  async getLastActiveThreadForSession(sessionId: ID): Promise<Thread | null> {
    return this.getLastActiveThreadBySessionId(sessionId);
  }

  /**
   * 批量更新线程状态
   */
  async batchUpdateThreadStatus(threadIds: ID[], status: ThreadStatus): Promise<number> {
    return this.batchUpdateStatus(threadIds, status);
  }

  /**
   * 批量取消会话的活跃线程
   */
  async batchCancelActiveThreadsForSession(sessionId: ID, reason?: string): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);

    const result = await repository.createQueryBuilder()
      .update(ThreadModel)
      .set({
        state: 'cancelled',
        updatedAt: new Date(),
        metadata: () => `JSON_SET(COALESCE(metadata, '{}'), '$.cancelReason', '${reason || 'Batch cancelled'}')`
      })
      .where('sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
      .andWhere('isDeleted = false')
      .execute();

    return result.affected || 0;
  }

  /**
   * 删除会话的所有线程
   */
  async deleteAllThreadsForSession(sessionId: ID): Promise<number> {
    return this.deleteAllBySessionId(sessionId);
  }

  /**
   * 查找工作流的线程
   */
  async findThreadsForWorkflow(workflowId: ID): Promise<Thread[]> {
    return this.findByWorkflowId(workflowId, { includeDeleted: false });
  }

  /**
   * 查找超时的线程
   */
  async findTimedOutThreads(timeoutHours: number): Promise<Thread[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - timeoutHours);

    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.createdAt < :cutoffTime', { cutoffTime })
          .andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
          .andWhere('thread.isDeleted = false');
      }
    });
  }

  /**
   * 查找可重试的失败线程
   */
  async findRetryableFailedThreads(maxRetryCount: number): Promise<Thread[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('thread.status = :status', { status: 'failed' })
          .andWhere('(thread.metadata->>"$.retryCount" IS NULL OR JSON_EXTRACT(thread.metadata, "$.retryCount") < :maxRetryCount)', { maxRetryCount })
          .andWhere('thread.isDeleted = false');
      }
    });
  }

  /**
   * 获取线程执行统计
   */
  async getThreadExecutionStats(threadId: ID): Promise<any> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(ThreadModel);

    const thread = await repository.findOne({
      where: { id: threadId.value }
    });

    if (!thread) {
      throw new RepositoryError(`线程不存在: ${threadId.value}`, 'NOT_FOUND');
    }

    return {
      threadId: thread.id,
      status: thread.state,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      executionTime: thread.updatedAt.getTime() - thread.createdAt.getTime(),
      metadata: thread.metadata
    };
  }
}

/**
 * 线程状态类型转换器
 * 将字符串状态转换为ThreadStatus值对象
 */
export interface ThreadStatusConverter {
  fromStorage: (value: string) => ThreadStatus;
  toStorage: (value: ThreadStatus) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: ThreadStatus) => boolean;
}

export const ThreadStatusConverter: ThreadStatusConverter = {
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
export interface ThreadPriorityConverter {
  fromStorage: (value: number) => ThreadPriority;
  toStorage: (value: ThreadPriority) => number;
  validateStorage: (value: number) => boolean;
  validateDomain: (value: ThreadPriority) => boolean;
}

export const ThreadPriorityConverter: ThreadPriorityConverter = {
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